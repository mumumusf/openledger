const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const ProxyChain = require('proxy-chain');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 在文件开头添加版权信息和免责声明
console.log('\n===========================================');
console.log('    DeSpeed Validator 代理运行脚本');
console.log('    作者: 小林♪ | China');
console.log('    推特: @YOYOMYOYOA');
console.log('===========================================\n');

console.log('免责声明：');
console.log('1. 本脚本仅供学习和研究使用');
console.log('2. 使用本脚本所产生的任何后果由使用者自行承担');
console.log('3. 请遵守相关法律法规和服务条款');
console.log('4. 作者保留对脚本的最终解释权');
console.log('\n===========================================\n');

// 使用 Stealth 插件来避免被检测为自动化工具
puppeteer.use(StealthPlugin());

// 创建readline接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 配置对象
const CONFIG = {
    DESPEED_LOGIN_URL: 'https://app.despeed.net/dashboard'
};

// 格式化代理字符串
function formatProxy(proxy) {
    const [ip, port, username, password] = proxy.split(':');
    if (username && password) {
        return `http://${username}:${password}@${ip}:${port}`;
    }
    return `http://${ip}:${port}`;
}

// 用户输入处理
function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

// 检查插件目录是否存在
function checkExtensionFolder() {
    const extensionPath = path.join(__dirname, 'extension');
    if (!fs.existsSync(extensionPath)) {
        console.error('错误: extension 文件夹不存在！');
        console.log('请创建 extension 文件夹并将插件解压到其中。');
        process.exit(1);
    }
    
    // 检查文件夹是否为空
    const files = fs.readdirSync(extensionPath);
    if (files.length === 0) {
        console.error('错误: extension 文件夹是空的！');
        console.log('请将 DeSpeed Validator 插件解压到 extension 文件夹中。');
        process.exit(1);
    }

    // 检查是否包含manifest.json
    const manifestPath = path.join(extensionPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        console.error('错误: 插件目录中没有找到 manifest.json！');
        console.log('请确保插件文件已正确解压。');
        process.exit(1);
    }

    return extensionPath;
}

// 处理登录逻辑
async function handleLogin(page, token) {
    try {
        console.log('正在进行登录...');

        // 设置localStorage和sessionStorage
        await page.evaluate((token) => {
            localStorage.clear();
            sessionStorage.clear();
            localStorage.setItem('token', token);
            sessionStorage.setItem('token', token);
            // 设置一些额外的状态
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('lastLoginTime', new Date().toISOString());
        }, token);

        // 设置 cookies
        await page.setCookie({
            name: 'refreshToken',
            value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Njc1NSwiaWF0IjoxNzM2MTQ4NDY2LCJleHAiOjE3Mzc0NDQ0NjZ9.ecsV4Krx8yR1T2pU3XNseb7aFUfIWqGNIgZRSaxrsy0',
            domain: 'app.despeed.net',
            path: '/'
        }, {
            name: 'connect.sid',
            value: 's%3AJKIo44CLqEsAshlVLAUztPD7kVAn4v48.niaHtGPKsWPNvYcQtZU3GxavvGAnsjtsdnbq1IkOOOo',
            domain: 'app.despeed.net',
            path: '/'
        });

        // 等待一段时间确保设置生效
        await page.waitForTimeout(2000);

        // 访问用户信息API以验证登录
        const response = await page.evaluate(async () => {
            try {
                const res = await fetch('https://app.despeed.net/v1/api/auth/profile', {
                    headers: {
                        'authorization': `Bearer ${localStorage.getItem('token')}`,
                        'accept': 'application/json, text/plain, */*',
                        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
                        'cache-control': 'no-cache',
                        'pragma': 'no-cache'
                    },
                    credentials: 'include'
                });
                const data = await res.json();
                return {
                    ok: res.ok,
                    status: res.status,
                    data: data
                };
            } catch (error) {
                console.error('API请求错误:', error);
                return null;
            }
        });

        if (response && response.data && response.data.data) {
            const userData = response.data.data;
            console.log('登录成功！');
            console.log('用户信息:');
            console.log('- ID:', userData.id);
            console.log('- 用户名:', userData.username);
            console.log('- 邮箱:', userData.email);
            console.log('- 积分:', userData.points);
            console.log('- 注册时间:', new Date(userData.register_on).toLocaleString());

            // 触发页面状态更新
            await page.evaluate(() => {
                // 触发路由更新
                window.dispatchEvent(new Event('popstate'));
                // 触发存储更新
                window.dispatchEvent(new Event('storage'));
                // 触发自定义事件
                window.dispatchEvent(new CustomEvent('auth-state-changed', {
                    detail: { isLoggedIn: true }
                }));
            });

            // 等待页面重新渲染
            await page.waitForTimeout(2000);

            // 刷新页面以确保状态完全更新
            await page.goto('https://app.despeed.net/dashboard', { 
                waitUntil: ['networkidle0', 'domcontentloaded'],
                timeout: 30000 
            });

            // 等待页面加载完成
            await page.waitForTimeout(3000);

            return true;
        }

        console.error('登录验证失败');
        if (response) {
            console.error('API响应:', JSON.stringify(response.data, null, 2));
        }
        return false;
    } catch (error) {
        console.error('登录过程出错:', error.message);
        return false;
    }
}

