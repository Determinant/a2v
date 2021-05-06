#!/usr/bin/env -S npx ts-node
import Docker = require('dockerode');
import SSHPromise = require('ssh2-promise');
const sshModem: any = require('docker-modem/lib/ssh');
import util from "util";
import dns from 'dns';
import fs from 'fs';
import tar from 'tar';
import { createSchema as S, TsjsonParser, Validated } from "ts-json-validator";
import shell from 'shelljs';
import stripJsonComments from 'strip-json-comments';
const dnsLookup = util.promisify(dns.lookup);

const ValidatorsSchema = S({
    type: "object",
    properties: {
        release: S({ type: "string", title: "release (tag/branch) of avalanchego" }),
        workDir: S({ type: "string", title: "working directory (databases and logs) on the host system used by validators" }),
        baseStakingPort: S({ type: "number", title: "base port number for staking/voting" }),
        baseHttpPort: S({ type: "number", title: "base port number for JSON/RPC" }),
        hosts: S({
            type: "object",
            additionalProperties: S({
                type: "object",
                properties: {
                    host: S({ type: "string" }),
                    username: S({ type: "string" }),
                    privateKeyFile: S({ type: "string" }),
                    validators: S({ type: "array", items: S({ type: "string" }) }),
                    ncpu: S({ type: "number" }),
                    cpuPerNode: S({ type: "number" }),
                    cpuStride: S({ type: "number" }),
                },
                required: ["host", "username", "privateKeyFile", "validators", "ncpu", "cpuPerNode", "cpuStride"]
            })
        }),
    },
    required: ["release", "workDir", "baseStakingPort", "baseHttpPort", "hosts"],
});

async function getDocker(config: Validated<typeof ValidatorsSchema>, id: string) {
    const h = config.hosts[id];
    const host = (await dnsLookup(h.host)).address;
    console.log(`connecting to ${id} (${h.host}: ${host})...`);
    const sshConfig = {
        host: host,
        username: h.username,
        privateKey: fs.readFileSync(h.privateKeyFile)
    };
    const docker = new Docker({
        agent: sshModem(sshConfig),
    } as Docker.DockerOptions);
    return {docker, sshConfig, h, host};
}

async function run(config: Validated<typeof ValidatorsSchema>, id: string) {
    const {docker, sshConfig, h, host} = await getDocker(config, id);
    let containers = new Set((await docker.listContainers()).map(e => e.Names[0]));
    const sshConn = new SSHPromise(sshConfig);
    const workDir = config.workDir;

    //let pms = [];
    for (let i = 0; i < h.validators.length; i++) {
        const v = h.validators[i];
        const name = `a2v-${v}`;
        if (containers.has('/' + name)) {
            console.log(`validator ${v} already exists`);
        } else {
            const stakingPort = config.baseStakingPort + i * 2;
            const httpPort = config.baseHttpPort + i * 2;
            const affin: [number] = new Array() as [number];
            const cpuPerNode = h.cpuPerNode;
            const cpuStride = h.cpuStride;
            for (let j = i * cpuStride; j < i * cpuStride + cpuPerNode; j++) {
                affin.push(j % h.ncpu);
            }
            const exposedPorts: {[key: string]: Object} = {};
            const portBindings: {[key: string]: [Object]} = {};
            exposedPorts[`${stakingPort}/tcp`] = {};
            exposedPorts[`${httpPort}/tcp`] = {};
            portBindings[`${stakingPort}/tcp`] = [{ HostPort: `${stakingPort}` }];
            portBindings[`${httpPort}/tcp`] = [{ HostPort: `${httpPort}` }];

            const start = async () => {
                await sshConn.exec(`mkdir -p ${workDir}/${v}/`);
                console.log(`starting validator ${v} on core ${affin.join(',')}`);
                const cmd = [
                    './build/avalanchego',
                    '--public-ip', `${host}`,
                    '--staking-port', `${stakingPort}`,
                    '--http-host', '0.0.0.0',
                    '--http-port', `${httpPort}`,
                    '--staking-tls-cert-file', `/staking/${v}.crt`,
                    '--staking-tls-key-file', `/staking/${v}.key`,
                ];
                const key = tar.c({cwd: './keys', prefix: './staking' }, [
                    `./${v}.crt`,
                    `./${v}.key`,
                ]).pipe(fs.createWriteStream(`./keys/${v}.tar`));
                await new Promise(fulfill => key.on("finish", fulfill));

                let c = await docker.createContainer({
                    Image: `avaplatform/avalanchego:${config.release}`, 
                    name: name,
                    Cmd: cmd,
                    Tty: true,
                    ExposedPorts: exposedPorts,
                    HostConfig: {
                        AutoRemove: true,
                        CpusetCpus: affin.join(','),
                        Ulimits: [{Name: "nofile", Soft: 65536, Hard: 65536}],
                        PortBindings: portBindings,
                        Binds: [`${workDir}/${v}/:/root/.avalanchego:`],
                    }
                });
                await c.putArchive(`./keys/${v}.tar`, {path: '/' });
                await c.start().then(() => {
                    console.log(`started validator ${v}`);
                });
            }
            await start();
            //pms.push(start());
        }
    }
    //await Promise.all(pms);
    sshConn.close();
}

