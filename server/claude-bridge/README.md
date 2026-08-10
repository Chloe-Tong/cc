# Claude Code Bridge Server

在你的服务器上把 Claude Code CLI 包装成 Anthropic Messages API，让 iOS App (Polaris) 可以直接调用。

## 前置条件

- 服务器上安装了 `claude` CLI（`npm install -g @anthropic-ai/claude-code`）
- 已用你的 Claude Pro 账号登录：`claude login`
- Node.js 18+

## 启动

```bash
node server.mjs
# 默认监听 3456 端口

node server.mjs --port 8080 --allowed-origin https://your-ios-origin.com
```

## 在 Polaris iOS App 里配置

构建 App 时设置：

```bash
VITE_POLARIS_API_ORIGIN=http://your-server-ip:3456 npm run ios:sync
```

然后在 App 的 Provider 设置里添加：

- **Protocol**: anthropic-messages
- **Base URL**: `http://your-server-ip:3456`
- **Model**: `claude-code`
- **API Key**: 随便填一个字符（server 不校验）

## 作为系统服务运行（推荐）

创建 `/etc/systemd/system/claude-bridge.service`：

```ini
[Unit]
Description=Claude Code Bridge
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/node /path/to/server/claude-bridge/server.mjs --port 3456
Restart=always
User=your-user

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable claude-bridge
sudo systemctl start claude-bridge
```
