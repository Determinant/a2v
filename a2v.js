#!/usr/bin/env -S npx ts-node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
Object.defineProperty(exports, "__esModule", { value: true });
var Docker = require("dockerode");
var SSHPromise = require("ssh2-promise");
var sshModem = require('docker-modem/lib/ssh');
var fs = __importStar(require("fs"));
var tar = __importStar(require("tar"));
function startAll() {
    return __awaiter(this, void 0, void 0, function () {
        var config, _i, _a, h, sshConfig, docker, containers, _b, sshConn, workDir, _loop_1, i;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    config = JSON.parse(fs.readFileSync('./validators.json').toString());
                    _i = 0, _a = config.hosts;
                    _c.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 8];
                    h = _a[_i];
                    console.log("connecting to " + h.host + "...");
                    sshConfig = {
                        host: h.host,
                        username: h.username,
                        privateKey: fs.readFileSync(h.privateKeyFile)
                    };
                    docker = new Docker({
                        agent: sshModem(sshConfig)
                    });
                    _b = Set.bind;
                    return [4 /*yield*/, docker.listContainers()];
                case 2:
                    containers = new (_b.apply(Set, [void 0, (_c.sent()).map(function (e) { return e.Names[0]; })]))();
                    sshConn = new SSHPromise(sshConfig);
                    workDir = config.workDir;
                    _loop_1 = function (i) {
                        var v, name_1, stakingPort, httpPort, affin, cpuPerNode, cpuStride, j, exposedPorts, portBindings, cmd, key_1, c;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    v = h.validators[i];
                                    name_1 = "a2v-" + v;
                                    if (!containers.has('/' + name_1)) return [3 /*break*/, 1];
                                    console.log("validator " + v + " already exists");
                                    return [3 /*break*/, 7];
                                case 1:
                                    stakingPort = config.baseStakingPort + i * 2;
                                    httpPort = config.baseHttpPort + i * 2;
                                    affin = [];
                                    cpuPerNode = h.cpuPerNode;
                                    cpuStride = h.cpuStride;
                                    for (j = i * cpuStride; j < i * cpuStride + cpuPerNode; j++) {
                                        affin.push(j % h.ncpu);
                                    }
                                    exposedPorts = {};
                                    portBindings = {};
                                    exposedPorts[stakingPort + "/tcp"] = {};
                                    exposedPorts[httpPort + "/tcp"] = {};
                                    portBindings[stakingPort + "/tcp"] = [{ HostPort: "" + stakingPort }];
                                    portBindings[httpPort + "/tcp"] = [{ HostPort: "" + httpPort }];
                                    return [4 /*yield*/, sshConn.exec("mkdir -p " + workDir + "/" + v + "/")];
                                case 2:
                                    _d.sent();
                                    console.log("starting validator " + v + " on core " + affin.join(','));
                                    cmd = [
                                        './build/avalanchego',
                                        '--public-ip',
                                        "" + h.host,
                                        '--staking-port',
                                        "" + stakingPort,
                                        '--http-host', '0.0.0.0',
                                        '--http-port',
                                        "" + httpPort,
                                        '--staking-tls-cert-file',
                                        "/staking/" + v + ".crt",
                                        '--staking-tls-key-file',
                                        "/staking/" + v + ".key",
                                    ];
                                    key_1 = tar.c({ cwd: './keys', prefix: './staking' }, [
                                        "./" + v + ".crt",
                                        "./" + v + ".key",
                                    ]).pipe(fs.createWriteStream("./keys/" + v + ".tar"));
                                    return [4 /*yield*/, new Promise(function (fulfill) { return key_1.on("finish", fulfill); })];
                                case 3:
                                    _d.sent();
                                    return [4 /*yield*/, docker.createContainer({
                                            Image: "avaplatform/avalanchego:" + config.release,
                                            name: name_1,
                                            Tty: true,
                                            Cmd: cmd,
                                            ExposedPorts: exposedPorts,
                                            HostConfig: {
                                                AutoRemove: true,
                                                CpusetCpus: affin.join(','),
                                                Ulimits: [{ Name: "nofile", Soft: 65536, Hard: 65536 }],
                                                PortBindings: portBindings,
                                                Binds: [workDir + "/" + v + "/:/root/.avalanchego:"],
                                            }
                                        })];
                                case 4:
                                    c = _d.sent();
                                    return [4 /*yield*/, c.putArchive("./keys/" + v + ".tar", { path: '/' })];
                                case 5:
                                    _d.sent();
                                    return [4 /*yield*/, c.start({
                                            Detach: true,
                                        })];
                                case 6:
                                    _d.sent();
                                    _d.label = 7;
                                case 7: return [2 /*return*/];
                            }
                        });
                    };
                    i = 0;
                    _c.label = 3;
                case 3:
                    if (!(i < h.validators.length)) return [3 /*break*/, 6];
                    return [5 /*yield**/, _loop_1(i)];
                case 4:
                    _c.sent();
                    _c.label = 5;
                case 5:
                    i++;
                    return [3 /*break*/, 3];
                case 6:
                    sshConn.close();
                    _c.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 1];
                case 8: return [2 /*return*/];
            }
        });
    });
}
startAll();
//# sourceMappingURL=a2v.js.map