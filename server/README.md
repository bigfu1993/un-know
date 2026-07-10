# 佚名后端

后端采用 `Java 21 + Spring Boot 3.x + PostgreSQL + Flyway`。当前服务定位为用户端与平台管理端的统一 API 服务，第一阶段以单体模块化方式推进。

## 已接入能力

- 用户端登录接口：`POST /api/client/auth/login`
- 用户端首页接口：`GET /api/client/home`
- 用户端商品接口：`GET /api/client/products`
- 用户端购买接口：`POST /api/client/products/purchase`
- 用户端工作台接口：`GET /api/client/workspace`
- 管理端健康检查：`GET /api/admin/health`
- Actuator 健康检查：`GET /actuator/health`
- OpenAPI 文档：`/swagger-ui/index.html`
- PostgreSQL 持久化与 Flyway 迁移

## 本地运行

本地调试使用云服务器 PostgreSQL，先启动 SSH 隧道到 `127.0.0.1:15432`，再启动后端。

```powershell
cd D:\code\un-know\server

$env:SPRING_PROFILES_ACTIVE="prod"
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://127.0.0.1:15432/unknown_platform"
$env:SPRING_DATASOURCE_USERNAME="unknown_app"
$env:SPRING_DATASOURCE_PASSWORD="数据库账号密码"

mvn spring-boot:run
```

## 快速验证

```text
GET  http://127.0.0.1:8080/actuator/health
GET  http://127.0.0.1:8080/api/client/home?role=student
GET  http://127.0.0.1:8080/api/client/products?role=student
GET  http://127.0.0.1:8080/api/client/workspace?role=student
POST http://127.0.0.1:8080/api/client/auth/login
POST http://127.0.0.1:8080/api/client/auth/register
POST http://127.0.0.1:8080/api/client/auth/miniapp/one-tap-login
POST http://127.0.0.1:8080/api/client/products/purchase
```
