#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var Docker = require("dockerode");
var SSHPromise = require("ssh2-promise");
var sshModem = require('docker-modem/lib/ssh');
var util_1 = __importDefault(require("util"));
var dns_1 = __importDefault(require("dns"));
var fs_1 = __importDefault(require("fs"));
var tar_1 = __importDefault(require("tar"));
var ts_json_validator_1 = require("ts-json-validator");
var shelljs_1 = __importDefault(require("shelljs"));
var strip_json_comments_1 = __importDefault(require("strip-json-comments"));
var dnsLookup = util_1.default.promisify(dns_1.default.lookup);
var ValidatorsSchema = ts_json_validator_1.createSchema({
    type: "object",
    properties: {
        release: ts_json_validator_1.createSchema({ type: "string", title: "release (tag/branch) of avalanchego" }),
        workDir: ts_json_validator_1.createSchema({ type: "string", title: "working directory (databases and logs) on the host system used by validators" }),
        baseStakingPort: ts_json_validator_1.createSchema({ type: "number", title: "base port number for staking/voting" }),
        baseHttpPort: ts_json_validator_1.createSchema({ type: "number", title: "base port number for JSON/RPC" }),
        hosts: ts_json_validator_1.createSchema({
            type: "object",
            additionalProperties: ts_json_validator_1.createSchema({
                type: "object",
                properties: {
                    host: ts_json_validator_1.createSchema({ type: "string" }),
                    username: ts_json_validator_1.createSchema({ type: "string" }),
                    privateKeyFile: ts_json_validator_1.createSchema({ type: "string" }),
                    validators: ts_json_validator_1.createSchema({ type: "array", items: ts_json_validator_1.createSchema({ type: "string" }) }),
                    ncpu: ts_json_validator_1.createSchema({ type: "number" }),
                    cpuPerNode: ts_json_validator_1.createSchema({ type: "number" }),
                    cpuStride: ts_json_validator_1.createSchema({ type: "number" }),
                },
                required: ["host", "username", "privateKeyFile", "validators", "ncpu", "cpuPerNode", "cpuStride"]
            })
        }),
    },
    required: ["release", "workDir", "baseStakingPort", "baseHttpPort", "hosts"],
});
function getDocker(config, id) {
    return __awaiter(this, void 0, void 0, function () {
        var h, host, sshConfig, docker;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    h = config.hosts[id];
                    return [4 /*yield*/, dnsLookup(h.host)];
                case 1:
                    host = (_a.sent()).address;
                    console.log("connecting to " + id + " (" + h.host + ": " + host + ")...");
                    sshConfig = {
                        host: host,
                        username: h.username,
                        privateKey: fs_1.default.readFileSync(h.privateKeyFile)
                    };
                    docker = new Docker({
                        agent: sshModem(sshConfig),
                    });
                    return [2 /*return*/, { docker: docker, sshConfig: sshConfig, h: h, host: host }];
            }
        });
    });
}
function run(config, id, stakerId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, docker, sshConfig, h, host, containers, _b, sshConn, workDir, start, end, _loop_1, i;
        var _this = this;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, getDocker(config, id)];
                case 1:
                    _a = _c.sent(), docker = _a.docker, sshConfig = _a.sshConfig, h = _a.h, host = _a.host;
                    _b = Set.bind;
                    return [4 /*yield*/, docker.listContainers({ all: true })];
                case 2:
                    containers = new (_b.apply(Set, [void 0, (_c.sent()).map(function (e) { return e.Names[0]; })]))();
                    sshConn = new SSHPromise(sshConfig);
                    workDir = config.workDir;
                    start = 0;
                    end = h.validators.length;
                    if (stakerId) {
                        start = h.validators.findIndex(function (e) { return e == stakerId; });
                        if (start < 0) {
                            return [2 /*return*/, false];
                        }
                        end = start + 1;
                    }
                    _loop_1 = function (i) {
                        var v, name_1, stakingPort_1, httpPort_1, affin_1, cpuPerNode, cpuStride, j, exposedPorts_1, portBindings_1, start_1;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    v = h.validators[i];
                                    name_1 = "a2v-" + v;
                                    if (!containers.has('/' + name_1)) return [3 /*break*/, 1];
                                    console.log("validator " + v + " already exists");
                                    return [3 /*break*/, 3];
                                case 1:
                                    stakingPort_1 = config.baseStakingPort + i * 2;
                                    httpPort_1 = config.baseHttpPort + i * 2;
                                    affin_1 = new Array();
                                    cpuPerNode = h.cpuPerNode;
                                    cpuStride = h.cpuStride;
                                    for (j = i * cpuStride; j < i * cpuStride + cpuPerNode; j++) {
                                        affin_1.push(j % h.ncpu);
                                    }
                                    exposedPorts_1 = {};
                                    portBindings_1 = {};
                                    exposedPorts_1[stakingPort_1 + "/tcp"] = {};
                                    exposedPorts_1[httpPort_1 + "/tcp"] = {};
                                    portBindings_1[stakingPort_1 + "/tcp"] = [{ HostPort: "" + stakingPort_1 }];
                                    portBindings_1[httpPort_1 + "/tcp"] = [{ HostPort: "" + httpPort_1 }];
                                    start_1 = function () { return __awaiter(_this, void 0, void 0, function () {
                                        var cmd, key, c;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, sshConn.exec("mkdir -p " + workDir + "/" + v + "/")];
                                                case 1:
                                                    _a.sent();
                                                    console.log("starting validator " + v + " on core " + affin_1.join(','));
                                                    cmd = [
                                                        './build/avalanchego',
                                                        '--public-ip',
                                                        "" + host,
                                                        '--staking-port',
                                                        "" + stakingPort_1,
                                                        '--http-host', '0.0.0.0',
                                                        '--http-port',
                                                        "" + httpPort_1,
                                                        '--staking-tls-cert-file',
                                                        "/staking/" + v + ".crt",
                                                        '--staking-tls-key-file',
                                                        "/staking/" + v + ".key",
                                                    ];
                                                    key = tar_1.default.c({ cwd: './keys', prefix: './staking' }, [
                                                        "./" + v + ".crt",
                                                        "./" + v + ".key",
                                                    ]).pipe(fs_1.default.createWriteStream("./keys/" + v + ".tar"));
                                                    return [4 /*yield*/, new Promise(function (fulfill) { return key.on("finish", fulfill); })];
                                                case 2:
                                                    _a.sent();
                                                    return [4 /*yield*/, docker.createContainer({
                                                            Image: "avaplatform/avalanchego:" + config.release,
                                                            name: name_1,
                                                            Cmd: cmd,
                                                            Tty: true,
                                                            ExposedPorts: exposedPorts_1,
                                                            HostConfig: {
                                                                AutoRemove: true,
                                                                CpusetCpus: affin_1.join(','),
                                                                Ulimits: [{ Name: "nofile", Soft: 65536, Hard: 65536 }],
                                                                PortBindings: portBindings_1,
                                                                Binds: [workDir + "/" + v + "/:/root/.avalanchego:"],
                                                            }
                                                        })];
                                                case 3:
                                                    c = _a.sent();
                                                    return [4 /*yield*/, c.putArchive("./keys/" + v + ".tar", { path: '/' })];
                                                case 4:
                                                    _a.sent();
                                                    return [4 /*yield*/, c.start().then(function () {
                                                            console.log("started validator " + v);
                                                        })];
                                                case 5:
                                                    _a.sent();
                                                    return [2 /*return*/];
                                            }
                                        });
                                    }); };
                                    return [4 /*yield*/, start_1()];
                                case 2:
                                    _d.sent();
                                    _d.label = 3;
                                case 3: return [2 /*return*/];
                            }
                        });
                    };
                    i = start;
                    _c.label = 3;
                case 3:
                    if (!(i < end)) return [3 /*break*/, 6];
                    return [5 /*yield**/, _loop_1(i)];
                case 4:
                    _c.sent();
                    _c.label = 5;
                case 5:
                    i++;
                    return [3 /*break*/, 3];
                case 6:
                    //await Promise.all(pms);
                    sshConn.close();
                    return [2 /*return*/];
            }
        });
    });
}
function stop(config, id, stakerId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, docker, sshConfig, h, containers, start, end, _loop_2, i;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, getDocker(config, id)];
                case 1:
                    _a = _b.sent(), docker = _a.docker, sshConfig = _a.sshConfig, h = _a.h;
                    return [4 /*yield*/, docker.listContainers()];
                case 2:
                    containers = (_b.sent()).reduce(function (a, e) {
                        a[e.Names[0]] = e.Id;
                        return a;
                    }, {});
                    start = 0;
                    end = h.validators.length;
                    if (stakerId) {
                        start = h.validators.findIndex(function (e) { return e == stakerId; });
                        if (start < 0) {
                            return [2 /*return*/, false];
                        }
                        end = start + 1;
                    }
                    _loop_2 = function (i) {
                        var v, name_2, id_1, pm;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    v = h.validators[i];
                                    name_2 = "a2v-" + v;
                                    id_1 = containers['/' + name_2];
                                    if (!id_1) return [3 /*break*/, 2];
                                    console.log("stopping validator " + v);
                                    pm = docker.getContainer(id_1).stop().then(function () {
                                        console.log("stopped validator " + v);
                                    });
                                    return [4 /*yield*/, pm];
                                case 1:
                                    _c.sent();
                                    _c.label = 2;
                                case 2: return [2 /*return*/];
                            }
                        });
                    };
                    i = start;
                    _b.label = 3;
                case 3:
                    if (!(i < end)) return [3 /*break*/, 6];
                    return [5 /*yield**/, _loop_2(i)];
                case 4:
                    _b.sent();
                    _b.label = 5;
                case 5:
                    i++;
                    return [3 /*break*/, 3];
                case 6: 
                //await Promise.all(pms);
                return [2 /*return*/, true];
            }
        });
    });
}
function showValidators(config, id, stakerId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, docker, sshConfig, h, containers, start, end, i, v, name_3, e, ports;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, getDocker(config, id)];
                case 1:
                    _a = _b.sent(), docker = _a.docker, sshConfig = _a.sshConfig, h = _a.h;
                    return [4 /*yield*/, docker.listContainers({ all: true })];
                case 2:
                    containers = (_b.sent()).reduce(function (a, e) {
                        a[e.Names[0]] = e;
                        return a;
                    }, {});
                    start = 0;
                    end = h.validators.length;
                    if (stakerId) {
                        start = h.validators.findIndex(function (e) { return e == stakerId; });
                        if (start < 0) {
                            return [2 /*return*/, false];
                        }
                        end = start + 1;
                    }
                    for (i = start; i < end; i++) {
                        v = h.validators[i];
                        name_3 = "a2v-" + v;
                        e = containers['/' + name_3];
                        if (e) {
                            ports = e.Ports.map(function (e) { return e.PrivatePort + "->" + e.PublicPort; }).join(',');
                            console.log(v + ": id(" + e.Id + ") ports(" + ports + ") image(" + e.Image + ")");
                        }
                    }
                    return [2 /*return*/, true];
            }
        });
    });
}
function buildImage(config, id) {
    return __awaiter(this, void 0, void 0, function () {
        var branch, dockerhubRepo, remote, gopath, workprefix, avalancheClone, tarDockerFile, tag, key, docker;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    branch = config.release;
                    dockerhubRepo = 'avaplatform/avalanchego';
                    remote = 'https://github.com/ava-labs/avalanchego.git';
                    gopath = './.build_image_gopath';
                    workprefix = gopath + "/src/github.com/ava-labs";
                    shelljs_1.default.rm('-rf', workprefix);
                    avalancheClone = workprefix + "/avalanchego";
                    shelljs_1.default.exec('git config --global crendential.helper cache');
                    shelljs_1.default.exec("git clone \"" + remote + "\" \"" + avalancheClone + "\" --depth=1 -b " + branch);
                    shelljs_1.default.exec("sed -i 's/^.git$//g' \"" + avalancheClone + "/.dockerignore\"");
                    tarDockerFile = avalancheClone + "/avalanchego.tar";
                    tag = dockerhubRepo + ":" + branch;
                    key = tar_1.default.c({ cwd: avalancheClone }, [
                        ".",
                    ]).pipe(fs_1.default.createWriteStream(tarDockerFile));
                    return [4 /*yield*/, new Promise(function (fulfill) { return key.on("finish", fulfill); })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, getDocker(config, id)];
                case 2:
                    docker = (_a.sent()).docker;
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            docker.buildImage(tarDockerFile, { t: tag }, function (err, output) {
                                if (err) {
                                    console.error(err);
                                    reject(err);
                                }
                                if (output) {
                                    output.pipe(process.stdout, { end: true });
                                    output.on('end', resolve);
                                }
                            });
                        })];
                case 3:
                    _a.sent();
                    console.log("Finished building image " + tag + ".");
                    return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var yargs, hideBin, getConfig, die, getHostId, getHostStakerId;
        var _this = this;
        return __generator(this, function (_a) {
            yargs = require('yargs/yargs');
            hideBin = require('yargs/helpers').hideBin;
            getConfig = function (profile) {
                return (new ts_json_validator_1.TsjsonParser(ValidatorsSchema)).parse(strip_json_comments_1.default(fs_1.default.readFileSync(profile).toString()));
            };
            die = function (s) {
                process.stderr.write(s + "\n");
                process.exit(1);
            };
            getHostId = function (yargs) { return yargs.positional('hostid', {
                type: 'string',
                describe: 'Host ID'
            }); };
            getHostStakerId = function (yargs) { return yargs.positional('hostid', {
                type: 'string',
                describe: 'Host ID'
            }).positional('stakerid', {
                type: 'string',
                describe: 'Staker ID'
            }); };
            yargs(hideBin(process.argv))
                .command('run [host-id] [staker-id]', 'start the containers on the given host', getHostStakerId, function (argv) { return __awaiter(_this, void 0, void 0, function () {
                var config, _a, _b, _i, id, config;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!(argv.hostId === undefined)) return [3 /*break*/, 5];
                            config = getConfig(argv.profile);
                            _a = [];
                            for (_b in config.hosts)
                                _a.push(_b);
                            _i = 0;
                            _c.label = 1;
                        case 1:
                            if (!(_i < _a.length)) return [3 /*break*/, 4];
                            id = _a[_i];
                            return [4 /*yield*/, run(config, id, null)];
                        case 2:
                            _c.sent();
                            _c.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [3 /*break*/, 7];
                        case 5:
                            config = getConfig(argv.profile);
                            if (!(argv.hostId in config.hosts)) {
                                die("run: host id \"" + argv.hostId + "\" not found");
                            }
                            return [4 /*yield*/, run(config, argv.hostId, argv.stakerId)];
                        case 6:
                            _c.sent();
                            _c.label = 7;
                        case 7: return [2 /*return*/];
                    }
                });
            }); }).command('stop [host-id] [staker-id]', 'stop the container(s) on the given host', getHostStakerId, function (argv) { return __awaiter(_this, void 0, void 0, function () {
                var config, _a, _b, _i, id, config;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!(argv.hostId === undefined)) return [3 /*break*/, 5];
                            config = getConfig(argv.profile);
                            _a = [];
                            for (_b in config.hosts)
                                _a.push(_b);
                            _i = 0;
                            _c.label = 1;
                        case 1:
                            if (!(_i < _a.length)) return [3 /*break*/, 4];
                            id = _a[_i];
                            return [4 /*yield*/, stop(config, id, null)];
                        case 2:
                            _c.sent();
                            _c.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [3 /*break*/, 7];
                        case 5:
                            config = getConfig(argv.profile);
                            if (!(argv.hostId in config.hosts)) {
                                die("stop: host id \"" + argv.hostId + "\" not found");
                            }
                            return [4 /*yield*/, stop(config, argv.hostId, argv.stakerId)];
                        case 6:
                            _c.sent();
                            _c.label = 7;
                        case 7: return [2 /*return*/];
                    }
                });
            }); }).command('buildImage [host-id]', 'build avalanchego image on the given host', getHostId, function (argv) { return __awaiter(_this, void 0, void 0, function () {
                var config, _a, _b, _i, id, config;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!(argv.hostId === undefined)) return [3 /*break*/, 5];
                            config = getConfig(argv.profile);
                            _a = [];
                            for (_b in config.hosts)
                                _a.push(_b);
                            _i = 0;
                            _c.label = 1;
                        case 1:
                            if (!(_i < _a.length)) return [3 /*break*/, 4];
                            id = _a[_i];
                            return [4 /*yield*/, buildImage(config, id)];
                        case 2:
                            _c.sent();
                            _c.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [3 /*break*/, 7];
                        case 5:
                            config = getConfig(argv.profile);
                            if (!(argv.hostId in config.hosts)) {
                                die("buildImage: host id \"" + argv.hostId + "\" not found");
                            }
                            return [4 /*yield*/, buildImage(config, argv.hostId)];
                        case 6:
                            _c.sent();
                            _c.label = 7;
                        case 7: return [2 /*return*/];
                    }
                });
            }); }).command('show [host-id] [staker-id]', 'show validators on the given host', getHostStakerId, function (argv) { return __awaiter(_this, void 0, void 0, function () {
                var config, _a, _b, _i, id, config;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!(argv.hostId === undefined)) return [3 /*break*/, 5];
                            config = getConfig(argv.profile);
                            _a = [];
                            for (_b in config.hosts)
                                _a.push(_b);
                            _i = 0;
                            _c.label = 1;
                        case 1:
                            if (!(_i < _a.length)) return [3 /*break*/, 4];
                            id = _a[_i];
                            return [4 /*yield*/, showValidators(config, id, null)];
                        case 2:
                            _c.sent();
                            _c.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [3 /*break*/, 7];
                        case 5:
                            config = getConfig(argv.profile);
                            if (!(argv.hostId in config.hosts)) {
                                die("show: host id \"" + argv.hostId + "\" not found");
                            }
                            return [4 /*yield*/, showValidators(config, argv.hostId, argv.stakerId)];
                        case 6:
                            if (!(_c.sent())) {
                                die("show: staker id \"" + argv.stakerId + "\" not found");
                            }
                            _c.label = 7;
                        case 7: return [2 /*return*/];
                    }
                });
            }); }).option('profile', {
                alias: 'c',
                type: 'string',
                default: './validators.json',
                description: 'JSON file that describes all validators'
            })
                .strict()
                .showHelpOnFail(false, 'run with --help to see help information')
                .argv;
            return [2 /*return*/];
        });
    });
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=a2v.js.map