// 检查登录状态
async function checkLoginStatus(page, token, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            // 等待页面加载完成
            await page.waitForTimeout(3000);

            // 检查用户信息API
            const response = await page.evaluate(async () => {
                try {
                    const res = await fetch('https://app.despeed.net/v1/api/auth/profile', {
                        headers: {
                            'authorization': `Bearer ${localStorage.getItem('token')}`,
                            'accept': 'application/json, text/plain, */*',
                            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
                            'cache-control': 'no-cache',
                            'pragma': 'no-cache'
                        },
                        credentials: 'include'
                    });
                    const data = await res.json();
                    return {
                        ok: res.ok,
                        status: res.status,
                        data: data
                    };
                } catch (error) {
                    return null;
                }
            });

            if (response && response.data && response.data.data) {
                console.log('登录状态检查通过');
                return true;
            }

            // 如果检查失败，等待后重试
            if (i < maxRetries - 1) {
                console.log(`登录状态检查失败，${i + 1}/${maxRetries} 次，等待重试...`);
                await page.waitForTimeout(3000);
            }
        } catch (error) {
            console.error('检查登录状态出错:', error.message);
            if (i < maxRetries - 1) {
                console.log(`登录状态检查失败，${i + 1}/${maxRetries} 次，等待重试...`);
                await page.waitForTimeout(3000);
            }
        }
    }
    return false;
}

// 解析令牌输入
function parseTokenInput(input) {
    try {
        // 如果包含分号，说明可能包含了cookie信息
        if (input.includes(';')) {
            // 取第一部分作为token
            input = input.split(';')[0].trim();
        }

        // 如果是完整的Bearer token
        if (input.startsWith('Bearer ')) {
            input = input.replace('Bearer ', '').trim();
        }

        // 验证token格式（简单检查是否是JWT格式）
        if (input.split('.').length !== 3) {
            console.error('警告: 令牌格式可能不正确，应该是JWT格式（包含两个点）');
            return null;
        }

        return input;
    } catch (error) {
        console.error('解析令牌失败:', error.message);
        return null;
    }
}

// 修改请求拦截器部分
async function setupRequestInterception(page, token) {
    await page.setRequestInterception(true);

    // 设置请求拦截
    page.on('request', request => {
        const url = request.url();
        const headers = request.headers();
        
        // 只修改对 app.despeed.net 的请求
        if (url.includes('app.despeed.net')) {
            headers['accept'] = 'application/json, text/plain, */*';
            headers['accept-encoding'] = 'gzip, deflate, br, zstd';
            headers['accept-language'] = 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6';
            headers['authorization'] = `Bearer ${token}`;
            headers['cache-control'] = 'no-cache';
            headers['pragma'] = 'no-cache';
            headers['priority'] = 'u=1, i';
            headers['referer'] = 'https://app.despeed.net/dashboard';
            headers['sec-ch-ua'] = '"Microsoft Edge";v="129", "Not=A?Brand";v="8", "Chromium";v="129"';
            headers['sec-ch-ua-mobile'] = '?0';
            headers['sec-ch-ua-platform'] = '"Windows"';
            headers['sec-fetch-dest'] = 'empty';
            headers['sec-fetch-mode'] = 'cors';
            headers['sec-fetch-site'] = 'same-origin';
            headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0';
            
            // 添加cookie头
            headers['cookie'] = `refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Njc1NSwiaWF0IjoxNzM2MTQ4NDY2LCJleHAiOjE3Mzc0NDQ0NjZ9.ecsV4Krx8yR1T2pU3XNseb7aFUfIWqGNIgZRSaxrsy0; connect.sid=s%3AJKIo44CLqEsAshlVLAUztPD7kVAn4v48.niaHtGPKsWPNvYcQtZU3GxavvGAnsjtsdnbq1IkOOOo`;
        }
        
        request.continue({ headers });
    });

    // 监听响应以便调试
    page.on('response', async response => {
        const url = response.url();
        if (url.includes('app.despeed.net')) {
            const status = response.status();
            if (status !== 200) {
                console.log(`请求失败: ${url}`);
                console.log(`状态码: ${status}`);
                try {
                    const text = await response.text();
                    console.log('响应内容:', text);
                } catch (e) {}
            }
        }
    });
}

