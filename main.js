import axios from 'axios';
import axiosRetry from 'axios-retry';
import WebSocket from 'ws';
import crypto from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import fs from 'fs';
import banner from './utils/banner.js';
import log from './utils/logger.js';
import readline from 'readline';



const headers = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A_Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
}

function readFile(pathFile) {
    try {
        const datas = fs.readFileSync(pathFile, 'utf8')
            .split('\n')
            .map(data => data.trim())
            .filter(data => data.length > 0);
        return datas;
    } catch (error) {
        log.error(`Error reading file: ${error.message}`);
        return [];
    }
}

const newAgent = (proxy = null) => {
    if (proxy && proxy.startsWith('http://')) {
        return new HttpsProxyAgent(proxy);
    } else if (proxy && (proxy.startsWith('socks4://') || proxy.startsWith('socks5://'))) {
        return new SocksProxyAgent(proxy);
    }
    return null;
};

class WebSocketClient {
    constructor(authToken, address, proxy, index) {
        this.url = `wss://apitn.openledger.xyz/ws/v1/orch?authToken=${authToken}`;
        this.ws = null;
        this.reconnect = true
        this.index = index
        this.intervalId = null
        this.registered = false;
        this.proxy = proxy;
        this.address = address;
        this.identity = btoa(address);
        this.capacity = generateRandomCapacity();
        this.id = crypto.randomUUID();
        this.heartbeat = {
            "message": {
                "Worker": {
                    "Identity": this.identity,
                    "ownerAddress": this.address,
                    "type": "LWEXT",
                    "Host": "chrome-extension://ekbbplmjjgoobhdlffmgeokalelnmjjc"
                },
                Capacity: this.capacity
            },
            "msgType": "HEARTBEAT",
            "workerType": "LWEXT",
            "workerID": this.identity
        };

        this.regWorkerID = {
            "workerID": this.identity,
            "msgType": "REGISTER",
            "workerType": "LWEXT",
            "message": {
                "id": this.id,
                "type": "REGISTER",
                "worker": {
                    "host": "chrome-extension://ekbbplmjjgoobhdlffmgeokalelnmjjc",
                    "identity": this.identity,
                    "ownerAddress": this.address,
                    "type": "LWEXT"
                }
            }
        };
    }

    loadJobData = async (event) => {
        if (event && event.data) {
            const message = JSON.parse(event.data);

            if (message?.MsgType == "JOB") {
                this.ws.send(
                    JSON.stringify({
                        workerID: this.identity,
                        msgType: "JOB_ASSIGNED",
                        workerType: "LWEXT",
                        message: {
                            Status: true,
                            Ref: message?.UUID,
                        },
                    })
                );
            }
        }
    };

    connect() {
        const agent = newAgent(this.proxy);
        const options = agent ? { agent } : {};
        this.ws = new WebSocket(this.url, options);

        this.ws.on('open', (type) => {
            log.info(`账户 ${this.index} WebSocket 连接已建立`);
            if (!this.registered) {
                log.info(`正在为账户 ${this.index} 注册工作节点...`);
                this.sendMessage(this.regWorkerID);
                this.registered = true;
            }
            this.intervalId = setInterval(() => {
                log.info(`账户 ${this.index} 发送心跳包...`);
                this.sendMessage(this.heartbeat)
            }, 30 * 1000);
        });

        this.ws.on('message', (event) => {
            const message = JSON.parse(event);
            log.info(`账户 ${this.index} 收到消息:`, message);
            if (message && message.data) {
                if (message?.data?.MsgType !== "JOB") {
                    this.sendMessage({
                        type: "WEBSOCKET_RESPONSE",
                        data: message.data,
                    });
                } else {
                    this.loadJobData(message);
                }
            }
        });

        this.ws.on('error', (error) => {
            log.error(`账户 ${this.index} WebSocket 错误:`, error.message || error);
        });

        this.ws.on('close', () => {
            clearInterval(this.intervalId);
            if (this.reconnect) {
                log.warn(`账户 ${this.index} WebSocket 连接已断开，正在重新连接...`);
                setTimeout(() => this.connect("reconnect"), 5000);
            } else {
                log.warn(`账户 ${this.index} WebSocket 连接已关闭`);
            }
        });
    }

    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            log.error(`WebSocket connection is not open for Account ${this.index}, cannot send message.`);
        }
    }

    close() {
        if (this.ws) {
            this.ws.close();
            this.reconnect = false
        }
    }
}

axiosRetry(axios, {
    retries: 3,
    retryDelay: (retryCount) => retryCount * 1000,
    retryCondition: (error) => error.response?.status >= 400 || error.code === 'ECONNABORTED'
});

async function generateToken(data, proxy) {
    const agent = newAgent(proxy);
    try {
        const response = await axios.post('https://apitn.openledger.xyz/api/v1/auth/generate_token', data, {
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            agent: agent
        });
        return response.data.data;
    } catch (error) {
        return null;
    }
}

async function getUserInfo(token, proxy, index) {
    const agent = newAgent(proxy);
    try {
        const response = await axios.get('https://rewardstn.openledger.xyz/api/v1/reward_realtime', {
            headers: {
                ...headers,
                'Authorization': 'Bearer ' + token
            },
            agent: agent
        });
        const { total_heartbeats } = response?.data?.data[0] || { total_heartbeats: '0' };
        log.info(`账户 ${index} 今日获得积分:`, { 积分: total_heartbeats });

        return response.data.data;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            log.error('认证失败，令牌无效或已过期');
            return 'unauthorized';
        };

        log.error('获取用户信息失败:', error.message || error);
        return null;
    }
}

