# Eqora 服务器部署说明

这份文档对应当前最短上线方案：

- 服务器：腾讯云轻量应用服务器
- 运行方式：`pm2 + Node`
- 对外域名：`api.eqora.cn`
- 反向代理：`Nginx`
- 证书：`Let's Encrypt`

## 0. 上线前提醒

- 当前本地环境变量里已经出现过真实密钥，正式上线前建议统一做一次密钥轮换。
- 服务端使用了 `node:sqlite`，建议服务器使用 Node 24+。

## 1. 把代码传到服务器

推荐目录：

```bash
mkdir -p /opt/eqora
```

如果你打算直接从本地上传，可以在本地项目根目录执行：

```powershell
scp -r C:\Users\qq337\Documents\codex\* root@159.75.227.170:/opt/eqora/
```

如果 `scp` 不方便，也可以先压缩再上传。

## 2. 在服务器安装基础环境

```bash
apt update
apt install -y nginx
apt install -y unzip
```

安装 Node 24 和 pm2：

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs
npm install -g pm2
```

检查版本：

```bash
node -v
npm -v
pm2 -v
```

## 3. 安装依赖并构建服务端

```bash
cd /opt/eqora
npm install
npm run build:server
```

## 4. 配置服务端环境变量

进入服务端目录：

```bash
cd /opt/eqora/apps/server
cp .env.production.example .env
```

然后编辑 `.env`，至少填这些：

```env
DEEPSEEK_API_KEY=你的正式Key
AI_MODE=deepseek
TRANSCRIBE_MODE=disabled
WECHAT_LOGIN_MODE=live
WECHAT_APP_ID=你的小程序AppID
WECHAT_APP_SECRET=你的小程序Secret
PORT=4000
```

## 5. 先本地启动服务验证

在服务器上执行：

```bash
cd /opt/eqora
npm run start:server
```

新开一个服务器终端验证：

```bash
curl http://127.0.0.1:4000/health
```

理想返回：

```json
{"ok":true,"service":"speakwise-server","mode":"deepseek","transcriptionMode":"disabled","wechatLoginMode":"live"}
```

如果这里不通，先不要继续做 Nginx。

## 6. 使用 pm2 托管

服务端验证通过后，停止刚才的前台进程，然后执行：

```bash
cd /opt/eqora
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

检查状态：

```bash
pm2 status
pm2 logs eqora-api
```

## 7. 配置 Nginx 反向代理

复制模板：

```bash
cp /opt/eqora/deploy/nginx/api.eqora.cn.conf.example /etc/nginx/sites-available/api.eqora.cn.conf
ln -s /etc/nginx/sites-available/api.eqora.cn.conf /etc/nginx/sites-enabled/api.eqora.cn.conf
```

先不配证书时，你可以暂时只保留 `80` 端口的配置；准备好证书后再补 `443`。

检查并重载：

```bash
nginx -t
systemctl reload nginx
```

## 8. 申请 HTTPS 证书

安装 certbot：

```bash
apt install -y certbot python3-certbot-nginx
```

申请证书：

```bash
certbot --nginx -d api.eqora.cn
```

成功后再验证：

```bash
curl https://api.eqora.cn/health
```

## 9. 微信小程序接入

正式可用后：

- 小程序前端接口地址改成 `https://api.eqora.cn`
- 微信公众平台把 `api.eqora.cn` 加入合法 `request` 域名
- 用真机回归以下链路：
  - 微信登录
  - 拉取场景
  - AI 评分
  - 保存记录
  - 成长页查看

## 10. 常用排查命令

```bash
pm2 status
pm2 logs eqora-api
ss -ltnp
curl http://127.0.0.1:4000/health
curl https://api.eqora.cn/health
nginx -t
systemctl status nginx
```
