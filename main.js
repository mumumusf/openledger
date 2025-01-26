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

// 设置请求头
const headers = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A_Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Origin": "chrome-extension://ekbbplmjjgoobhdlffmgeokalelnmjjc"
}

// 读取文件内容的工具函数
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

// 创建代理代理
const newAgent = (proxy = null) => {
    if (!proxy) return null;
    
    try {
        // 解析代理字符串
        let [host, port, username, password] = proxy.split(':');
        if (!host || !port) {
            log.error('代理格式错误，需要包含主机和端口');
            return null;
        }

        // 构建代理URL
        let proxyUrl;
        if (username && password) {
            proxyUrl = `http://${username}:${password}@${host}:${port}`;
        } else {
            proxyUrl = `http://${host}:${port}`;
        }

        log.info(`使用代理: ${proxyUrl}`);
        return new HttpsProxyAgent(proxyUrl);
    } catch (error) {
        log.error('代理设置错误:', error.message);
        return null;
    }
};

// WebSocket客户端类
class WebSocketClient {
    constructor(authToken, address, proxy, index) {
        // 初始化WebSocket连接URL和相关参数
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
        
        // 心跳包数据
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

        // 注册工作节点数据
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

    // 处理任务数据
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

    // 建立WebSocket连接
    connect() {
        const agent = newAgent(this.proxy);
        const options = agent ? { agent } : {};
        this.ws = new WebSocket(this.url, options);

        // 连接成功时的处理
        this.ws.on('open', (type) => {
            log.info(`账户 ${this.index} WebSocket连接成功`);
            if (!this.registered) {
                log.info(`正在注册账户 ${this.index} 的工作节点...`);
                this.sendMessage(this.regWorkerID);
                this.registered = true;
            }
            // 设置定时发送心跳包
            this.intervalId = setInterval(() => {
                log.info(`正在发送账户 ${this.index} 的心跳包...`);
                this.sendMessage(this.heartbeat)
            }, 30 * 1000);
        });

        // 处理接收到的消息
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

        // 处理错误
        this.ws.on('error', (error) => {
            log.error(`账户 ${this.index} WebSocket错误:`, error.message || error);
        });

        // 处理连接关闭
        this.ws.on('close', () => {
            clearInterval(this.intervalId);
            if (this.reconnect) {
                log.warn(`账户 ${this.index} WebSocket连接已断开，正在重新连接...`);
                setTimeout(() => this.connect("reconnect"), 5000); // 5秒后重连
            } else {
                log.warn(`账户 ${this.index} WebSocket连接已关闭`);
            }
        });
    }

    // 发送消息
    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            log.error(`账户 ${this.index} WebSocket连接未打开，无法发送消息`);
        }
    }

    // 关闭连接
    close() {
        if (this.ws) {
            this.ws.close();
            this.reconnect = false
        }
    }
}

// 配置axios重试
axiosRetry(axios, {
    retries: 3,
    retryDelay: (retryCount) => retryCount * 1000,
    retryCondition: (error) => error.response?.status >= 400 || error.code === 'ECONNABORTED'
});

// 生成认证令牌
async function generateToken(data, proxy) {
    const agent = newAgent(proxy);
    try {
        const response = await axios.post('https://apitn.openledger.xyz/api/v1/auth/generate_token', data, {
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            httpsAgent: agent,
            httpAgent: agent
        });
        
        if (response.data && response.data.data) {
            return response.data.data;
        } else {
            log.error('生成令牌响应格式错误:', response.data);
            return null;
        }
    } catch (error) {
        if (error.response) {
            // 服务器响应错误
            log.error(`生成令牌失败 - 状态码: ${error.response.status}`);
            log.error('错误详情:', error.response.data);
        } else if (error.request) {
            // 请求发送失败
            log.error('生成令牌请求失败 - 无法连接到服务器');
        } else {
            // 其他错误
            log.error('生成令牌错误:', error.message);
        }
        return null;
    }
}

// 获取用户信息
async function getUserInfo(token, proxy, index) {
    const agent = newAgent(proxy);
    try {
        const response = await axios.get('https://rewardstn.openledger.xyz/api/v1/reward_realtime', {
            headers: {
                ...headers,
                'Authorization': 'Bearer ' + token
            },
            httpsAgent: agent,
            httpAgent: agent
        });
        const { total_heartbeats } = response?.data?.data[0] || { total_heartbeats: '0' };
        log.info(`账户 ${index} 今日已获得积分:`, { 积分: total_heartbeats });

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

// 获取奖励领取详情
async function getClaimDetails(token, proxy, index) {
    const agent = newAgent(proxy);
    try {
        const response = await axios.get('https://rewardstn.openledger.xyz/api/v1/claim_details', {
            headers: {
                ...headers,
                'Authorization': 'Bearer ' + token
            },
            httpsAgent: agent,
            httpAgent: agent
        });
        const { tier, dailyPoint, claimed, nextClaim = '未领取' } = response?.data?.data || {};
        log.info(`账户 ${index} 详情:`, { 等级: tier, 每日积分: dailyPoint, 已领取: claimed, 下次领取: nextClaim });
        return response.data.data;
    } catch (error) {
        log.error('获取奖励详情失败:', error.message || error);
        return null;
    }
}

// 领取每日奖励
async function claimRewards(token, proxy, index) {
    const agent = newAgent(proxy);
    try {
        const response = await axios.get('https://rewardstn.openledger.xyz/api/v1/claim_reward', {
            headers: {
                ...headers,
                'Authorization': 'Bearer ' + token
            },
            httpsAgent: agent,
            httpAgent: agent
        });
        log.info(`账户 ${index} 每日奖励领取成功:`, response.data.data);
        return response.data.data;
    } catch (error) {
        log.error('领取每日奖励失败:', error.message || error);
        return null;
    }
}

// 生成随机容量数据
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

// 读取用户输入
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            resolve(answer);
        });
    });
}

