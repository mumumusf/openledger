# Nodepay 自动化工具集

由小林开发的 Nodepay 自动化工具集，包含三个主要脚本。
推特: @YOYOMYOYOA

## 功能特点

### 1. Nodepay Bot (bot.py)
- 自动获取账户信息
- 自动完成可用任务
- 每分钟自动发送 Ping
- 支持多账户并行运行
- 灵活的代理配置选项

### 2. IP 检查工具 (cek.py)
- 检查账户 IP 状态
- 显示 IP 评分
- 显示设备信息
- 支持代理检查

### 3. Nodewars 游戏机器人 (game_bot.py)
- 自动完成游戏任务
- 自动领取每日奖励
- 智能关卡升级
- 多账户并行处理

## 安装步骤

1. **安装 Python**
   - 安装 Python 3.9 或更高版本
   - 确保已安装 pip

2. **下载代码**
   ```bash
   git clone https://github.com/yourusername/nodepay-tools.git
   cd nodepay-tools
   ```

3. **安装依赖**
   ```bash
   pip install -r requirements.txt
   ```

## 配置说明

### 1. tokens.txt 配置
- 创建 `tokens.txt` 文件
- 每行输入一个 token
- 格式示例：
  ```
  eyJxxxx.yyyy.zzzz
  eyJxxxx.yyyy.zzzz
  ```

### 2. 代理配置
三种方式配置代理：
1. **直接输入代理地址**
   - 运行脚本时选择选项 1
   - 支持以下格式：
     ```
     1. ip:port:username:password  (例如: 208.196.127.126:6544:OR873990528:3de1fa1)
     2. ip:port                    (例如: 208.196.127.126:6544)
     3. protocol://ip:port         (例如: http://208.196.127.126:6544)
     4. protocol://user:pass@ip:port (例如: http://OR873990528:3de1fa1@208.196.127.126:6544)
     ```

2. **从文件加载代理**
   - 创建代理文件（默认 manual_proxy.txt）
   - 每行一个代理地址，支持上述所有格式
   - 示例文件内容：
     ```
     208.196.127.126:6544:OR873990528:3de1fa1
     http://208.196.127.126:6544
     socks5://OR873990528:3de1fa1@208.196.127.126:6544
     ```

3. **不使用代理**
   - 运行脚本时选择选项 3
   - 直接使用本地网络连接

## 使用说明

### 1. 运行 Nodepay Bot
```bash
python bot.py
```
- 选择代理配置方式
- 自动处理所有账户任务和 Ping

### 2. 运行 IP 检查
```bash
python cek.py
```
- 检查所有账户的 IP 状态
- 显示详细的 IP 信息

### 3. 运行游戏机器人
```bash
python game_bot.py
```
- 自动完成游戏任务
- 自动领取奖励

## 日志说明
- 所有操作都会记录到对应的日志文件：
  - `nodepay.log`: Bot 运行日志
  - `ip_check.log`: IP 检查日志
  - `game_bot.log`: 游戏机器人日志

## 获取 Nodepay Token

1. 打开浏览器，登录 Nodepay
2. 按 F12 打开开发者工具
3. 进入 Console 标签
4. 输入以下命令获取 token：
   ```javascript
   localStorage.getItem('np_webapp_token')
   ```
5. 复制获取到的 token 到 tokens.txt 文件

## 注意事项

1. **安全提示**
   - 请勿分享您的 token
   - 建议使用代理以保护账户安全
   - 定期更换代理地址

2. **使用建议**
   - 合理设置账户数量
   - 避免频繁操作
   - 定期检查账户状态

3. **错误处理**
   - 检查日志文件排查问题
   - 确保网络连接稳定
   - 验证代理可用性

## 问题反馈

如有问题或建议，请通过以下方式联系：
- 推特：@YOYOMYOYOA

## 免责声明

本工具仅供学习和研究使用，使用本工具所产生的任何后果由使用者自行承担。

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基础功能
- 添加代理配置选项
- 优化性能和稳定性

## VPS 安装指南

### Ubuntu/Debian 系统:
```bash
# 更新系统包
sudo apt update
sudo apt upgrade -y

# 安装 Python 3.9 和依赖
sudo apt install -y python3.9
sudo apt install -y python3-pip
sudo apt install -y python3.9-venv
sudo apt install -y git

# 验证安装
python3.9 --version
pip3 --version
```

### CentOS/RHEL 系统:
```bash
# 更新系统包
sudo yum update -y

# 安装依赖
sudo yum groupinstall -y "Development Tools"
sudo yum install -y openssl-devel bzip2-devel libffi-devel

# 安装 Python 3.9
sudo yum install -y python39
sudo yum install -y python39-pip
sudo yum install -y git

# 验证安装
python3.9 --version
pip3 --version
```

### 创建虚拟环境（推荐）:
```bash
# 创建虚拟环境
python3.9 -m venv nodepay-env

# 激活虚拟环境
# Linux/Mac:
source nodepay-env/bin/activate
# Windows:
# nodepay-env\Scripts\activate

# 退出虚拟环境
deactivate
```

## 常见问题解决

### Python 安装问题
1. **找不到 Python 3.9**
   ```bash
   # Ubuntu/Debian 添加 PPA
   sudo add-apt-repository ppa:deadsnakes/ppa
   sudo apt update
   sudo apt install python3.9
   ```

2. **pip 安装失败**
   ```bash
   # 手动安装 pip
   curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
   python3.9 get-pip.py
   ```

3. **权限问题**
   ```bash
   # 添加当前用户到 sudo 组
   sudo usermod -aG sudo $USER
   # 重新登录生效
   ```

