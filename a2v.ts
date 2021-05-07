#!/usr/bin/env -S npx ts-node
import Docker = require("dockerode");
import SSHPromise = require("ssh2-promise");
/* eslint-disable-next-line */
const sshModem: any = require("docker-modem/lib/ssh");
import util from "util";
import stream from "stream";
import dns from "dns";
import fs from "fs";
import path from "path";
import tar from "tar";
import { createSchema as S, TsjsonParser, Validated } from "ts-json-validator";
import shell from "shelljs";
import stripJsonComments from "strip-json-comments";
const dnsLookup = util.promisify(dns.lookup);

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

export const validatorsSchema = S({
    type: "object",
    properties: {
        release: S({
            type: "string",
            title: "release (tag/branch) of avalanchego",
        }),
        workDir: S({
            type: "string",
            title:
                "working directory (databases and logs) on the host system used by validators",
        }),
        keysDir: S({
            type: "string",
            title: "the directory of all keys/certs",
        }),
        baseStakingPort: S({
            type: "number",
            title: "base port number for staking/voting",
        }),
        baseHttpPort: S({
            type: "number",
            title: "base port number for JSON/RPC",
        }),
        hosts: S({
            type: "object",
            additionalProperties: S({
                type: "object",
                properties: {
                    host: S({ type: "string" }),
                    username: S({ type: "string" }),
                    privateKeyFile: S({ type: "string" }),
                    validators: S({
                        type: "array",
                        items: S({ type: "string" }),
                    }),
                    ncpu: S({ type: "number" }),
                    cpuPerNode: S({ type: "number" }),
                    cpuStride: S({ type: "number" }),
                },
                required: [
                    "host",
                    "username",
                    "privateKeyFile",
                    "validators",
                    "ncpu",
                    "cpuPerNode",
                    "cpuStride",
                ],
            }),
        }),
    },
    required: [
        "release",
        "workDir",
        "keysDir",
        "baseStakingPort",
        "baseHttpPort",
        "hosts",
    ],
});

const getDocker = async (
    config: Validated<typeof validatorsSchema>,
    id: string,
    log: stream.Writable
) => {
    const h = config.hosts[id];
    const host = (await dnsLookup(h.host)).address;
    log.write(`connecting to ${id} (${h.host}: ${host})...\n`);
    const sshConfig = {
        host,
        username: h.username,
        privateKey: fs.readFileSync(h.privateKeyFile),
    };
    const docker = new Docker({
        // eslint-disable-next-line
        agent: sshModem(sshConfig),
    } as Docker.DockerOptions);
    return { docker, sshConfig, h, host };
};