async function stop(config: Validated<typeof ValidatorsSchema>, id: string) {
    const {docker, sshConfig, h} = await getDocker(config, id);
    let containers = (await docker.listContainers()).reduce((a: {[key: string]: string}, e) => {
        a[e.Names[0]] = e.Id;
        return a;
    }, {});
    //let pms = [];
    for (let i = 0; i < h.validators.length; i++) {
        const v = h.validators[i];
        const name = `a2v-${v}`;
        const id = containers['/' + name];
        if (id) {
            console.log(`stopping validator ${v}`);
            let pm = docker.getContainer(id).stop().then(() => {
                console.log(`stopped validator ${v}`);
            });
            await pm;
            //pms.push(pm);
        }
    }
    //await Promise.all(pms);
}

async function runAll(config: Validated<typeof ValidatorsSchema>) {
    for (const id in config.hosts) {
        await run(config, id);
    }
}

async function buildImage(config: Validated<typeof ValidatorsSchema>, id: string) {
    const branch = config.release;
    const dockerhubRepo = 'avaplatform/avalanchego';
    const remote = 'https://github.com/ava-labs/avalanchego.git'; 
    const gopath = './.build_image_gopath';
    const workprefix = `${gopath}/src/github.com/ava-labs`;
    shell.rm('-rf', workprefix);
    const avalancheClone = `${workprefix}/avalanchego`;
    shell.exec('git config --global crendential.helper cache');
    shell.exec(`git clone "${remote}" "${avalancheClone}" --depth=1 -b ${branch}`);
    shell.exec(`sed -i 's/^\.git$//g' "${avalancheClone}/.dockerignore"`);
    const tarDockerFile = `${avalancheClone}/avalanchego.tar`;
    const tag = `${dockerhubRepo}:${branch}`;
    const key = tar.c({cwd: avalancheClone}, [
        `.`,
    ]).pipe(fs.createWriteStream(tarDockerFile));
    await new Promise(fulfill => key.on("finish", fulfill));

    const {docker} = await getDocker(config, id);
    await new Promise((resolve, reject) => {
        docker.buildImage(
            tarDockerFile,
            {t: tag},
            (err, output) => {
                if (err) {
                    console.error(err)
                    reject(err)
                }
                if (output) {
                    output.pipe(process.stdout, {end: true})
                    output.on('end', resolve)
                }
            }
        )
    })
    console.log(`Finished building image ${tag}.`);
}

async function main() {
    const yargs = require('yargs/yargs')
    const { hideBin } = require('yargs/helpers')
    const getConfig = (profile: string) =>
        (new TsjsonParser(ValidatorsSchema)).parse(stripJsonComments(
            fs.readFileSync(profile).toString()));
    const die = (s: string) => {
        process.stderr.write(`${s}\n`);
        process.exit(1);
    };
    const getHostId = (yargs: any) => yargs.positional('hostid', {
        type: 'string',
        describe: 'Host ID'
    });

    yargs(hideBin(process.argv))
        .command('run [host-id]', 'start the containers on the given host', getHostId, async (argv: any) => {
            if (argv.hostId === undefined) {
                runAll(getConfig(argv.profile));
            } else {
                const config = getConfig(argv.profile);
                if (!(argv.hostId in config.hosts)) {
                    die(`run: host id "${argv.hostId}" not found`);
                }
                await run(config, argv.hostId);
            }
        }).command('stop [host-id]', 'stop the containers on the given host', getHostId, async (argv: any) => {
            if (argv.hostId === undefined) {
                //stopAll(getConfig(argv.profile));
            } else {
                const config = getConfig(argv.profile);
                if (!(argv.hostId in config.hosts)) {
                    die(`stop: host id "${argv.hostId}" not found`);

                }
                await stop(config, argv.hostId);
            }
        }).command('buildImage [host-id]', 'build avalanchego image on the given host', getHostId, async (argv: any) => {
            if (argv.hostId === undefined) {
                //buildImageAll(getConfig(argv.profile));
            } else {
                const config = getConfig(argv.profile);
                if (!(argv.hostId in config.hosts)) {
                    die(`buildImage: host id "${argv.hostId}" not found`);

                }
                await buildImage(config, argv.hostId);
            }
        }).option('profile', {
            alias: 'c',
            type: 'string',
            default: './validators.json',
            description: 'JSON file that describes all validators'
        })
        .showHelpOnFail(false, 'run with --help to see help information')
        .argv;
}

if (require.main === module) {
    main();
}
