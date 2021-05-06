#!/usr/bin/env -S npx ts-node
import Docker = require('dockerode');
import SSHPromise = require('ssh2-promise');
const sshModem: any = require('docker-modem/lib/ssh');
import * as fs from 'fs';
import * as tar from 'tar';

async function startAll() {
    const config = JSON.parse(fs.readFileSync('./validators.json').toString());
    for (const h of config.hosts) {
        console.log(`connecting to ${h.host}...`);
        const sshConfig = {
            host: h.host,
            username: h.username,
            privateKey: fs.readFileSync(h.privateKeyFile)
        };
        const docker = new Docker({
            agent: sshModem(sshConfig)
        } as Docker.DockerOptions);
        let containers = new Set((await docker.listContainers()).map(e => e.Names[0]));
        const sshConn = new SSHPromise(sshConfig);
        const workDir = config.workDir;

        for (let i = 0; i < h.validators.length; i++) {
            const v = h.validators[i];
            const name = `a2v-${v}`;
            if (containers.has('/' + name)) {
                console.log(`validator ${v} already exists`);
            } else {
                const stakingPort = config.baseStakingPort + i * 2;
                const httpPort = config.baseHttpPort + i * 2;
                const affin = [];
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

                await sshConn.exec(`mkdir -p ${workDir}/${v}/`);
                console.log(`starting validator ${v} on core ${affin.join(',')}`);
                const cmd = [
                    './build/avalanchego',
                    '--public-ip', `${h.host}`,
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
                    Tty: true,
                    Cmd: cmd,
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
                await c.start({
                    Detach: true,
                });
            }
        }
        sshConn.close();
    }
}

startAll()
