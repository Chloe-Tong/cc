#!/bin/bash
# 在服务器上运行一次，完成初始部署
# 用法: bash deploy/setup.sh
set -e

REPO_DIR="$HOME/cc"
DOMAIN="evermind.cleo-theo.eu.cc"

echo "=== 1. 系统依赖 ==="
sudo apt-get update -q
sudo apt-get install -y python3-pip python3-venv nginx

echo "=== 2. 克隆/更新代码 ==="
if [ -d "$REPO_DIR" ]; then
    git -C "$REPO_DIR" pull
else
    git clone https://github.com/Chloe-Tong/cc.git "$REPO_DIR"
fi

echo "=== 3. Python 虚拟环境 ==="
python3 -m venv "$REPO_DIR/.venv"
"$REPO_DIR/.venv/bin/pip" install -q --upgrade pip
"$REPO_DIR/.venv/bin/pip" install -q -r "$REPO_DIR/requirements.txt"

echo "=== 4. Nginx 配置 ==="
sudo cp "$REPO_DIR/deploy/nginx.conf" /etc/nginx/sites-available/evermind
sudo ln -sf /etc/nginx/sites-available/evermind /etc/nginx/sites-enabled/evermind
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "=== 5. systemd 服务 ==="
sudo cp "$REPO_DIR/deploy/evermind.service" /etc/systemd/system/evermind.service
sudo systemctl daemon-reload
sudo systemctl enable evermind
sudo systemctl restart evermind

echo ""
echo "=== 完成 ==="
echo "访问: https://$DOMAIN"
sudo systemctl status evermind --no-pager
