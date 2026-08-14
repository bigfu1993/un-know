# un-know 项目开发规范

本文件只保留 `un-know` 项目专属长期规则。通用协作、仓库安全、注释、工程方法论、UI 方法论和流程图绘制规则已迁移到 `/Users/bigfu/.codex/AGENTS.md`。

换设备、换 IDE、换会话时，应先遵循全局规则，再遵循本文件。若全局规则与本项目规则冲突，以本项目规则为准；必要时同步更新对应文档，避免规则散落。

本文件不得长期堆放具体角色、页面、模块、按钮、状态、接口路径、文案和验收细节。具体业务说明应维护在 `docs/产品需求文档.md` 或对应专题文档中。

## 规则维护

- 本项目规则只记录 `un-know` 专属约束、路径、运行方式、技术栈和验证命令。
- 用户提出“以后都要”“加入开发规范”“记住这条规则”等长期要求时，先判断是通用规则还是本项目规则：通用规则写入 `/Users/bigfu/.codex/AGENTS.md`，项目规则写入本文件。
- 简短硬规则写在本文件；具体业务说明、流程图、接口细节、验收标准写入 `docs/`、`frontend/apps/` 或 `server/` 下的专题文档，并在需要时互相引用。
- 修改规则时保持可执行、可检查，避免只写抽象口号。
- 规则变更影响代码行为时，应同时调整实现和验证命令。
- 每次修改、增加、删除或调整产品功能时，必须同步更新 `docs/产品需求文档.md`；涉及角色、模块、流程、接口、校验、文案、入口或验收标准的变化都算产品功能变化。
- 产品需求文档不得只写大纲；新增或调整功能时，必须写清页面目标、进入方式、展示字段、用户操作、校验规则、状态反馈、异常处理和验收标准。
- 开发规范中出现具体业务条目时，应在下一次规范维护中迁移到产品文档或模块文档，规范本身只保留抽象后的方法论。

## 本地环境

- H5 前端默认地址：`http://127.0.0.1:8899/`。
- 后端默认地址：`http://127.0.0.1:9988`。
- 本地数据库通过 SSH 隧道访问 PostgreSQL：
  - 本地隧道：`127.0.0.1:15432`
  - 服务端本机数据库：`127.0.0.1:5432`
  - 数据库名：`unknown_platform`
  - 数据库账号：`unknown_app`
- 测试环境数据库密码从 `.env.*.local` 或环境变量读取，不写入代码仓库。

## 本地运行快捷流程

用户要求“本地运行”“重启项目”“接口不通”“登录接口报错”或“按运行部署文档启动”时，必须先判断当前设备环境，再执行对应流程；不要把 macOS/Linux 的 `screen`、`lsof`、`nc` 命令直接套到 Windows，也不要把 Windows PowerShell 命令套到 macOS/Linux。

启动前先检查 `8899`、`9988`、`15432` 是否已有监听；已有监听且服务可用时优先复用。`scripts/dev/h5.sh` 会在 `8899` 已监听时跳过启动，`scripts/dev/app-server.sh` 会在 `9988` 已监听时跳过启动，`scripts/dev/h5+app-server.sh` 只启动缺失的服务。只有确认端口进程属于当前 `un-know` 项目，且确实需要重启时，才停止旧进程。

### 环境判断

Windows PowerShell：

```powershell
$RepoRoot = (Get-Location).Path
$IsWindowsHost = $env:OS -eq "Windows_NT"
Get-NetTCPConnection -State Listen -LocalPort 8899, 9988, 15432 -ErrorAction SilentlyContinue |
  Select-Object LocalAddress, LocalPort, OwningProcess
```

macOS/Linux：

```bash
REPO_ROOT="$(pwd)"
uname -s
lsof -nP -iTCP:8899 -sTCP:LISTEN
lsof -nP -iTCP:9988 -sTCP:LISTEN
nc -zv 127.0.0.1 15432
```

### 数据库 SSH 隧道

Windows PowerShell：

