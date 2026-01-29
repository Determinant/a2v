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
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prune = exports.rmImage = exports.showImages = exports.genKey = exports.buildImage = exports.showValidators = exports.stop = exports.run = exports.validatorsSchema = void 0;
var Docker = require("dockerode");
var SSHPromise = require("ssh2-promise");
/* eslint-disable-next-line */
var sshModem = require("docker-modem/lib/ssh");
var util_1 = __importDefault(require("util"));
var stream_1 = __importDefault(require("stream"));
var dns_1 = __importDefault(require("dns"));
var fs_1 = __importDefault(require("fs"));
var os_1 = __importDefault(require("os"));
var path_1 = __importDefault(require("path"));
var tar_1 = __importDefault(require("tar"));
var ts_json_validator_1 = require("ts-json-validator");
var shelljs_1 = __importDefault(require("shelljs"));
var strip_json_comments_1 = __importDefault(require("strip-json-comments"));
var dnsLookup = util_1.default.promisify(dns_1.default.lookup);
var yargs_1 = __importDefault(require("yargs"));
var helpers_1 = require("yargs/helpers");
exports.validatorsSchema = ts_json_validator_1.createSchema({
    type: "object",
    properties: {
        release: ts_json_validator_1.createSchema({
            type: "string",
            title: "release (tag/branch) of avalanchego",
        }),
        workDir: ts_json_validator_1.createSchema({
            type: "string",
            title: "working directory (databases and logs) on the host system used by validators",
        }),
        keysDir: ts_json_validator_1.createSchema({
            type: "string",
            title: "the directory of all keys/certs",
        }),
        stakingKeysDir: ts_json_validator_1.createSchema({
            type: "string",
            title: "the directory of staking keys (BLS)",
        }),
        baseStakingPort: ts_json_validator_1.createSchema({
            type: "number",
            title: "base port number for staking/voting",
        }),
        baseHttpPort: ts_json_validator_1.createSchema({
            type: "number",
            title: "base port number for JSON/RPC",
        }),
        publicHttp: ts_json_validator_1.createSchema({ type: "boolean" }),
        hosts: ts_json_validator_1.createSchema({
            type: "object",
            additionalProperties: ts_json_validator_1.createSchema({
                type: "object",
                properties: {
                    host: ts_json_validator_1.createSchema({ type: "string" }),
                    username: ts_json_validator_1.createSchema({ type: "string" }),
                    privateKeyFile: ts_json_validator_1.createSchema({ type: "string" }),
                    validators: ts_json_validator_1.createSchema({
                        type: "array",
                        items: ts_json_validator_1.createSchema({ type: "string" }),
                    }),
                    ncpu: ts_json_validator_1.createSchema({ type: "number" }),
                    cpuPerNode: ts_json_validator_1.createSchema({ type: "number" }),
                    cpuStride: ts_json_validator_1.createSchema({ type: "number" }),
                    workDir: ts_json_validator_1.createSchema({ type: "string" }),
                    publicHttp: ts_json_validator_1.createSchema({ type: "boolean" }),
                    baseStakingPort: ts_json_validator_1.createSchema({ type: "number" }),
                    baseHttpPort: ts_json_validator_1.createSchema({ type: "number" }),
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
var getDocker = function (config, id, log) { return __awaiter(void 0, void 0, void 0, function () {
    var h, host, sshConfig, docker;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                h = config.hosts[id];
                return [4 /*yield*/, dnsLookup(h.host)];
            case 1:
                host = (_a.sent()).address;
                log.write("connecting to " + id + " (" + h.host + ": " + host + ")...\n");
                sshConfig = {
                    host: host,
                    username: h.username,
                    privateKey: fs_1.default.readFileSync(h.privateKeyFile),
                };
                docker = new Docker({
                    // eslint-disable-next-line
                    agent: sshModem(sshConfig),
                });
                return [2 /*return*/, { docker: docker, sshConfig: sshConfig, h: h, host: host }];
        }
    });
}); };
var run = function (config, id, nodeId, log) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, docker, sshConfig, h, host, containers, _b, sshConn, keysDir, start, end, _loop_1, i;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, getDocker(config, id, log)];
            case 1:
                _a = _c.sent(), docker = _a.docker, sshConfig = _a.sshConfig, h = _a.h, host = _a.host;
                _b = Set.bind;
                return [4 /*yield*/, docker.listContainers({ all: true })];
            case 2:
                containers = new (_b.apply(Set, [void 0, (_c.sent()).map(function (e) { return e.Names[0]; })]))();
                sshConn = new SSHPromise(sshConfig);
                keysDir = config.keysDir;
                start = 0;
                end = h.validators.length;
                if (nodeId) {
                    start = h.validators.findIndex(function (e) { return e === nodeId; });
                    if (start < 0) {
                        return [2 /*return*/, false];
                    }
                    end = start + 1;
                }
                _loop_1 = function (i) {
                    var v, name_1, workDir_1, stakingPort_1, httpHost, httpPort_1, affin_1, cpuPerNode, cpuStride, j, exposedPorts_1, portBindings_1, runValidator;
                    return __generator(this, function (_d) {
                        switch (_d.label) {
                            case 0:
                                v = h.validators[i];
                                name_1 = "a2v-" + v;
                                if (!containers.has("/" + name_1)) return [3 /*break*/, 1];
                                log.write("validator " + v + " already exists\n");
                                return [3 /*break*/, 3];
                            case 1:
                                workDir_1 = h.workDir || config.workDir;
                                stakingPort_1 = (h.baseStakingPort !== undefined ? h.baseStakingPort : config.baseStakingPort) + i * 2;
                                httpHost = (h.publicHttp !== undefined ? h.publicHttp : config.publicHttp) ? "0.0.0.0" : "127.0.0.1";
                                httpPort_1 = (h.baseHttpPort !== undefined ? h.baseHttpPort : config.baseHttpPort) + i * 2;
                                affin_1 = [];
                                cpuPerNode = h.cpuPerNode;
                                cpuStride = h.cpuStride;
                                for (j = i * cpuStride; j < i * cpuStride + cpuPerNode; j++) {
                                    affin_1.push(j % h.ncpu);
                                }
                                exposedPorts_1 = {};
                                portBindings_1 = {};
                                exposedPorts_1[stakingPort_1 + "/tcp"] = {};
                                exposedPorts_1[httpPort_1 + "/tcp"] = {};
                                portBindings_1[stakingPort_1 + "/tcp"] = [
                                    { HostPort: "" + stakingPort_1 },
                                ];
                                portBindings_1[httpPort_1 + "/tcp"] = [{ HostIp: "" + httpHost, HostPort: "" + httpPort_1 }];
                                runValidator = function () { return __awaiter(void 0, void 0, void 0, function () {
                                    var tempKeysDir, blsKeyArg, blsKeyNameAlt, blsSourceAlt, cmd, tarFileName, key, c;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, sshConn.exec("mkdir -p " + workDir_1 + "/" + v + "/").catch(function (_) {
                                                    throw new Error("cannot create workDir, check your permission settings");
                                                })];
                                            case 1:
                                                _a.sent();
                                                log.write("starting validator " + v + " on core " + affin_1.join(",") + "\n");
                                                tempKeysDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), "a2v-keys-"));
                                                shelljs_1.default.cp(path_1.default.join(keysDir, v + ".crt"), path_1.default.join(tempKeysDir, v + ".crt"));
                                                shelljs_1.default.cp(path_1.default.join(keysDir, v + ".key"), path_1.default.join(tempKeysDir, v + ".key"));
                                                blsKeyArg = [];
                                                if (config.stakingKeysDir) {
                                                    blsKeyNameAlt = v + ".bls.key";
                                                    blsSourceAlt = path_1.default.join(config.stakingKeysDir, blsKeyNameAlt);
                                                    if (fs_1.default.existsSync(blsSourceAlt)) {
                                                        shelljs_1.default.cp(blsSourceAlt, path_1.default.join(tempKeysDir, v + ".bls.key"));
                                                        blsKeyArg = ["--staking-signer-key-file", "/staking/" + v + ".bls.key"];
                                                    }
                                                }
                                                cmd = __spreadArray([
                                                    "/avalanchego/build/avalanchego",
                                                    "--public-ip",
                                                    "" + host,
                                                    "--staking-port",
                                                    "" + stakingPort_1,
                                                    "--http-host",
                                                    "0.0.0.0",
                                                    "--http-port",
                                                    "" + httpPort_1,
                                                    "--staking-tls-cert-file",
                                                    "/staking/" + v + ".crt",
                                                    "--staking-tls-key-file",
                                                    "/staking/" + v + ".key"
                                                ], blsKeyArg);
                                                tarFileName = path_1.default.join(keysDir, v + ".tar");
                                                key = tar_1.default
                                                    .c({ cwd: tempKeysDir, prefix: "./staking" }, fs_1.default.readdirSync(tempKeysDir))
                                                    .pipe(fs_1.default.createWriteStream(tarFileName));
                                                return [4 /*yield*/, new Promise(function (fulfill) { return key.on("finish", fulfill); })];
                                            case 2:
                                                _a.sent();
                                                shelljs_1.default.rm("-rf", tempKeysDir);
                                                return [4 /*yield*/, docker.createContainer({
                                                        Image: "avaplatform/avalanchego:" + config.release,
                                                        name: name_1,
                                                        Cmd: cmd,
                                                        Tty: true,
                                                        ExposedPorts: exposedPorts_1,
                                                        HostConfig: {
                                                            AutoRemove: true,
                                                            CpusetCpus: affin_1.join(","),
                                                            Ulimits: [{ Name: "nofile", Soft: 65536, Hard: 65536 }],
                                                            PortBindings: portBindings_1,
                                                            Binds: [path_1.default.join(workDir_1, v) + ":/root/.avalanchego:"],
                                                        },
                                                    })];
                                            case 3:
                                                c = _a.sent();
                                                /* eslint-enable @typescript-eslint/naming-convention */
                                                return [4 /*yield*/, c.putArchive(tarFileName, {
                                                        path: "/",
                                                    })];
                                            case 4:
                                                /* eslint-enable @typescript-eslint/naming-convention */
                                                _a.sent();
                                                return [4 /*yield*/, c.start().then(function () {
                                                        log.write("started validator " + v + "\n");
                                                    })];
                                            case 5:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); };
                                return [4 /*yield*/, runValidator()];
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
            // await Promise.all(pms);
            return [4 /*yield*/, sshConn.close()];
            case 7:
                // await Promise.all(pms);
                _c.sent();
                return [2 /*return*/, true];
        }
    });
}); };
exports.run = run;
var stop = function (config, id, nodeId, force, log) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, docker, h, containers, start, end, _loop_2, i;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, getDocker(config, id, log)];
            case 1:
                _a = _b.sent(), docker = _a.docker, h = _a.h;
                return [4 /*yield*/, docker.listContainers()];
            case 2:
                containers = (_b.sent()).reduce(function (a, e) {
                    a[e.Names[0]] = e.Id;
                    return a;
                }, {});
                start = 0;
                end = h.validators.length;
                if (nodeId) {
                    start = h.validators.findIndex(function (e) { return e === nodeId; });
                    if (start < 0) {
                        return [2 /*return*/, false];
                    }
                    end = start + 1;
                }
                _loop_2 = function (i) {
                    var v, name_2, cid, c, pm;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                v = h.validators[i];
                                name_2 = "a2v-" + v;
                                cid = containers["/" + name_2];
                                if (!cid) return [3 /*break*/, 2];
                                log.write((force ? "forced " : "") + "stopping validator " + v + "\n");
                                c = docker.getContainer(cid);
                                pm = (force ? c.remove({ force: true }) : c.stop()).then(function () {
                                    log.write("stopped validator " + v + "\n");
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
            // await Promise.all(pms);
            return [2 /*return*/, true];
        }
    });
}); };
exports.stop = stop;
var showValidators = function (config, id, nodeId, log) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, docker, h, containers, start, end, i, v, name_3, e, ports;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, getDocker(config, id, log)];
            case 1:
                _a = _b.sent(), docker = _a.docker, h = _a.h;
                return [4 /*yield*/, docker.listContainers({ all: true })];
            case 2:
                containers = (_b.sent()).reduce(function (a, e) {
                    a[e.Names[0]] = e;
                    return a;
                }, {});
                start = 0;
                end = h.validators.length;
                if (nodeId) {
                    start = h.validators.findIndex(function (e) { return e === nodeId; });
                    if (start < 0) {
                        return [2 /*return*/, false];
                    }
                    end = start + 1;
                }
                for (i = start; i < end; i++) {
                    v = h.validators[i];
                    name_3 = "a2v-" + v;
                    e = containers["/" + name_3];
                    if (e) {
                        ports = e.Ports.map(function (_e) { return _e.PrivatePort + "->" + _e.PublicPort; }).join(",");
                        log.write(v + ": id(" + e.Id + ") ports(" + ports + ") image(" + e.Image + ")\n");
                    }
                }
                return [2 /*return*/, true];
        }
    });
}); };
exports.showValidators = showValidators;
var buildImage = function (config, id, log) { return __awaiter(void 0, void 0, void 0, function () {
    var branch, dockerhubRepo, remote, gopath, workprefix, avalancheClone, tarDockerFile, tag, key, tarStream, docker;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                branch = config.release;
                dockerhubRepo = "avaplatform/avalanchego";
                remote = "https://github.com/ava-labs/avalanchego.git";
                gopath = "./.build_image_gopath";
                workprefix = path_1.default.join(gopath, "src", "github.com/ava-labs");
                shelljs_1.default.rm("-rf", workprefix);
                shelljs_1.default.mkdir("-p", workprefix);
                avalancheClone = path_1.default.join(workprefix, "avalanchego");
                shelljs_1.default.exec("git config --global credential.helper cache");
                shelljs_1.default.exec("git clone \"" + remote + "\" \"" + avalancheClone + "\" --depth=1 -b " + branch);
                shelljs_1.default.exec("sed -i 's/^.git$//g' '" + path_1.default.join(avalancheClone, ".dockerignore") + "'");
                shelljs_1.default.exec("sed -i 's/--platform=\\$BUILDPLATFORM //g' '" + path_1.default.join(avalancheClone, "Dockerfile") + "'");
                tarDockerFile = path_1.default.join(gopath, "avalanchego.tar");
                tag = dockerhubRepo + ":" + branch;
                log.write("Creating tar archive at " + tarDockerFile + "...\n");
                key = tar_1.default
                    .c({ cwd: avalancheClone }, ["."])
                    .pipe(fs_1.default.createWriteStream(tarDockerFile));
                return [4 /*yield*/, new Promise(function (fulfill) { return key.on("finish", fulfill); })];
            case 1:
                _a.sent();
                log.write("Tar created, reading into memory...\n");
                tarStream = fs_1.default.createReadStream(tarDockerFile);
                return [4 /*yield*/, getDocker(config, id, log)];
            case 2:
                docker = (_a.sent()).docker;
                log.write("Sending to Docker daemon...\n");
                return [4 /*yield*/, new Promise(function (resolve, reject) {
                        /* eslint-disable @typescript-eslint/naming-convention */
                        void docker.buildImage(tarStream, { t: tag, buildargs: { GO_VERSION: "1.24.11" } }, function (err, output) {
                            /* eslint-enable @typescript-eslint/naming-convention */
                            if (err) {
                                log.write("Build error: " + err.message + "\n");
                                reject(err);
                                return;
                            }
                            if (output) {
                                output.pipe(new stream_1.default.Transform({
                                    transform: function (chunk, encoding, callback) {
                                        try {
                                            var data = JSON.parse(chunk.toString());
                                            if (data.stream) {
                                                this.push("docker: " + data.stream);
                                            }
                                            else if (data.error) {
                                                this.push("docker error: " + data.error + "\n");
                                            }
                                            else if (data.errorDetail) {
                                                this.push("docker errorDetail: " + JSON.stringify(data.errorDetail) + "\n");
                                            }
                                            else {
                                                this.push("docker (other): " + JSON.stringify(data) + "\n");
                                            }
                                        }
                                        catch (e) {
                                            this.push("docker (raw): " + chunk.toString());
                                        }
                                        callback();
                                    },
                                })).pipe(process.stdout);
                                output.on("end", resolve);
                                output.on("error", reject);
                            }
                            else {
                                reject(new Error("No output stream from buildImage"));
                            }
                        });
                    })];
            case 3:
                _a.sent();
                log.write("Finished building image " + tag + ".\n");
                return [2 /*return*/];
        }
    });
}); };
exports.buildImage = buildImage;
var genKey = function (prefix, nodeId, log) {
    if (!shelljs_1.default.which("openssl")) {
        throw new Error("`openssl` is required by this command");
    }
    var keyFile = path_1.default.join(prefix, nodeId + ".key");
    var crtFile = path_1.default.join(prefix, nodeId + ".crt");
    shelljs_1.default.exec("openssl req -x509 -nodes -newkey rsa:4096 -keyout " + keyFile + " -out " + crtFile + " -days 3650 -subj '/'");
    log.write("generated " + keyFile + " and " + crtFile + "\n");
};
exports.genKey = genKey;
var showImages = function (config, id, log) { return __awaiter(void 0, void 0, void 0, function () {
    var docker;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, getDocker(config, id, log)];
            case 1:
                docker = (_a.sent()).docker;
                return [4 /*yield*/, docker.listImages({ all: true })];
            case 2:
                (_a.sent())
                    .filter(function (e) { return e.RepoTags && e.RepoTags[0] && /avaplatform\/avalanchego:.*/.exec(e.RepoTags[0]); })
                    .forEach(function (e) {
                    log.write(e.RepoTags[0] + ": id(" + e.Id + ")\n");
                });
                return [2 /*return*/];
        }
    });
}); };
exports.showImages = showImages;
var rmImage = function (config, id, imageTag, log) { return __awaiter(void 0, void 0, void 0, function () {
    var docker, patt, pms;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, getDocker(config, id, log)];
            case 1:
                docker = (_a.sent()).docker;
                patt = /avaplatform\/avalanchego:(.*)/;
                pms = [];
                return [4 /*yield*/, docker.listImages({ all: true })];
            case 2:
                (_a.sent()).forEach(function (e) {
                    if (!e.RepoTags || !e.RepoTags[0])
                        return;
                    var m = patt.exec(e.RepoTags[0]);
                    if (m == null)
                        return;
                    if (m[1] === imageTag) {
                        pms.push(docker.getImage(e.Id).remove());
                        log.write("removed " + e.RepoTags[0] + "\n");
                    }
                });
                return [4 /*yield*/, Promise.all(pms)];
            case 3:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.rmImage = rmImage;
var prune = function (config, id, log) { return __awaiter(void 0, void 0, void 0, function () {
    var docker, prunedContainers, prunedImages;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, getDocker(config, id, log)];
            case 1:
                docker = (_a.sent()).docker;
                return [4 /*yield*/, docker.pruneContainers()];
            case 2:
                prunedContainers = (_a.sent()).ContainersDeleted;
                if (prunedContainers) {
                    prunedContainers.forEach(function (e) { return log.write("pruned container " + e + "\n"); });
                }
                else {
                    log.write("no containers are pruned\n");
                }
                return [4 /*yield*/, docker.pruneImages()];
            case 3:
                prunedImages = (_a.sent()).ImagesDeleted;
                if (prunedImages) {
                    prunedImages.forEach(function (e) {
                        return log.write("pruned image (" + e.Deleted + ", " + e.Untagged + ")\n");
                    });
                }
                else {
                    log.write("no images are pruned\n");
                }
                return [2 /*return*/];
        }
    });
}); };
exports.prune = prune;
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
var main = function () {
    var getConfig = function (profile) {
        var config = new ts_json_validator_1.TsjsonParser(exports.validatorsSchema).parse(strip_json_comments_1.default(fs_1.default.readFileSync(profile).toString()));
        var basePath = path_1.default.dirname(profile);
        if (!path_1.default.isAbsolute(config.keysDir))
            config.keysDir = path_1.default.join(basePath, config.keysDir);
        if (config.stakingKeysDir && !path_1.default.isAbsolute(config.stakingKeysDir))
            config.stakingKeysDir = path_1.default.join(basePath, config.stakingKeysDir);
        for (var id in config.hosts) {
            var h = config.hosts[id];
            if (!path_1.default.isAbsolute(h.privateKeyFile))
                config.hosts[id].privateKeyFile = path_1.default.join(basePath, h.privateKeyFile);
        }
        return config;
    };
    /* eslint-disable @typescript-eslint/no-unsafe-call */
    /* eslint-disable @typescript-eslint/no-unsafe-return */
    var getHostId = function (y) {
        return y.positional("host-id", {
            type: "string",
            describe: "Host ID (empty to include all hosts)",
        });
    };
    var getHostNodeId = function (y) {
        return getHostId(y).positional("node-id", {
            type: "string",
            describe: "Node ID (empty to include all validators)",
        });
    };
    var getHostNodeId2 = function (y) {
        return getHostNodeId(y).option("force", {
            alias: "f",
            type: "boolean",
            default: false,
        });
    };
    var getNodeId = function (y) {
        return y.positional("node-id", {
            type: "string",
            describe: "Node ID (prefix for the .crt and .key files)",
        });
    };
    var getHostImageId = function (y) {
        return getHostId(y).positional("image-tag", {
            type: "string",
            describe: 'Image Tag (the same thing used in "release" field, e.g. v1.4.0)',
        });
    };
    /* eslint-enable @typescript-eslint/no-unsafe-call */
    /* eslint-enable @typescript-eslint/no-unsafe-return */
    var log = process.stdout;
    var die = function (s) {
        process.stderr.write(s + "\n");
        process.exit(1);
    };
    var wrapHandler = function (fn) {
        return function (_argv) { return __awaiter(void 0, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, fn(_argv)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _a.sent();
                        die("error: " + e_1.message);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
    };
    yargs_1.default(helpers_1.hideBin(process.argv))
        .usage("        ___\n  ___ _|_  |  __\n / _ `/ __/ |/ /\n \\_,_/____/___/    Avalanche Automated Validators")
        .command("run [host-id] [node-id]", "start the container(s) on the given host", getHostNodeId, wrapHandler(function (argv) { return __awaiter(void 0, void 0, void 0, function () {
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
                    return [4 /*yield*/, exports.run(config, id, null, log)];
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
                    return [4 /*yield*/, exports.run(config, argv.hostId, argv.nodeId, log)];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    }); }))
        .command("stop [host-id] [node-id] [--force]", "stop the container(s) on the given host", getHostNodeId2, wrapHandler(function (argv) { return __awaiter(void 0, void 0, void 0, function () {
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
                    return [4 /*yield*/, exports.stop(config, id, null, argv.force, log)];
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
                    return [4 /*yield*/, exports.stop(config, argv.hostId, argv.nodeId, argv.force, log)];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    }); }))
        .command("buildImage [host-id]", "build avalanchego image on the given host", getHostId, wrapHandler(function (argv) { return __awaiter(void 0, void 0, void 0, function () {
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
                    return [4 /*yield*/, exports.buildImage(config, id, log)];
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
                    return [4 /*yield*/, exports.buildImage(config, argv.hostId, log)];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    }); }))
        .command("show [host-id] [node-id]", "show validators on the given host", getHostNodeId, wrapHandler(function (argv) { return __awaiter(void 0, void 0, void 0, function () {
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
                    return [4 /*yield*/, exports.showValidators(config, id, null, log)];
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
                    return [4 /*yield*/, exports.showValidators(config, argv.hostId, argv.nodeId, log)];
                case 6:
                    if (!(_c.sent())) {
                        die("show: node id \"" + argv.nodeId + "\" not found");
                    }
                    _c.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    }); }))
        .command("showImage [host-id]", "show avalanchego images on the given host", getHostId, wrapHandler(function (argv) { return __awaiter(void 0, void 0, void 0, function () {
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
                    return [4 /*yield*/, exports.showImages(config, id, log)];
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
                        die("showImage: host id \"" + argv.hostId + "\" not found");
                    }
                    return [4 /*yield*/, exports.showImages(config, argv.hostId, log)];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    }); }))
        .command("rmImage <host-id> <image-tag>", "remove the specified avalanchego image on the given host", getHostImageId, wrapHandler(function (argv) { return __awaiter(void 0, void 0, void 0, function () {
        var config;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    config = getConfig(argv.profile);
                    if (!(argv.hostId in config.hosts)) {
                        die("rmImage: host id \"" + argv.hostId + "\" not found");
                    }
                    return [4 /*yield*/, exports.rmImage(config, argv.hostId, argv.imageTag, log)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }))
        .command("genKey <node-id>", "randomly generate a new <node-id>.key and <node-id>.crt", getNodeId, wrapHandler(function (argv) { return __awaiter(void 0, void 0, void 0, function () {
        var keysDir, config;
        return __generator(this, function (_a) {
            keysDir = "./";
            try {
                config = getConfig(argv.profile);
                keysDir = config.keysDir;
            }
            catch (e) {
                log.write("profile file not found, generating to the current working directory\n");
            }
            exports.genKey(keysDir, argv.nodeId, log);
            return [2 /*return*/, Promise.resolve()];
        });
    }); }))
        .command("prune [host-id]", "prune unused containers and images on the given host", getHostId, wrapHandler(function (argv) { return __awaiter(void 0, void 0, void 0, function () {
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
                    return [4 /*yield*/, exports.prune(config, id, log)];
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
                        die("showImage: host id \"" + argv.hostId + "\" not found");
                    }
                    return [4 /*yield*/, exports.prune(config, argv.hostId, log)];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    }); }))
        .option("profile", {
        alias: "c",
        type: "string",
        default: "./validators.json",
        description: "JSON file that describes all validators",
    })
        .strict()
        .showHelpOnFail(true)
        .demandCommand()
        .wrap(yargs_1.default.terminalWidth())
        .version()
        .parse();
};
/* eslint-enable @typescript-eslint/no-unsafe-member-access */
/* eslint-enable @typescript-eslint/no-misused-promises */
/* eslint-enable @typescript-eslint/restrict-template-expressions */
if (require.main === module) {
    main();
}
//# sourceMappingURL=a2v.js.map