export const run = async (
    config: Validated<typeof validatorsSchema>,
    id: string,
    nodeId: string | null,
    log: stream.Writable
): Promise<boolean> => {
    const { docker, sshConfig, h, host } = await getDocker(config, id, log);
    const containers = new Set(
        (await docker.listContainers({ all: true })).map((e) => e.Names[0])
    );
    const sshConn = new SSHPromise(sshConfig);
    const workDir = config.workDir;
    const keysDir = config.keysDir as string;

    let start = 0;
    let end = h.validators.length;
    if (nodeId) {
        start = h.validators.findIndex((e) => e === nodeId);
        if (start < 0) {
            return false;
        }
        end = start + 1;
    }

    // let pms = [];
    for (let i = start; i < end; i++) {
        const v = h.validators[i];
        const name = `a2v-${v}`;
        if (containers.has("/" + name)) {
            log.write(`validator ${v} already exists\n`);
        } else {
            const stakingPort = (config.baseStakingPort as number) + i * 2;
            const httpPort = (config.baseHttpPort as number) + i * 2;
            const affin = [] as number[];
            const cpuPerNode = h.cpuPerNode as number;
            const cpuStride = h.cpuStride as number;
            for (let j = i * cpuStride; j < i * cpuStride + cpuPerNode; j++) {
                affin.push(j % h.ncpu);
            }
            /* eslint-disable @typescript-eslint/naming-convention */
            const exposedPorts: {
                [key: string]: { [key: string]: Record<string, never> };
            } = {};
            const portBindings: { [key: string]: [{ HostPort: string }] } = {};
            exposedPorts[`${stakingPort}/tcp`] = {};
            exposedPorts[`${httpPort}/tcp`] = {};
            portBindings[`${stakingPort}/tcp`] = [
                { HostPort: `${stakingPort}` },
            ];
            portBindings[`${httpPort}/tcp`] = [{ HostPort: `${httpPort}` }];
            /* eslint-enable @typescript-eslint/naming-convention */

            /* eslint-disable no-underscore-dangle */
            const _run = async () => {
                await sshConn.exec(`mkdir -p ${workDir}/${v}/`);
                log.write(
                    `starting validator ${v} on core ${affin.join(",")}\n`
                );
                const cmd = [
                    "./build/avalanchego",
                    "--public-ip",
                    `${host}`,
                    "--staking-port",
                    `${stakingPort}`,
                    "--http-host",
                    "0.0.0.0",
                    "--http-port",
                    `${httpPort}`,
                    "--staking-tls-cert-file",
                    `/staking/${v}.crt`,
                    "--staking-tls-key-file",
                    `/staking/${v}.key`,
                ];
                const key = tar
                    .c({ cwd: keysDir, prefix: "./staking" }, [
                        `./${v}.crt`,
                        `./${v}.key`,
                    ])
                    .pipe(fs.createWriteStream(`${path.join(keysDir, v)}.tar`));
                await new Promise((fulfill) => key.on("finish", fulfill));

                /* eslint-disable @typescript-eslint/naming-convention */
                const c = await docker.createContainer({
                    Image: `avaplatform/avalanchego:${config.release}`,
                    name,
                    Cmd: cmd,
                    Tty: true,
                    ExposedPorts: exposedPorts,
                    HostConfig: {
                        AutoRemove: true,
                        CpusetCpus: affin.join(","),
                        Ulimits: [{ Name: "nofile", Soft: 65536, Hard: 65536 }],
                        PortBindings: portBindings,
                        Binds: [`${path.join(workDir, v)}:/root/.avalanchego:`],
                    },
                });
                /* eslint-enable @typescript-eslint/naming-convention */
                await c.putArchive(`${path.join(keysDir, v)}.tar`, {
                    path: "/",
                });
                await c.start().then(() => {
                    log.write(`started validator ${v}\n`);
                });
            };
            /* eslint-enable no-underscore-dangle */
            await _run();
            // pms.push(start());
        }
    }
    // await Promise.all(pms);
    await sshConn.close();
    return true;
};

export const stop = async (
    config: Validated<typeof validatorsSchema>,
    id: string,
    nodeId: string | null,
    force: boolean,
    log: stream.Writable
): Promise<boolean> => {
    const { docker, h } = await getDocker(config, id, log);
    const containers = (await docker.listContainers()).reduce(
        (a: { [key: string]: string }, e) => {
            a[e.Names[0]] = e.Id;
            return a;
        },
        {}
    );
    let start = 0;
    let end = h.validators.length;
    if (nodeId) {
        start = h.validators.findIndex((e) => e === nodeId);
        if (start < 0) {
            return false;
        }
        end = start + 1;
    }
    // let pms = [];
    for (let i = start; i < end; i++) {
        const v = h.validators[i];
        const name = `a2v-${v}`;
        const cid = containers["/" + name];
        if (cid) {
            log.write(`${force ? "forced " : ""}stopping validator ${v}\n`);
            const c = docker.getContainer(cid);
            const pm = (force ? c.remove({ force: true }) : c.stop()).then(
                () => {
                    log.write(`stopped validator ${v}\n`);
                }
            );
            await pm;
            // pms.push(pm);
        }
    }
    // await Promise.all(pms);
    return true;
};