// 主函数
const main = async () => {
    log.info(banner);
    
    let wallets = [];
    let proxies = [];
    
    // 手动输入配置
    console.log('\n请输入钱包地址(输入空行结束):');
    while (true) {
        const address = await question('钱包地址: ');
        if (!address) break;
        wallets.push(address);
    }
    
    if (wallets.length === 0) {
        log.error('未输入任何钱包地址！');
        rl.close();
        return;
    }
    
    console.log('\n是否使用代理？(y/n): ');
    const useProxy = await question('');
    
    if (useProxy.toLowerCase() === 'y') {
        console.log('\n请输入代理地址(格式: ip:port:username:password, 输入空行结束):');
        while (true) {
            const proxy = await question('代理地址: ');
            if (!proxy) break;
            proxies.push(proxy);
        }
    }

    log.info(`开始运行程序，共有账户数量: ${wallets.length}`);

    // 处理所有账户
    const accountsProcessing = wallets.map(async (address, index) => {
        const proxy = proxies.length > 0 ? proxies[index % proxies.length] : null;
        let isConnected = false;

        log.info(`正在处理账户 ${index + 1}, 使用代理: ${proxy || '不使用代理'}`);

        let claimDetailsInterval;
        let userInfoInterval;

        // 尝试连接直到成功
        while (!isConnected) {
            try {
                let response = await generateToken({ address }, proxy);
                while (!response || !response.token) {
                    log.error(`账户 ${index + 1} 生成令牌失败，正在重试...`)
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    response = await generateToken({ address }, proxy);
                }

                const token = response.token;

                // 登录成功后的操作
                log.info(`账户 ${index + 1} 登录成功:`, token.slice(0, 36) + "-" + token.slice(-24));
                log.info(`正在获取账户 ${index + 1} 的信息和奖励详情...`);
                const claimDaily = await getClaimDetails(token, proxy, index + 1);
                if (claimDaily && !claimDaily.claimed) {
                    log.info(`正在尝试领取账户 ${index + 1} 的每日奖励...`);
                    await claimRewards(token, proxy, index + 1);
                }
                await getUserInfo(token, proxy, index + 1)

                // 创建WebSocket连接
                const socket = new WebSocketClient(token, address, proxy, index + 1);
                socket.connect();
                isConnected = true;

                // 设置定时获取用户信息
                userInfoInterval = setInterval(async () => {
                    log.info(`正在获取账户 ${index + 1} 今日获得的积分...`);
                    const user = await getUserInfo(token, proxy, index + 1);

                    if (user === 'unauthorized') {
                        log.info(`账户 ${index + 1} 令牌已失效，正在重新连接...`);

                        isConnected = false;
                        socket.close();
                        clearInterval(userInfoInterval);
                        clearInterval(claimDetailsInterval);
                    }
                }, 9 * 60 * 1000); // 每9分钟检查一次，避免领取奖励时出现429错误

                // 设置定时检查奖励
                claimDetailsInterval = setInterval(async () => {
                    try {
                        log.info(`正在检查账户 ${index + 1} 的每日奖励...`)
                        const claimDetails = await getClaimDetails(token, proxy, index + 1);

                        if (claimDetails && !claimDetails.claimed) {
                            log.info(`正在尝试领取账户 ${index + 1} 的每日奖励...`);
                            await claimRewards(token, proxy, index + 1);
                        }
                    } catch (error) {
                        log.error(`获取账户 ${index + 1} 奖励详情失败: ${error.message || '未知错误'}`);
                    }
                }, 60 * 60 * 1000); // 每60分钟检查一次奖励

            } catch (error) {
                log.error(`账户 ${index + 1} 启动WebSocket客户端失败:`, error.message || '未知错误');
                isConnected = false;

                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        // 处理程序退出
        process.on('SIGINT', () => {
            log.warn(`收到SIGINT信号，正在清理并退出程序...`);
            clearInterval(claimDetailsInterval);
            clearInterval(userInfoInterval);
            rl.close();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            log.warn(`收到SIGTERM信号，正在清理并退出程序...`);
            clearInterval(claimDetailsInterval);
            clearInterval(userInfoInterval);
            rl.close();
            process.exit(0);
        });

    });

    await Promise.all(accountsProcessing);
    rl.close();
};

//运行程序
main();
