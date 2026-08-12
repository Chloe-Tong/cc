#!/usr/bin/env bash
# 在 VPS 上以 root 运行一次，完成首次部署
set -euo pipefail

APP_DIR=/opt/chatnest
DOMAIN=${1:-""}    # 可选：./deploy.sh your-domain.com

echo "=== 1. 安装系统依赖 ==="
# 清理签名失效的第三方源，避免 apt-get update 报错中断
grep -rl "cloudsmith\|caddy" /etc/apt/sources.list.d/ 2>/dev/null | xargs -r rm -f || true
apt-get update -q || apt-get update --allow-insecure-repositories -q || true
apt-get install -y python3 python3-venv python3-pip nginx git curl

echo "=== 2. 克隆代码 ==="
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull
else
  git clone --depth 1 https://github.com/Chloe-Tong/cc "$APP_DIR" -b claude/chatnest-project-muiia0
fi

echo "=== 3. Python 虚拟环境 + 依赖 ==="
python3 -m venv "$APP_DIR/.venv"
"$APP_DIR/.venv/bin/pip" install --upgrade pip -q
"$APP_DIR/.venv/bin/pip" install anthropic "claude-agent-sdk==0.2.97" fastapi python-multipart python-dotenv "uvicorn[standard]" -q

echo "=== 4. 生成 .env（如果不存在）==="
if [ ! -f "$APP_DIR/.env" ]; then
  SECRET=$("$APP_DIR/.venv/bin/python" -c "import secrets; print(secrets.token_urlsafe(32))")
  cat > "$APP_DIR/.env" << ENV
AUTH_MODE=app
CHAT_PASSWORD=change-me-now
CHAT_SECRET=${SECRET}
BASIC_AUTH_USER=
BASIC_AUTH_PASSWORD=
MEMORY_SEARCH_URL=http://127.0.0.1:3900/search
ENV
  echo ">>> 请编辑 $APP_DIR/.env 设置 CHAT_PASSWORD"
fi

echo "=== 5. 权限 ==="
useradd -r -s /sbin/nologin www-data 2>/dev/null || true
chown -R www-data:www-data "$APP_DIR"

echo "=== 6. systemd 服务 ==="
cp "$APP_DIR/chatnest.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable chatnest
systemctl restart chatnest
systemctl status chatnest --no-pager

echo "=== 7. Nginx ==="
if [ -n "$DOMAIN" ]; then
  sed "s/your-domain.com/$DOMAIN/g" "$APP_DIR/nginx.conf" > /etc/nginx/sites-available/chatnest
  ln -sf /etc/nginx/sites-available/chatnest /etc/nginx/sites-enabled/chatnest
  rm -f /etc/nginx/sites-enabled/default

  echo "=== 8. SSL (Let's Encrypt) ==="
  if ! command -v certbot &>/dev/null; then
    apt-get install -y certbot python3-certbot-nginx -q
  fi
  nginx -t && systemctl reload nginx
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@"$DOMAIN" || \
    echo ">>> certbot 失败，请手动运行: certbot --nginx -d $DOMAIN"
else
  # 无域名，纯 IP 访问（HTTP only，无 SSL）
  cat > /etc/nginx/sites-available/chatnest << 'NGINX'
server {
    listen 80;
    client_max_body_size 64M;
    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX
  ln -sf /etc/nginx/sites-available/chatnest /etc/nginx/sites-enabled/chatnest
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  echo ">>> 无域名模式，访问 http://<你的VPS-IP>"
fi

echo ""
echo "=== 部署完成 ==="
echo "记得在 $APP_DIR/.env 里设置 CHAT_PASSWORD"
