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

本地调试使用云服务器 PostgreSQL。macOS/Linux 下直接执行 `scripts/dev/app-server.sh`，脚本会自动检查 `127.0.0.1:15432` 并在未监听时拉起 SSH 隧道；Windows PowerShell 下需先手动建立隧道再启动后端。

```powershell
cd D:\code\un-know\server\apps
Get-Content -LiteralPath .env.prod.local -ErrorAction SilentlyContinue | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#")) {
    $name, $value = $line -split "=", 2
    if ($name -and $null -ne $value) {
      Set-Item -Path "Env:$name" -Value $value
    }
  }
}
mvn.cmd spring-boot:run
```

macOS/Linux：

```bash
cd /Users/bigfu/code/un-know
./scripts/dev/app-server.sh
```

数据库连接配置可预先写入本地忽略文件 `server/apps/.env.prod.local`，也可以通过当前终端环境变量传入。macOS/Linux 下需要改 SSH 密钥时设置 `APP_SERVER_TUNNEL_KEY`，需要跳过隧道时设置 `APP_SERVER_TUNNEL_ENABLED=0`。
`app-server.sh` 启动前会检查 `127.0.0.1:9988`；已有监听时直接提示并跳过启动。

## 快速验证

```text
GET  http://127.0.0.1:9988/actuator/health
GET  http://127.0.0.1:9988/api/client/home
GET  http://127.0.0.1:9988/api/client/products
GET  http://127.0.0.1:9988/api/client/workspace
POST http://127.0.0.1:9988/api/client/auth/login
POST http://127.0.0.1:9988/api/client/auth/register
POST http://127.0.0.1:9988/api/client/auth/miniapp/one-tap-login
POST http://127.0.0.1:9988/api/client/products/purchase
```

登录后的业务接口需要携带 `Authorization: Bearer {accessToken}` 和 `X-Client-User-Role: {role}`，不再使用 `?role=` 查询参数。