```powershell
$TunnelReady = Test-NetConnection 127.0.0.1 -Port 15432 -InformationLevel Quiet
if (-not $TunnelReady) {
  $KeyPath = "$env:USERPROFILE\.ssh\unknow\bigfu.m2pro.mac.home.pem"
  if (-not (Test-Path -LiteralPath $KeyPath)) {
    throw "未找到 SSH 密钥：$KeyPath。请提供明确密钥路径，或先手动建立 127.0.0.1:15432 隧道。"
  }
  $SshArguments = @(
    "-i", $KeyPath,
    "-o", "ExitOnForwardFailure=yes",
    "-o", "ServerAliveInterval=60",
    "-o", "ServerAliveCountMax=3",
    "-N",
    "-L", "15432:127.0.0.1:5432",
    "root@8.153.110.192"
  )
  Start-Process -FilePath "ssh.exe" -ArgumentList $SshArguments -WindowStyle Hidden
}
```

macOS/Linux：

`./scripts/dev/app-server.sh` 会默认检查 `127.0.0.1:15432`；未监听时使用 `~/.ssh/unknow/bigfu.m2pro.mac.home.pem` 自动拉起隧道。需要手动排查时可执行：

```bash
nc -zv 127.0.0.1 15432 || ssh -f -i ~/.ssh/unknow/bigfu.m2pro.mac.home.pem -o ExitOnForwardFailure=yes -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -N -L 15432:127.0.0.1:5432 root@8.153.110.192
```

不允许为寻找密钥而枚举整个 `.ssh` 目录；默认路径不存在时，向用户询问明确密钥路径，或要求用户先手动建立 `127.0.0.1:15432` 隧道。macOS/Linux 下可用 `APP_SERVER_TUNNEL_KEY` 指定密钥路径，或用 `APP_SERVER_TUNNEL_ENABLED=0` 跳过自动隧道检查。

### 清理旧进程

Windows PowerShell：

```powershell
foreach ($port in 8899, 9988) {
  Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
    ForEach-Object {
      $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($_.OwningProcess)" -ErrorAction SilentlyContinue
      if ($process.CommandLine -like "*un-know*") {
        Stop-Process -Id $_.OwningProcess -Force
      }
    }
}
```

macOS/Linux：

```bash
screen -S unknow-h5-app-server -X quit 2>/dev/null || true
screen -S unknow-h5 -X quit 2>/dev/null || true
screen -S unknow-server -X quit 2>/dev/null || true
lsof -tiTCP:8899 -sTCP:LISTEN | xargs -r ps -o pid= -o command= -p
lsof -tiTCP:9988 -sTCP:LISTEN | xargs -r ps -o pid= -o command= -p
```

macOS/Linux 下只有确认输出命令行属于当前项目后，才执行 `kill` 停止对应 PID。

### 启动前后端

Windows PowerShell：

```powershell
New-Item -ItemType Directory -Force -Path .\log\client, .\log\server | Out-Null
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev:h5" -WorkingDirectory "$RepoRoot\frontend\apps" -RedirectStandardOutput "$RepoRoot\log\client\h5.screen.log" -RedirectStandardError "$RepoRoot\log\client\h5.screen.err.log" -WindowStyle Hidden
Get-Content -LiteralPath "$RepoRoot\server\apps\.env.prod.local" -ErrorAction SilentlyContinue | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#")) {
    $name, $value = $line -split "=", 2
    if ($name -and $null -ne $value) {
      Set-Item -Path "Env:$name" -Value $value
    }
  }
}
Start-Process -FilePath "mvn.cmd" -ArgumentList "spring-boot:run" -WorkingDirectory "$RepoRoot\server\apps" -RedirectStandardOutput "$RepoRoot\log\server\server.screen.log" -RedirectStandardError "$RepoRoot\log\server\server.screen.err.log" -WindowStyle Hidden
```

macOS/Linux：

```bash
mkdir -p "$REPO_ROOT/log/dev"
screen -dmS unknow-h5-app-server bash -lc "cd '$REPO_ROOT' && ./scripts/dev/h5+app-server.sh > '$REPO_ROOT/log/dev/h5+app-server.screen.log' 2>&1"
```

### 启动验证

启动验证必须区分端口监听、健康检查、登录接口和登录后的真实业务接口。`/actuator/health` 正常、登录接口返回 200，只能说明服务和登录入口可用；还必须使用新登录返回的 `accessToken` 请求至少一个需要鉴权的真实业务接口，才能判断接口链路真的可用。

Windows PowerShell：

