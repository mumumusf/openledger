import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RESTART_INTERVAL = 24 * 60 * 60 * 1000; // 24小时的毫秒数
const CONFIG_FILE = 'user_input.json';

// 保存用户输入到文件
function saveUserInput(wallet, proxy) {
    const data = {
        wallet,
        proxy,
        timestamp: new Date().toISOString()
    };
    writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

// 读取保存的用户输入
function loadUserInput() {
    if (existsSync(CONFIG_FILE)) {
        const data = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
        return [data.wallet, data.proxy];
    }
    return [null, null];
}

function startMainScript() {
    console.log('\n[重启系统] 正在启动主程序...');
    
    // 读取保存的用户输入
    const [savedWallet, savedProxy] = loadUserInput();
    
    // 启动主程序，并传入保存的参数
    const args = ['main.js'];
    if (savedWallet) args.push('--wallet', savedWallet);
    if (savedProxy) args.push('--proxy', savedProxy);
    
    const mainProcess = spawn('node', args, {
        stdio: 'inherit',
        shell: true
    });

    // 监听主程序退出
    mainProcess.on('close', (code) => {
        if (code === 0) {
            // 正常退出，保存用户输入
            const [wallet, proxy] = loadUserInput();
            if (wallet) saveUserInput(wallet, proxy);
        }
        
        console.log(`[重启系统] 主程序退出，退出码: ${code}`);
        console.log('[重启系统] 将在5秒后重新启动...');
        
        // 延迟5秒后重启
        setTimeout(startMainScript, 5000);
    });

    // 设置定时重启
    setTimeout(() => {
        console.log('\n[重启系统] 已运行24小时，准备重启...');
        mainProcess.kill();
    }, RESTART_INTERVAL);
}

// 启动程序
console.log('[重启系统] 自动重启系统已启动');
startMainScript(); 