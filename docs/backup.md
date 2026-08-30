# 数据备份

`data/evermind.db` 里是全部对话与记忆，`.gitignore` 排除了它，所以它**不会**跟着代码仓库走。
本文档说明如何把它自动备份到一个独立的私有仓库。

## ⚠️ 不要备份到 `Chloe-Tong/cc`

那个仓库是 **公开的**。把对话数据提交进去等于公开发布。备份必须用一个**单独的私有仓库**。

---

## 一次性设置

### 1. 建一个私有仓库

在 GitHub 上新建仓库，例如 `evermind-backup`，**Visibility 选 Private**，不要勾选任何初始化文件。

建完后在 Settings 里再确认一次徽章显示的是 `Private`。

### 2. 在服务器上生成部署密钥

用部署密钥（deploy key）而不是账号 token：它只能访问这一个仓库，泄露了也波及不到别处。

```bash
ssh-keygen -t ed25519 -f /root/.ssh/evermind_backup -N "" -C "evermind backup"
cat /root/.ssh/evermind_backup.pub
```

把输出的公钥贴到 **备份仓库** 的 Settings → Deploy keys → Add deploy key，
**务必勾选 "Allow write access"**。

配置 ssh 使用这把密钥：

```bash
cat >> /root/.ssh/config <<'EOF'

Host github-backup
  HostName github.com
  User git
  IdentityFile /root/.ssh/evermind_backup
  IdentitiesOnly yes
EOF
chmod 600 /root/.ssh/config
```

验证（看到 successfully authenticated 就对了）：

```bash
ssh -T github-backup
```

### 3. 克隆备份仓库

把 `你的用户名/evermind-backup` 换成实际路径：

```bash
git clone git@github-backup:你的用户名/evermind-backup.git /root/evermind-backup
cd /root/evermind-backup
git config user.email "backup@evermind.local"
git config user.name  "evermind backup"

# 空仓库需要先建立 main 分支
git commit -q --allow-empty -m "init" && git branch -M main && git push -u origin main
```

### 4. 先手动跑一次

```bash
/root/cc/scripts/backup_to_git.py
```

应输出 `备份完成：N 条事件，X.XMB`。去 GitHub 上刷新，应该能看到 `evermind.sql` 和一个
显示各表行数的 `README.md`。

### 5. 装上每日定时任务

```bash
cp /root/cc/deploy/evermind-backup.service /etc/systemd/system/
cp /root/cc/deploy/evermind-backup.timer   /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now evermind-backup.timer
```

确认：

```bash
systemctl list-timers evermind-backup --no-pager   # 看下次触发时间
journalctl -u evermind-backup -n 20 --no-pager     # 看运行结果
```

---

## 恢复

```bash
cd /root/evermind-backup && git pull

# 从 SQL 文本重建数据库
python3 -c "import sqlite3; sqlite3.connect('/tmp/restored.db').executescript(open('evermind.sql',encoding='utf-8').read())"

systemctl stop evermind
cp /root/cc/data/evermind.db /root/cc/data/evermind.db.before-restore   # 留个后路
cp /tmp/restored.db /root/cc/data/evermind.db
systemctl start evermind
```

恢复到**某一天**的状态：`git log --oneline` 找到那次提交，
`git checkout <commit> -- evermind.sql`，再执行上面的重建步骤。

---

## 设计说明

- **快照而非复制**：用 sqlite3 在线备份 API，服务运行中也能拿到一致状态；
  直接 `cp` 可能拷到写了一半的文件。
- **存 SQL 文本而非 .db 二进制**：文本可以直接 `git diff`、`grep`，
  恢复时也不依赖特定 SQLite 版本。仓库体积也略小（实测 7 天后 gc：0.4MB vs 0.6MB）。
- **无变化不提交**：判断只看 `evermind.sql`，不看带时间戳的 README，
  否则每天都会产生一个内容为空的提交。
- **坏数据不覆盖好备份**：快照未通过 `PRAGMA integrity_check`、
  或 events 表为空（疑似被误清空）时直接中止。
- **体积上限**：导出超过 90MB 就中止（GitHub 单文件硬上限 100MB）。
  真到那一步应该换成对象存储。

## 注意

备份内容是**明文**的私人对话。私有仓库能挡住外人，但 GitHub 本身、
以及任何拿到你 GitHub 账号的人都能读到。如果这不可接受，
可以在提交前加一层 `age` 或 `gpg` 加密 —— 代价是失去 git 的增量压缩和 diff 能力。