```powershell
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:8899/
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:9988/actuator/health
$LoginResponse = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:9988/api/client/auth/login -ContentType "application/json" -Body '{"phone":"18000000009","code":"000000"}'
$Token = $LoginResponse.data.accessToken
$AuthHeaders = @{ Authorization = "Bearer $Token" }
Invoke-RestMethod -Uri http://127.0.0.1:9988/api/client/home -Headers $AuthHeaders
Invoke-RestMethod -Uri http://127.0.0.1:9988/api/client/workspace -Headers $AuthHeaders
Invoke-RestMethod -Uri http://127.0.0.1:9988/api/client/workspace/tutor-demands -Headers $AuthHeaders
```

macOS/Linux：

```bash
curl -I http://127.0.0.1:8899/
curl http://127.0.0.1:9988/actuator/health
TOKEN="$(curl -sS -X POST http://127.0.0.1:9988/api/client/auth/login -H 'Content-Type: application/json' --data '{"phone":"18000000009","code":"000000"}' | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>process.stdout.write(JSON.parse(s).data.accessToken))")"
curl -sS -H "Authorization: Bearer $TOKEN" http://127.0.0.1:9988/api/client/home
curl -sS -H "Authorization: Bearer $TOKEN" http://127.0.0.1:9988/api/client/workspace
curl -sS -H "Authorization: Bearer $TOKEN" http://127.0.0.1:9988/api/client/workspace/tutor-demands
```

如果命令行使用新 token 请求业务接口成功，但浏览器页面仍提示接口失败，优先检查浏览器本地登录态是否过期。后端日志或响应出现 `AUTH_SESSION_EXPIRED` 时，含义是当前请求携带了过期 token，不代表后端、数据库或 SSH 隧道不通；应清理浏览器 `localStorage` 中的 `unknown.client.auth.session`，或在页面执行退出后重新登录，再复测业务接口。

如果使用手机、模拟器或局域网其他设备访问 H5，不能直接沿用前端默认 `http://127.0.0.1:9988` 作为接口地址，因为该地址会指向访问设备自身；必须改为宿主机可访问的 API 地址，或通过环境变量/运行配置覆盖 API Base URL 后再验证。

只有上述固定流程失败时，才查看日志并深入排查：

```powershell
Get-Content -LiteralPath .\log\client\h5.screen.log -Tail 160
Get-Content -LiteralPath .\log\client\h5.screen.err.log -Tail 160 -ErrorAction SilentlyContinue
Get-Content -LiteralPath .\log\server\server.screen.log -Tail 200
Get-Content -LiteralPath .\log\server\server.screen.err.log -Tail 200 -ErrorAction SilentlyContinue
```

```bash
tail -n 160 "$REPO_ROOT/log/dev/h5.log"
tail -n 200 "$REPO_ROOT/log/dev/app-server.log"
```

## 项目核心方法论

- 用户展示名称唯一来源为用户表 `app_user.nickname`；接口、共享类型和前端展示不得新增或维护 `displayName`、`profileName`、`publisherName`、`peerName`、`senderName` 等用户名称别名。涉及多用户关系时使用嵌套用户快照，例如 `publisher.nickname`、`bidder.nickname`、`peer.nickname`、`sender.nickname`。
- 复用沉淀按性质归属：业务相关复用方法沉淀在对应模块或组件目录，业务无关纯函数沉淀到 `frontend/apps/h5/src/tools`。
- 类型集中管理：H5 可复用 TypeScript 类型集中维护在 `frontend/apps/h5/src/types`，共享契约类型维护在共享 domain 包；新增类型后同步全局声明或生成声明。
- 样式按所有权归属：页面私有样式放在页面 `index.less`，共享组件专属样式放在组件目录，全局样式只保留基础、布局和真正跨组件共享的规则。

## 后端规范

- 技术栈：Java 21、Spring Boot、Maven、PostgreSQL、Flyway。
- 后端开发默认遵循项目内 skill：`.codex/skills/un-know-development-practices/SKILL.md`；每次开始较大前后端或后端结构调整前，先读取该 skill 与本规范。
- 使用 Flyway 管理 schema 和种子数据变化；已应用迁移不得修改。
- 预期业务失败使用稳定错误码；接口异常应让前端展示真实错误，不使用假数据兜底。

## H5 前端规范

