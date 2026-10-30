# SDU Story Game

山东大学人物故事互动剧情游戏。项目以潘承洞、华岗、路遥等山大人物故事为内容，通过分支剧情、存档回溯和条件台词提供交互式叙事体验。

线上地址：[https://story.sduonline.cn](https://story.sduonline.cn)

## 项目结构

```text
frontend/  React 19 + TypeScript + Vite 前端
backend/   Java 21 + Spring Boot + MyBatis-Plus 后端
deploy/    Docker Compose、Nginx 与部署说明
```

核心后端将剧情抽象为有向图：章节包含剧情节点，节点包含有序台词，并通过线性后继或选项边连接。服务端维护权威剧情状态，记录当前存档快照与有效路径，支持逐句进度、分支选择、条件台词、剧情回溯和节点触发成就。

## 本地开发

### 前端

```bash
cd frontend
npm ci
npm run dev
```

开发环境默认通过 Vite 将 `/api` 转发到 `http://localhost:8080`。

### 后端

准备 Java 21、Maven 和 MySQL 8，在 MySQL 中创建开发数据库并执行 `backend/schema.sql`。通过环境变量提供数据库和 JWT 配置后启动：

```bash
cd backend
mvn spring-boot:run
```

常用环境变量：

```text
DB_URL
DB_USERNAME
DB_PASSWORD
APP_JWT_SECRET
CAS_JWT_SECRET
```

## 剧情数据校验

```bash
python backend/tools/validate_story.py backend/src/main/resources/story/pan-chengdong-story.json
python backend/tools/validate_story.py backend/src/main/resources/story/hua-gang-story.json
python backend/tools/validate_story.py backend/src/main/resources/story/lu-yao-story.json
```

剧情导入支持 `CREATE_ONLY` 和 `REPLACE` 两种模式，详见 [backend/docs/import.md](backend/docs/import.md)。

## Docker Compose

```bash
cd deploy
cp .env.example .env
# 编辑 .env，填写真实配置
docker compose build
docker compose up -d
```

默认仅在宿主机 `127.0.0.1:8001` 暴露前端入口；后端只在 Compose 内部网络开放 8080。生产部署说明见 [deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md)。

真实密码和密钥不得提交到 Git。仓库只保留 `.env.example`。