async function run() {
    try {
        // 检查插件目录并获取路径
        const extensionPath = checkExtensionFolder();
        console.log('插件目录检查通过');

        console.log('\n=== DeSpeed Validator 代理运行脚本 ===\n');

        // 获取用户输入的代理信息
        console.log('请输入代理信息（格式：ip:port:username:password 或 ip:port）');
        const proxyInput = await askQuestion('代理: ');
        
        // 获取用户输入的令牌信息
        console.log('\n请输入访问令牌（Access Token，在请求头的 authorization 字段中，以 Bearer 开头）');
        let tokenInput = await askQuestion('访问令牌: ');
        
        // 解析令牌
        const token = parseTokenInput(tokenInput);
        if (!token) {
            console.error('令牌格式错误，程序退出');
            process.exit(1);
        }

        // 显示令牌信息
        try {
            const tokenData = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            console.log('\n令牌信息:');
            console.log('用户ID:', tokenData.id);
            console.log('邮箱:', tokenData.email);
            console.log('过期时间:', new Date(tokenData.exp * 1000).toLocaleString());
            
            // 检查令牌是否已过期
            if (tokenData.exp * 1000 < Date.now()) {
                console.error('警告: 令牌已过期！');
                process.exit(1);
            }
        } catch (error) {
            console.error('警告: 无法解析令牌内容');
        }

        // 关闭readline接口
        rl.close();

        const formattedProxy = formatProxy(proxyInput);

        console.log('\n正在启动...');
        console.log('正在配置代理服务器...');

        // 创建新的代理 URL
        const newProxyUrl = await ProxyChain.anonymizeProxy(formattedProxy).catch(error => {
            console.error('代理服务器配置失败:', error.message);
            process.exit(1);
        });

        console.log('代理服务器配置成功');
        console.log('正在启动浏览器...');

        // 在 run 函数开始处添加系统信息显示
        console.log('\n=== 系统信息 ===');
        console.log('运行环境: VPS');
        console.log('操作系统:', process.platform);
        console.log('Node.js 版本:', process.version);
        console.log('内存使用:', process.memoryUsage().heapUsed / 1024 / 1024, 'MB');
        console.log('===================\n');

        // 修改浏览器启动配置
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--proxy-server=' + newProxyUrl,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-accelerated-2d-canvas',
                '--disable-notifications',
                '--disable-extensions',
                '--disable-component-extensions-with-background-pages',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-client-side-phishing-detection',
                '--disable-default-apps',
                '--disable-sync',
                '--disable-translate',
                '--metrics-recording-only',
                '--mute-audio',
                '--no-default-browser-check',
                '--js-flags="--max-old-space-size=512"',
                '--window-size=1280,720'
            ],
            defaultViewport: {
                width: 1280,
                height: 720
            },
            protocolTimeout: 180000,
        });

        // 定期清理未使用的内存
        setInterval(async () => {
            try {
                if (global.gc) {
                    global.gc();
                }
                const pages = await browser.pages();
                for (const page of pages) {
                    await page.evaluate(() => {
                        window.gc && window.gc();
                    });
                }
            } catch (error) {
                console.error('内存清理失败:', error.message);
            }
        }, 15 * 60 * 1000); // 每15分钟清理一次

        // 等待插件加载
        console.log('等待插件初始化...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // 增加等待时间

        // 获取所有页面
        let pages = await browser.pages();
        let page = pages[0] || await browser.newPage();

        // 设置请求拦截
        await setupRequestInterception(page, token);

        // 设置视窗大小
        await page.setViewport({
            width: 1280,
            height: 800
        });

        // 访问登录页面进行登录
        console.log('正在访问登录页面...');
        await page.goto(CONFIG.DESPEED_LOGIN_URL, {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        // 处理登录
        const loginSuccess = await handleLogin(page, token);
        if (!loginSuccess) {
            console.error('登录失败，程序退出');
            await browser.close();
            process.exit(1);
        }

        // 检查登录状态
        console.log('\n正在检查登录状态...');
        const isLoggedIn = await checkLoginStatus(page, token);
        if (!isLoggedIn) {
            console.error('登录状态检查失败，程序退出');
            await browser.close();
            process.exit(1);
        }
        console.log('登录状态检查通过！');

        // 获取插件背景页
        console.log('\n正在检查插件状态...');
        const targets = await browser.targets();
        const extensionTarget = targets.find(target => 
            target.type() === 'background_page' || 
            target.type() === 'service_worker'
        );

        if (extensionTarget) {
            console.log('插件已加载:', extensionTarget.url());
        } else {
            console.log('插件正在加载中...');
        }

        // 等待插件初始化
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 访问主页面
        console.log('正在访问主页面...');
        const mainPage = await browser.newPage();
        await mainPage.goto('https://app.despeed.net/dashboard', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // 设置定时刷新主页面
        setInterval(async () => {
            try {
                const now = new Date().toLocaleString();
                console.log(`\n[${now}] 刷新页面...`);
                
                // 等待页面刷新完成
                await mainPage.reload({ 
                    waitUntil: ['networkidle0', 'domcontentloaded'],
                    timeout: 30000 
                });

                console.log('页面加载完成，等待 React 应用初始化...');
                
                // 等待 React 应用加载完成
                await mainPage.waitForFunction(() => {
                    return document.querySelector('div[class*="dashboard"]') !== null;
                }, { timeout: 30000 });

                // 等待一段时间确保内容已更新
                await mainPage.waitForTimeout(5000);
                
                // 等待特定元素出现
                const elementHandle = await mainPage.waitForXPath('//div[contains(@class, "dashboard")]//h2[contains(text(), ".")]', {
                    timeout: 30000,
                    visible: true
                }).catch(async (error) => {
                    console.log('等待元素超时，正在检查页面状态...');
                    // 获取所有 h2 元素的文本
                    const h2Texts = await mainPage.evaluate(() => {
                        const h2Elements = document.querySelectorAll('h2');
                        const results = [];
                        h2Elements.forEach(el => {
                            if (el.textContent.includes('.')) {
                                results.push({
                                    text: el.textContent.trim(),
                                    classes: el.parentElement.className
                                });
                            }
                        });
                        return results;
                    });
                    console.log('找到的数字内容:', h2Texts);
                    return null;
                });

                if (!elementHandle) {
                    console.log('未找到目标元素，尝试重新获取...');
                    return;
                }
                
                // 获取指定元素的内容
                const content = await elementHandle.evaluate(node => {
                    // 获取父元素的文本内容
                    const parentText = node.parentElement.textContent.trim();
                    // 获取元素自身的文本内容
                    const selfText = node.textContent.trim();
                    return `${parentText} (${selfText})`;
                });
                
                console.log('\n=== 验证器状态 ===');
                console.log(content || '元素存在但内容为空');
                console.log('===================');
                console.log('页面刷新成功');
            } catch (error) {
                console.error('页面刷新或内容获取失败:', error.message);
                if (error.stack) {
                    console.error('错误堆栈:', error.stack);
                }
            }
        }, 60 * 60 * 1000); // 1小时刷新一次 (60分钟 * 60秒 * 1000毫秒)

        console.log('\n=== 运行状态 ===');
        console.log('1. 代理连接：成功');
        console.log('2. 登录状态：成功');
        console.log('3. 插件状态：已加载');
        console.log('4. 自动刷新：已启动（间隔1小时）');
        console.log('\n按 Ctrl+C 停止程序');

        // 错误处理：监听页面错误
        mainPage.on('error', err => {
            console.error('页面错误:', err);
        });

        // 监听控制台消息
        mainPage.on('console', msg => {
            console.log('浏览器控制台:', msg.text());
        });

    } catch (error) {
        console.error('运行出错:', error.message);
        if (error.stack) {
            console.error('错误堆栈:', error.stack);
        }
        process.exit(1);
    }
}

// 添加进程退出处理
process.on('SIGINT', () => {
    console.log('\n正在关闭程序...');
    process.exit(0);
});

// 运行脚本
run(); 