- 技术栈：React、TypeScript、Vite。
- H5 必须配置并使用全局别名引用源码目录：`@h5`、`@components`、`@pages`、`@shared`、`@store`、`@tools`、`@app-types`、`@ui`；业务源码中不得继续新增跨目录相对路径引用，生成文件除外。
- `pages` 目录按业务模块组织；同一业务域的主页面、子页面和流程页应收敛到同一目录，避免在 `pages` 根部平铺孤立同域页面。
- H5 首页业务域统一收敛在 `pages/home` 下：委托/狩猎归属 `home/delegation`，兼职归属 `home/job`，家教归属 `home/job/edu`，优选/商品归属 `home/shop`；同域组件、hooks、model 不得散落到其他页面目录。
- `pages/<Module>/components` 下的页面私有组件使用扁平文件维护；页面私有 hook 维护在 `pages/<Module>/hooks`。
- 每个 `pages/<Module>` 必须维护 `index.less` 并由 `index.tsx` 引入；该页面及其私有组件样式收敛到对应页面 stylesheet。
- `components/<Component>` 下的共享组件按文件夹维护，组件专属样式放在同目录并由组件入口导入。
- 全局通用 hook 维护在 `frontend/apps/h5/src/hooks`；局部 hook 维护在对应模块的 `hooks` 目录，不与组件文件同级散落。
- 涉及安全、身份、凭据、权限和业务流程推进的判断必须走真实接口和服务端状态；H5 本地散列、缓存和草稿只能作为输入便利或展示缓存，不作为最终正确性来源。
- H5 页面出现固定头部、固定底部操作区和内部滚动主体时，DOM 与 CSS 层级必须体现同级区域关系；不得用视觉 fixed/sticky 掩盖错误嵌套导致的滚动或 footer 失效。
- 表单校验、格式化、日期、金额、字段规则等通用纯逻辑优先复用或沉淀到 `frontend/apps/h5/src/tools`。
- H5 表单中的输入框、下拉框和文本域默认使用小尺寸控件样式；共享样式需控制高度、内边距和字号，保持弹窗、列表筛选和资料表单紧凑可扫描。需要大尺寸控件时必须有明确业务理由，并检查移动端不撑高首屏。
- 全局消息提示由根节点注册单例组件；业务页面、组件和 hooks 直接从消息工具模块 import `showMessage`、`hideMessage` 触发或关闭提示，不为此在组件内调用额外 hook。
- 已被 `unplugin-auto-import` 或 `src/types/global.d.ts` 覆盖的 TypeScript 类型，不在 H5 页面、组件和工具文件中重复显式导入；只保留确实无法全局声明的局部类型。

## UI 与交互

- 优先延续现有 H5 移动端样式语言，保持紧凑、清晰、可扫描。
- 不新增营销型落地页；用户端第一屏应是可用业务体验。

## 流程图与视觉文档

- 本项目生产或维护流程图时，遵循全局流程图规则，并优先读取项目 skill：`.codex/skills/flowchart-production-practices/SKILL.md`。
- 流程图修改必须同时维护项目语义文档：节点含义、编号步骤表、状态迁移表和产品需求口径应与 SVG 保持一致。

## 验证命令

修改完成后的页面、接口或运行时检查，优先使用已经运行的本地进程。

- 检查 H5 页面时，先确认 `http://127.0.0.1:8899/` 是否已有 Vite 进程可用；可用则直接复用该进程做页面、模块或接口联调检查。
- 检查后端接口时，先确认 `http://127.0.0.1:9988` 是否已有后端进程可用；可用则直接复用该进程做健康检查或接口验证。
- 已确认需要重启后端才能生效的场景，默认由 Codex 主动完成后端重启，并在重启后验证健康检查或目标接口；只有涉及用户明确保留的手动进程、端口冲突或权限限制时才先说明原因。
- 如果本次修改不涉及后端代码、配置、数据库迁移或后端运行时依赖，不需要重新启动后端服务，直接复用已有后端进程做接口或页面验证。
- 只有默认端口无进程、进程不属于当前项目、响应异常且确需重启时，才启动新的本地服务。
- 如果启动命令因端口占用自动切换到备用端口，先验证默认端口上的既有进程；不要直接把备用端口当作最终检查地址。
- 为验证临时启动的额外进程，完成检查后应主动停止；不要误停用户已有的进程。

前端 H5 修改后优先执行：

```bash
cd frontend/apps
npm run typecheck:h5
npm run lint:h5
```

默认不做构建验证；只有用户明确要求、发布前检查或排查构建问题时，才执行 `npm run build:h5`。

后端修改后优先执行：

```bash
cd server/apps
mvn -q -DskipTests compile
```

涉及数据库迁移、接口或本地联调时，还需要验证：

```bash
curl http://127.0.0.1:9988/actuator/health
```