async function getClaimDetails(token, proxy, index) {
    const agent = newAgent(proxy);
    try {
        const response = await axios.get('https://rewardstn.openledger.xyz/api/v1/claim_details', {
            headers: {
                ...headers,
                'Authorization': 'Bearer ' + token
            },
            agent: agent
        });
        const { tier, dailyPoint, claimed, nextClaim = '未领取' } = response?.data?.data || {};
        log.info(`账户 ${index} 详情:`, { 等级: tier, 每日积分: dailyPoint, 已领取: claimed, 下次领取: nextClaim });
        return response.data.data;
    } catch (error) {
        log.error('获取领取详情失败:', error.message || error);
        return null;
    }
}

async function claimRewards(token, proxy, index) {
    const agent = newAgent(proxy);
    try {
        const response = await axios.get('https://rewardstn.openledger.xyz/api/v1/claim_reward', {
            headers: {
                ...headers,
                'Authorization': 'Bearer ' + token
            },
            agent: agent
        });
        log.info(`账户 ${index} 每日奖励已领取:`, response.data.data);
        return response.data.data;
    } catch (error) {
        log.error('领取每日奖励失败:', error.message || error);
        return null;
    }
}

function generateRandomCapacity() {
    function getRandomFloat(min, max, decimals = 2) {
        return (Math.random() * (max - min) + min).toFixed(decimals);
    }

    return {
        AvailableMemory: parseFloat(getRandomFloat(10, 64)),
        AvailableStorage: getRandomFloat(10, 500),
        AvailableGPU: '',
        AvailableModels: []
    };
}

// 创建readline接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 提示用户输入
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// 主函数
const main = async () => {
    log.info(banner);
    
    console.log("\n请输入钱包地址，多个地址用逗号分隔：");
    const walletsInput = await question("钱包地址: ");
    const wallets = walletsInput.split(',').map(w => w.trim()).filter(w => w);

    if (wallets.length === 0) {
        log.error('未输入钱包地址');
        rl.close();
        return;
    }

    console.log("\n请输入代理地址，多个代理用逗号分隔（直接回车则不使用代理）：");
    console.log("格式: protocol://user:password@ip:port 或 protocol://ip:port");
    const proxiesInput = await question("代理地址: ");
    const proxies = proxiesInput ? proxiesInput.split(',').map(p => p.trim()).filter(p => p) : [];

    log.info(`开始运行程序，共有账户数量: ${wallets.length}`);

    const accountsProcessing = wallets.map(async (address, index) => {
        const proxy = proxies.length > 0 ? proxies[index % proxies.length] : null;
        let isConnected = false;

        log.info(`正在处理账户 ${index + 1}，使用代理: ${proxy || '不使用代理'}`);

        let claimDetailsInterval;
        let userInfoInterval;

        while (!isConnected) {
            try {
                let response = await generateToken({ address }, proxy);
                while (!response && !response.token) {
                    response = await generateToken({ address }, proxy);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }

                const token = response.token;
                log.info(`账户 ${index + 1} 登录成功:`, token.slice(0, 36) + "-" + token.slice(-24));
                log.info(`正在获取账户 ${index + 1} 的用户信息和领取详情...`);
                const claimDaily = await getClaimDetails(token, proxy, index + 1);
                if (claimDaily && !claimDaily.claimed) {
                    log.info(`正在为账户 ${index + 1} 领取每日奖励...`);
                    await claimRewards(token, proxy, index + 1);
                }
                await getUserInfo(token, proxy, index + 1)

                const socket = new WebSocketClient(token, address, proxy, index + 1);
                socket.connect();
                isConnected = true;

                userInfoInterval = setInterval(async () => {
                    log.info(`正在获取账户 ${index + 1} 今日获得的积分...`);
                    const user = await getUserInfo(token, proxy, index + 1);

                    if (user === 'unauthorized') {
                        log.info(`账户 ${index + 1} 认证失败：令牌无效或已过期，正在重新连接...`);

                        isConnected = false;
                        socket.close();
                        clearInterval(userInfoInterval);
                        clearInterval(claimDetailsInterval);
                    }
                }, 9 * 60 * 1000);

                claimDetailsInterval = setInterval(async () => {
                    try {
                        log.info(`正在检查账户 ${index + 1} 的每日奖励...`)
                        const claimDetails = await getClaimDetails(token, proxy, index + 1);

                        if (claimDetails && !claimDetails.claimed) {
                            log.info(`正在为账户 ${index + 1} 领取每日奖励...`);
                            await claimRewards(token, proxy, index + 1);
                        }
                    } catch (error) {
                        log.error(`获取账户 ${index + 1} 领取详情失败: ${error.message || '未知错误'}`);
                    }
                }, 60 * 60 * 1000);

            } catch (error) {
                log.error(`账户 ${index + 1} 启动 WebSocket 客户端失败:`, error.message || '未知错误');
                isConnected = false;

                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        process.on('SIGINT', () => {
            log.warn(`收到 SIGINT 信号，正在清理并退出程序...`);
            clearInterval(claimDetailsInterval);
            clearInterval(userInfoInterval);
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            log.warn(`收到 SIGTERM 信号，正在清理并退出程序...`);
            clearInterval(claimDetailsInterval);
            clearInterval(userInfoInterval);
            process.exit(0);
        });

    });

    await Promise.all(accountsProcessing);
    rl.close();
};

// 处理程序退出
process.on('SIGINT', () => {
    log.warn(`收到 SIGINT 信号，正在清理并退出程序...`);
    rl.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    log.warn(`收到 SIGTERM 信号，正在清理并退出程序...`);
    rl.close();
    process.exit(0);
});
    });

    await Promise.all(accountsProcessing);
};

//run
//运行主程序
main();