export const showValidators = async (
    config: Validated<typeof validatorsSchema>,
    id: string,
    nodeId: string | null,
    log: stream.Writable
): Promise<boolean> => {
    const { docker, h } = await getDocker(config, id, log);
    const containers = (await docker.listContainers({ all: true })).reduce(
        (a: { [key: string]: Docker.ContainerInfo }, e) => {
            a[e.Names[0]] = e;
            return a;
        },
        {}
    );

    let start = 0;
    let end = h.validators.length;
    if (nodeId) {
        start = h.validators.findIndex((e) => e === nodeId);
        if (start < 0) {
            return false;
        }
        end = start + 1;
    }
    for (let i = start; i < end; i++) {
        const v = h.validators[i];
        const name = `a2v-${v}`;
        const e = containers["/" + name];
        if (e) {
            const ports = e.Ports.map(
                (_e) => `${_e.PrivatePort}->${_e.PublicPort}`
            ).join(",");
            log.write(`${v}: id(${e.Id}) ports(${ports}) image(${e.Image})\n`);
        }
    }
    return true;
};

export const buildImage = async (
    config: Validated<typeof validatorsSchema>,
    id: string,
    log: stream.Writable
): Promise<void> => {
    const branch = config.release;
    const dockerhubRepo = "avaplatform/avalanchego";
    const remote = "https://github.com/ava-labs/avalanchego.git";
    const gopath = "./.build_image_gopath";
    const workprefix = path.join(gopath, "src", "github.com/ava-labs");
    shell.rm("-rf", workprefix);
    const avalancheClone = path.join(workprefix, "avalanchego");
    shell.exec("git config --global crendential.helper cache");
    shell.exec(
        `git clone "${remote}" "${avalancheClone}" --depth=1 -b ${branch}`
    );
    shell.exec(
        `sed -i 's/^\.git$//g' '${path.join(avalancheClone, ".dockerignore")}'`
    );
    const tarDockerFile = path.join(avalancheClone, "avalanchego.tar");
    const tag = `${dockerhubRepo}:${branch}`;
    const key = tar
        .c({ cwd: avalancheClone }, [`.`])
        .pipe(fs.createWriteStream(tarDockerFile));
    await new Promise((fulfill) => key.on("finish", fulfill));

    const { docker } = await getDocker(config, id, log);
    await new Promise((resolve, reject) => {
        docker.buildImage(tarDockerFile, { t: tag }, (err, output) => {
            if (err) {
                reject(err);
            }
            if (output) {
                output.pipe(process.stdout, { end: true });
                output.on("end", resolve);
            }
        });
    });
    log.write(`Finished building image ${tag}.\n`);
};

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
const main = () => {
    const getConfig = (profile: string) => {
        const config = new TsjsonParser(validatorsSchema).parse(
            stripJsonComments(fs.readFileSync(profile).toString())
        );
        const basePath = path.dirname(profile);
        if (!path.isAbsolute(config.keysDir))
            config.keysDir = path.join(basePath, config.keysDir);
        for (const id in config.hosts) {
            const h = config.hosts[id];
            if (!path.isAbsolute(h.privateKeyFile))
                config.hosts[id].privateKeyFile = path.join(
                    basePath,
                    h.privateKeyFile
                );
        }
        return config;
    };
    /* eslint-disable @typescript-eslint/no-unsafe-call */
    /* eslint-disable @typescript-eslint/no-unsafe-return */
    const getHostId = (y: any) =>
        y.positional("hostid", {
            type: "string",
            describe: "Host ID (optional, empty to include all hosts)",
        });
    const getHostStakerId = (y: any) =>
        y
            .positional("hostid", {
                type: "string",
                describe: "Host ID (optional, empty to include all hosts)",
            })
            .positional("nodeid", {
                type: "string",
                describe:
                    "Staker ID (optional, empty to include all validators)",
            });
    const getHostStakerId2 = (y: any) =>
        getHostStakerId(y).option("force", {
            alias: "f",
            type: "boolean",
            default: false,
        });
    /* eslint-enable @typescript-eslint/no-unsafe-call */
    /* eslint-enable @typescript-eslint/no-unsafe-return */
    const log = process.stdout;
    const die = (s: string) => {
        process.stderr.write(`${s}\n`);
        process.exit(1);
    };
    const wrapHandler = (fn: (argv: any) => Promise<void>) => {
        return async (_argv: any) => {
            try {
                await fn(_argv);
            } catch (e) {
                die(`error: ${(e as Error).message}`);
            }
        };
    };

    yargs(hideBin(process.argv))
        .command(
            "run [host-id] [node-id]",
            "start the container(s) on the given host",
            getHostStakerId,
            wrapHandler(async (argv: any) => {
                if (argv.hostId === undefined) {
                    const config = getConfig(argv.profile);
                    for (const id in config.hosts) {
                        await run(config, id, null, log);
                    }
                } else {
                    const config = getConfig(argv.profile);
                    if (!(argv.hostId in config.hosts)) {
                        die(`run: host id "${argv.hostId}" not found`);
                    }
                    await run(config, argv.hostId, argv.nodeId, log);
                }
            })
        )
        .command(
            "stop [host-id] [node-id] [--force]",
            "stop the container(s) on the given host",
            getHostStakerId2,
            wrapHandler(async (argv: any) => {
                if (argv.hostId === undefined) {
                    const config = getConfig(argv.profile);
                    for (const id in config.hosts) {
                        await stop(config, id, null, argv.force, log);
                    }
                } else {
                    const config = getConfig(argv.profile);
                    if (!(argv.hostId in config.hosts)) {
                        die(`stop: host id "${argv.hostId}" not found`);
                    }
                    await stop(
                        config,
                        argv.hostId,
                        argv.nodeId,
                        argv.force,
                        log
                    );
                }
            })
        )
        .command(
            "buildImage [host-id]",
            "build avalanchego image on the given host",
            getHostId,
            wrapHandler(async (argv: any) => {
                if (argv.hostId === undefined) {
                    const config = getConfig(argv.profile);
                    for (const id in config.hosts) {
                        await buildImage(config, id, log);
                    }
                } else {
                    const config = getConfig(argv.profile);
                    if (!(argv.hostId in config.hosts)) {
                        die(`buildImage: host id "${argv.hostId}" not found`);
                    }
                    await buildImage(config, argv.hostId, log);
                }
            })
        )
        .command(
            "show [host-id] [node-id]",
            "show validators on the given host",
            getHostStakerId,
            wrapHandler(async (argv: any) => {
                if (argv.hostId === undefined) {
                    const config = getConfig(argv.profile);
                    for (const id in config.hosts) {
                        await showValidators(config, id, null, log);
                    }
                } else {
                    const config = getConfig(argv.profile);
                    if (!(argv.hostId in config.hosts)) {
                        die(`show: host id "${argv.hostId}" not found`);
                    }
                    if (
                        !(await showValidators(
                            config,
                            argv.hostId,
                            argv.nodeId,
                            log
                        ))
                    ) {
                        die(`show: node id "${argv.nodeId}" not found`);
                    }
                }
            })
        )
        .option("profile", {
            alias: "c",
            type: "string",
            default: "./validators.json",
            description: "JSON file that describes all validators",
        })
        .strict()
        .showHelpOnFail(true)
        .demandCommand()
        .parse();
};
/* eslint-enable @typescript-eslint/no-unsafe-member-access */
/* eslint-enable @typescript-eslint/no-misused-promises */
/* eslint-enable @typescript-eslint/restrict-template-expressions */

if (require.main === module) {
    main();
}
