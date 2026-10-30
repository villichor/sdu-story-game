# 生产部署说明

本项目通过 Docker Compose 运行两个服务：

```text
反向隧道或网关
        ↓
127.0.0.1:8001
        ↓
frontend (Nginx)
        ├── /      React 静态资源
        └── /api/  → backend:8080
                         ↓
                    外部 MySQL 8
```

后端不向宿主机映射端口；前端只绑定回环地址。不要将真实密码或密钥提交到 Git。

## 1. 准备配置

```bash
git clone https://github.com/villichor/sdu-story-game.git
cd sdu-story-game/deploy
cp .env.example .env
chmod 600 .env
```

编辑 `.env`，填写项目专用数据库、随机生成的应用 JWT 密钥、统一认证密钥及正式域名。应用 JWT 密钥可使用：

```bash
openssl rand -base64 48
```

## 2. 部署前检查

```bash
docker info --format '{{.DockerRootDir}}'
ss -ltn | grep '127.0.0.1:8001' || true
docker compose config --quiet
docker compose ps
```

确认 8001 未被其他服务占用，并且当前 Compose 项目没有误引用其他项目资源。

检查 MySQL 连通性：

```bash
docker run --rm -it --network host --env-file .env mysql:8.0 sh -c \
  'mysqladmin ping --protocol=TCP -h "$SDU_STORY_DB_HOST" -P "$SDU_STORY_DB_PORT" -u "$SDU_STORY_DB_USERNAME" -p'
```

## 3. 构建

```bash
docker compose build
```

## 4. 初始化全新数据库

只对已确认属于本项目的空数据库执行本节。脚本不创建或切换数据库。

```bash
docker run --rm -i --network host --env-file .env mysql:8.0 sh -c \
  'MYSQL_PWD="$SDU_STORY_DB_PASSWORD" exec mysql --protocol=TCP -h "$SDU_STORY_DB_HOST" -P "$SDU_STORY_DB_PORT" -u "$SDU_STORY_DB_USERNAME" "$SDU_STORY_DB_NAME"' \
  < ../backend/schema.sql
```

以 `CREATE_ONLY` 导入三章剧情：

```bash
for story in pan-chengdong hua-gang lu-yao; do
  docker compose run --rm backend \
    --spring.profiles.active=prod,story-import \
    --story.import.location="classpath:story/${story}-story.json" \
    --story.import.mode=CREATE_ONLY || exit 1
done
```

## 5. 启动与验证

```bash
docker compose up -d
docker compose ps
docker compose logs --tail=100 backend
curl -I http://127.0.0.1:8001
curl -I http://127.0.0.1:8001/continue
curl -sS -X POST http://127.0.0.1:8001/api/auth/guest
```

首页和前端路由应返回 200，游客登录应返回业务成功响应。

## 6. 正式域名与统一认证

将外部网关或隧道指向：

```text
http://127.0.0.1:8001
```

在 `.env` 中配置：

```text
SDU_STORY_FRONTEND_LOGIN_SUCCESS_URL=https://your-domain.example/login-success
SDU_STORY_CORS_ALLOWED_ORIGINS=http://127.0.0.1:8001,https://your-domain.example
```

统一认证控制台登记：

```text
https://your-domain.example/api/auth/cas/callback
```

修改运行时配置后只需重建后端容器：

```bash
docker compose up -d --no-deps --force-recreate backend
```

## 7. 更新与停止

```bash
git pull --ff-only
docker compose build
docker compose up -d
```

只停止本项目：

```bash
docker compose stop
```

不要执行 `docker system prune`，也不要批量停止或删除共享服务器上的其他容器、网络和镜像。
