# OpenLedger 自动化工具

   ██╗  ██╗██╗ █████╗  ██████╗    ██╗     ██╗███╗   ██╗
   ╚██╗██╔╝██║██╔══██╗██╔═══██╗   ██║     ██║████╗  ██║
    ╚███╔╝ ██║███████║██║   ██║   ██║     ██║██╔██╗ ██║
    ██╔██╗ ██║██╔══██║██║   ██║   ██║     ██║██║╚██╗██║
   ██╔╝ ██╗██║██║  ██║╚██████╔╝   ███████╗██║██║ ╚████║
   ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝    ╚══════╝╚═╝╚═╝  ╚═══╝

                    @YOYOMYOYOA - 小林

## 项目说明

OpenLedger 自动化工具，用于自动维护连接和领取奖励。

- 官方网站：[OpenLedger](https://testnet.openledger.xyz/?referral_code=7kbrlkgppu)

## 获取钱包地址

1. 访问 [OpenLedger](https://testnet.openledger.xyz/?referral_code=7kbrlkgppu)
2. 连接钱包（支持 MetaMask 等）
3. 在仪表盘页面可以看到你的钱包地址

## 功能特点

- **自动发送心跳包**
- **自动连接/重连节点**
- **自动领取每日奖励**
- **支持多账户管理**
- **支持代理使用 (HTTP/SOCKS)**

## VPS 部署教程

### 1. 环境准备

首先需要在 VPS 上安装 Node.js 环境：

```bash
# 更新系统包
apt update
apt upgrade -y

# 安装 Node.js 和 npm (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# 安装screen（用于后台运行）
apt install screen -y

# 验证安装
node --version
npm --version
```

### 2. 下载项目

```bash
# 克隆项目
git clone https://github.com/mumumusf/openledger.git

# 进入项目目录
cd openledger

# 安装依赖
npm install
```

### 3. 配置程序

有两种运行方式：

#### 方式一：直接运行（推荐新手使用）
```bash
# 运行程序
node main.js

# 根据提示输入钱包地址和代理配置
```

#### 方式二：配置文件运行
1. 创建钱包配置文件：
```bash
# 创建并编辑钱包文件
nano wallets.txt

# 一行一个钱包地址，例如：
# 0xDE0852C269836D2Adadd5cBdBC8f570A9eb0A3F5
# 0x1234...
```

2. 如果需要使用代理，创建代理配置文件：
```bash
# 创建并编辑代理文件
nano proxy.txt

# 一行一个代理，格式：ip:port:username:password
# 例如：91.124.222.32:41768:user:pass
```

### 4. 后台运行

有两种方式可以在后台运行程序：

#### 方式一：使用 screen（推荐）

```bash
# 创建新的 screen 会话
screen -S openledger

# 在 screen 中运行程序
node main.js

# 按 Ctrl+A 然后按 D 将程序放入后台

# 重新连接到程序
screen -r openledger

# 查看所有 screen 会话
screen -ls

# 结束程序：重新连接后按 Ctrl+C
```

#### 方式二：使用 nohup

```bash
# 后台运行并将输出保存到日志文件
nohup node main.js > output.log 2>&1 &

# 查看程序运行状态
ps aux | grep node

# 查看日志
tail -f output.log

# 结束程序
pkill -f "node main.js"
```

### 5. 常见问题

1. **如何查看日志？**
   - screen 方式：重新连接到 screen 会话即可看到日志
   - nohup 方式：使用 `tail -f output.log` 查看日志

2. **如何安全退出程序？**
   - screen 方式：重新连接后按 Ctrl+C
   - nohup 方式：使用 `pkill -f "node main.js"`
   - 直接运行时：按 Ctrl+C

3. **代理连接失败怎么办？**
   - 检查代理格式是否正确
   - 确认代理是否可用
   - 可以尝试使用 `noproxy.js` 不使用代理运行

4. **令牌生成失败怎么办？**
   - 检查钱包地址是否正确
   - 确认网络连接是否正常
   - 如果使用代理，尝试更换代理

### 6. 注意事项

- 建议使用代理运行多账户，避免 IP 限制
- 程序会自动处理断线重连
- 每9分钟检查一次积分，避免请求过于频繁
- 每60分钟检查一次奖励，自动领取
- 确保 VPS 有足够的内存（建议至少 1GB）

## 免责声明

本程序仅供学习交流使用，请遵守平台的使用条款。使用本程序所产生的任何后果由使用者自行承担。

## 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。
