# OpenLedger 自动化脚本 VPS 部署教程

![banner](image.png)

## 🌟 项目信息

- 🔗 **官方网站**：[OpenLedger 测试网](https://testnet.openledger.xyz/?referral_code=7kbrlkgppu)
- 🎯 **项目介绍**：OpenLedger 是一个去中心化的计算资源共享平台
- 🎁 **推荐注册**：使用[邀请链接](https://testnet.openledger.xyz/?referral_code=7kbrlkgppu)注册可获得额外奖励

## 🎯 前期准备

1. **注册账号**
   - 点击[邀请链接](https://testnet.openledger.xyz/?referral_code=7kbrlkgppu)进入官网
   - 使用 MetaMask 钱包连接
   - 授权登录，完成注册

2. **获取钱包地址**
   - 登录后进入[仪表盘](https://testnet.openledger.xyz/dashboard)
   - 在页面上可以看到你的钱包地址
   - 记录下钱包地址，后续运行脚本时需要使用

3. **准备代理**（推荐）
   - 推荐使用 [Proxy-Cheap](https://app.proxy-cheap.com/r/puD3oz)
   - 支持 HTTP/SOCKS 代理
   - 格式：`protocol://user:password@ip:port`
   - 建议准备多个代理，提高稳定性
   - 性价比高，稳定性好
   - 支持批量购买，适合多账号使用

## 🌟 功能介绍

- ✨ **自动发送心跳包**：保持节点在线
- 🎁 **自动领取每日奖励**：无需手动操作
- 👥 **支持多账号管理**：一次运行，多账号收益
- 🔒 **支持代理功能**：支持 HTTP/SOCKS 代理
- 🔄 **自动重连功能**：断线自动重连
- 📊 **实时状态显示**：清晰展示每个账号状态

## 📋 VPS 环境准备

1. **连接到你的 VPS**
   ```bash
   ssh 用户名@你的服务器IP
   ```

2. **安装 Node.js**
   ```bash
   # 使用 Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # 或使用 CentOS
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo yum install -y nodejs

   # 验证安装
   node --version
   npm --version
   ```

3. **安装 Screen**（用于后台运行）
   ```bash
   # Ubuntu/Debian
   sudo apt-get install screen

   # CentOS
   sudo yum install screen
   ```

## 🚀 部署步骤

1. **创建工作目录**
   ```bash
   mkdir openledger
   cd openledger
   ```

2. **上传脚本文件**
   - 使用 SFTP 工具（如 FileZilla）上传所有文件到 VPS
   - 或使用 Git（如果有仓库）：
     ```bash
     git clone 仓库地址
     ```

3. **安装依赖**
   ```bash
   npm install
   ```

## 💻 运行脚本

1. **创建新的 Screen 会话**
   ```bash
   screen -S openledger
   ```

2. **运行脚本**
   ```bash
   node main.js
   ```

3. **输入必要信息**
   - 按提示输入钱包地址（多个用逗号分隔）
   - 按提示输入代理地址（可选）

4. **保持脚本运行**
   - 按 `Ctrl + A + D` 分离 Screen 会话
   - 脚本会在后台继续运行

5. **查看运行状态**
   ```bash
   # 列出所有 Screen 会话
   screen -ls

   # 重新连接到会话
   screen -r openledger
   ```

## 📝 常用 Screen 命令

```bash
screen -S 名称     # 创建新会话
screen -ls        # 查看所有会话
screen -r 名称     # 恢复会话
Ctrl + A + D      # 分离当前会话
Ctrl + C          # 结束当前程序
exit              # 退出 Screen 会话
```

## ⚡ 性能建议

1. **VPS 配置建议**
   - CPU：1核心即可
   - 内存：1GB 以上
   - 硬盘：20GB 以上
   - 系统：Ubuntu 20.04/22.04 LTS

2. **网络要求**
   - 稳定的网络连接
   - 较低的延迟
   - 推荐使用代理以提高稳定性

## 🔧 维护建议

1. **日常维护**
   - 定期检查程序运行状态
   - 查看日志确认是否正常运行
   - 检查系统资源占用

2. **故障处理**
   ```bash
   # 查看程序是否运行
   ps aux | grep node

   # 查看系统资源
   top

   # 如果需要重启程序
   screen -r openledger  # 重新连接到会话
   Ctrl + C              # 停止当前程序
   node main.js          # 重新启动
   ```

## ⚠️ 注意事项

1. **安全建议**
   - 使用强密码保护 VPS
   - 定期更新系统
   - 建议使用代理
   - 不要泄露服务器信息

2. **稳定性建议**
   - 使用 Screen 保持程序运行
   - 定期检查运行状态
   - 设置自动重启脚本

3. **常见问题**
   - 如遇断网，程序会自动重连
   - 如遇程序崩溃，需手动重启
   - 建议设置监控脚本

## 📞 联系方式

- 推特：[@YOYOMYOYOA](https://twitter.com/YOYOMYOYOA)

## ⚖️ 免责声明

本程序仅供学习交流使用，使用本程序产生的任何后果由使用者自行承担。请遵守当地法律法规，合理使用本程序。 