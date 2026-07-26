# un-know 项目开发规范

本文件是项目级长期规则，面向 Codex/AI 助手和开发者。换设备、换 IDE、换会话时，应优先读取并遵循本文件。

本文件只保留跨业务、可复用、可检查的方法论。具体角色、页面、模块、按钮、状态、接口路径、文案和验收细节不得长期堆放在本文件中，应维护在 `docs/产品需求文档.md` 或对应专题文档中。

如果本文件与旧计划文档、临时说明或历史实现不一致，以本文件最新规则为准；必要时同步更新对应文档，避免规则散落。

## 规则维护

- 用户提出“以后都要”“加入开发规范”“记住这条规则”等长期要求时，优先更新本文件。
- 简短硬规则写在本文件；具体业务说明、流程图、接口细节、验收标准写入 `docs/`、`client/` 或 `server/` 下的专题文档，并在需要时互相引用。
- 修改规则时保持可执行、可检查，避免只写抽象口号。
- 规则变更影响代码行为时，应同时调整实现和验证命令。
- 每次修改、增加、删除或调整产品功能时，必须同步更新 `docs/产品需求文档.md`；涉及角色、模块、流程、接口、校验、文案、入口或验收标准的变化都算产品功能变化。
- 产品需求文档不得只写大纲；新增或调整功能时，必须写清页面目标、进入方式、展示字段、用户操作、校验规则、状态反馈、异常处理和验收标准。
- 开发规范中出现具体业务条目时，应在下一次规范维护中迁移到产品文档或模块文档，规范本身只保留抽象后的方法论。

## 协作语言

- 默认使用中文沟通。
- 面向用户的说明、错误提示、开发文档默认使用中文。
- 代码命名保持英文，除非既有业务字段或文案确实使用中文。

## 仓库与安全

- 不提交真实密码、密钥、token、`.pem`、本地数据库凭据。
- 本地私密配置放在 `.env.*.local`，并确保被 `.gitignore` 忽略。
- 示例配置使用 `.env.example` 或文档占位符。
- 不要修改或回滚用户已有改动，除非用户明确要求。
- 已应用到数据库的 Flyway 历史迁移不得修改；数据库结构或种子数据变化必须新增更高版本迁移。

## 代码注释规范

- 类、组件、接口、类型、公共方法、导出函数、关键常量和承载业务含义的重要变量，必须按语言标准注释格式补充注释。
- 所有新增和维护的代码注释默认使用中文，除非引用第三方协议、标准术语或既有英文注释上下文必须保持英文。
- Java 使用 JavaDoc：`/** ... */`，说明类职责、方法用途、参数、返回值和异常。
- TypeScript/JavaScript 使用 TSDoc/JSDoc：`/** ... */`，说明组件职责、函数用途、参数、返回值和重要副作用。
- 注释应解释业务意图、约束、边界条件和非显而易见的实现原因，不写“给变量赋值”“调用方法”等无信息量注释。
- 修改代码行为时同步更新相关注释，避免注释与实现不一致。
- 临时调试注释、废弃代码注释和误导性注释不得保留。

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

启动前先检查 `8899`、`9988`、`15432` 是否已有监听；已有监听且服务可用时优先复用。只有确认端口进程属于当前 `un-know` 项目，且确实需要重启时，才停止旧进程。

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

```bash
nc -zv 127.0.0.1 15432 || ssh -f -i ~/.ssh/unknow/bigfu.m2pro.mac.home.pem -o ExitOnForwardFailure=yes -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -N -L 15432:127.0.0.1:5432 root@8.153.110.192
```

不允许为寻找密钥而枚举整个 `.ssh` 目录；默认路径不存在时，向用户询问明确密钥路径，或要求用户先手动建立 `127.0.0.1:15432` 隧道。

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
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev:h5" -WorkingDirectory "$RepoRoot\client" -RedirectStandardOutput "$RepoRoot\log\client\h5.screen.log" -RedirectStandardError "$RepoRoot\log\client\h5.screen.err.log" -WindowStyle Hidden

Get-Content -LiteralPath "$RepoRoot\server\.env.prod.local" | ForEach-Object {
  if ($_ -and $_ -notmatch "^\s*#") {
    $name, $value = $_ -split "=", 2
    if ($name -and $value) {
      Set-Item -Path "Env:$name" -Value $value
    }
  }
}
Start-Process -FilePath "mvn.cmd" -ArgumentList "spring-boot:run" -WorkingDirectory "$RepoRoot\server" -RedirectStandardOutput "$RepoRoot\log\server\server.screen.log" -RedirectStandardError "$RepoRoot\log\server\server.screen.err.log" -WindowStyle Hidden
```

macOS/Linux：

```bash
mkdir -p "$REPO_ROOT/log/client" "$REPO_ROOT/log/server"
screen -dmS unknow-h5 bash -lc "cd '$REPO_ROOT/client' && npm run dev:h5 > '$REPO_ROOT/log/client/h5.screen.log' 2>&1"
screen -dmS unknow-server bash -lc "cd '$REPO_ROOT/server' && set -a && source .env.prod.local && set +a && mvn spring-boot:run > '$REPO_ROOT/log/server/server.screen.log' 2>&1"
```

### 启动验证

Windows PowerShell：

```powershell
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:8899/
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:9988/actuator/health
Invoke-WebRequest -UseBasicParsing -Method Post -Uri http://127.0.0.1:9988/api/client/auth/login -ContentType "application/json" -Body '{"phone":"18000000009","code":"000000"}'
```

macOS/Linux：

```bash
curl -I http://127.0.0.1:8899/
curl http://127.0.0.1:9988/actuator/health
curl -sS -i -X POST http://127.0.0.1:9988/api/client/auth/login -H 'Content-Type: application/json' --data '{"phone":"18000000009","code":"000000"}'
```

只有上述固定流程失败时，才查看日志并深入排查：

```powershell
Get-Content -LiteralPath .\log\client\h5.screen.log -Tail 160
Get-Content -LiteralPath .\log\client\h5.screen.err.log -Tail 160 -ErrorAction SilentlyContinue
Get-Content -LiteralPath .\log\server\server.screen.log -Tail 200
Get-Content -LiteralPath .\log\server\server.screen.err.log -Tail 200 -ErrorAction SilentlyContinue
```

```bash
tail -n 160 "$REPO_ROOT/log/client/h5.screen.log"
tail -n 200 "$REPO_ROOT/log/server/server.screen.log"
```

## 核心方法论

- 先读现状再改代码：开始实现前先定位模块 owner、数据来源、状态归属、复用能力和验证方式。
- 真实业务闭环优先：凡是影响业务状态、权限、流程推进、数据归属或操作结果的能力，必须由真实数据库状态、后端接口契约和前端消费链路共同闭环，不得只用前端本地状态、缓存、toast、假按钮或 mock 数据替代。
- 数据链路按源头推进：数据库/迁移、后端模型与服务、共享 domain 类型、api-client、hooks、页面组件和产品文档应保持一致；只改链路一端时必须说明边界。
- 用户展示名称唯一来源为用户表 `app_user.nickname`；接口、共享类型和前端展示不得新增或维护 `displayName`、`profileName`、`publisherName`、`peerName`、`senderName` 等用户名称别名。涉及多用户关系时使用嵌套用户快照，例如 `publisher.nickname`、`bidder.nickname`、`peer.nickname`、`sender.nickname`。
- 状态靠近真实消费方：不要为了向子组件或孙组件透传而在父组件提前调用 hook；子组件需要某个状态、数据或动作时，优先在真实消费组件内调用对应 hook。
- 全局状态通过 Provider/Context/store 提供，后代直接读取全局状态；不要通过页面层重复传递全局对象。
- 页面负责业务编排和步骤组合；组件负责展示与自身交互闭环。组件内部可维护默认 props、临时表单草稿、纯提示逻辑和按钮事件包装；父级只接收最终数据或业务结果回调。
- 纯容器、布局、分组、标签切换类组件优先使用 `children` 或命名插槽承载内容，不中转子组件的业务 props；容器 props 只保留自身布局、切换和展示配置。
- 无效外壳及时合并：如果组件只做一层转发或包裹，没有稳定语义、复用价值或独立状态，应将内容迁回真实 owner，或改造成有插槽能力的通用容器。
- 布局层级必须匹配交互语义：固定标题、固定底部操作区和中间滚动区应作为同一布局 owner 下的同级区域组织；不要把固定 footer 放进滚动容器或表单内部。外部按钮提交表单时，使用稳定 `form` id 和 `form` 属性关联。
- 表单信息架构先主后辅：必填、高频、高风险字段优先靠前；选填补充信息按含义聚合为独立视觉单元，组内包含标题、说明、触发动作和展开内容，避免按钮与内容分离。
- 根组件只保留应用级能力：登录态、路由、全局数据请求、Provider 和跨模块组合。单一业务的模型函数、弹窗、卡片和流程组件应归入对应业务模块。
- 复用先于新增：新增逻辑前必须搜索现有页面、组件、hooks、共享类型和工具函数；确认无法复用后再新增。
- 复用沉淀按性质归属：业务相关复用方法沉淀在对应模块或组件目录，业务无关纯函数沉淀到 `client/apps/h5/src/tools`。
- 类型集中管理：H5 可复用 TypeScript 类型集中维护在 `client/apps/h5/src/types`，共享契约类型维护在共享 domain 包；新增类型后同步全局声明或生成声明。
- 样式按所有权归属：页面私有样式放在页面 `index.less`，共享组件专属样式放在组件目录，全局样式只保留基础、布局和真正跨组件共享的规则。
- 批量治理必须分批：全 H5 或全仓库范围的规范治理、目录迁移和批量重构，每批先明确范围和问题分类，完成后运行对应验证命令，再继续下一批。
- 删除或拆分前先查引用：用 `rg` 检查显式 import、JSX 使用、生成声明和 auto-import 配置；被自动导入暴露的导出即使没有显式 import，也可能仍在运行路径中使用。

## 后端规范

- 技术栈：Java 21、Spring Boot、Maven、PostgreSQL、Flyway。
- 后端开发默认遵循项目内 skill：`.codex/skills/un-know-development-practices/SKILL.md`；每次开始较大前后端或后端结构调整前，先读取该 skill 与本规范。
- Controller 只处理 HTTP 边界：请求校验、路径/查询/头读取、调用应用服务、返回统一响应。
- Application Service 负责事务和业务编排，避免把业务逻辑堆在 Controller。
- Model 承载请求/响应、枚举、状态常量和 API/domain 契约；稳定状态值应集中维护，不在前后端散落字符串。
- 使用 Flyway 管理 schema 和种子数据变化；已应用迁移不得修改。
- 预期业务失败使用稳定错误码；接口异常应让前端展示真实错误，不使用假数据兜底。

## H5 前端规范

- 技术栈：React、TypeScript、Vite。
- H5 必须配置并使用全局别名引用源码目录：`@h5`、`@components`、`@pages`、`@shared`、`@store`、`@tools`、`@app-types`；业务源码中不得继续新增跨目录相对路径引用，生成文件除外。
- `pages` 目录按业务模块组织；同一业务域的主页面、子页面和流程页应收敛到同一目录，避免在 `pages` 根部平铺孤立同域页面。
- H5 首页业务域统一收敛在 `pages/home` 下：委托/狩猎归属 `home/delegation`，兼职归属 `home/job`，家教归属 `home/job/edu`，优选/商品归属 `home/shop`；同域组件、hooks、model 不得散落到其他页面目录。
- `pages/<Module>/components` 下的页面私有组件使用扁平文件维护；页面私有 hook 维护在 `pages/<Module>/hooks`。
- 每个 `pages/<Module>` 必须维护 `index.less` 并由 `index.tsx` 引入；该页面及其私有组件样式收敛到对应页面 stylesheet。
- `components/<Component>` 下的共享组件按文件夹维护，组件专属样式放在同目录并由组件入口导入。
- 全局通用 hook 维护在 `client/apps/h5/src/hooks`；局部 hook 维护在对应模块的 `hooks` 目录，不与组件文件同级散落。
- 涉及安全、身份、凭据、权限和业务流程推进的判断必须走真实接口和服务端状态；H5 本地散列、缓存和草稿只能作为输入便利或展示缓存，不作为最终正确性来源。
- H5 页面出现固定头部、固定底部操作区和内部滚动主体时，DOM 与 CSS 层级必须体现同级区域关系；不得用视觉 fixed/sticky 掩盖错误嵌套导致的滚动或 footer 失效。
- 表单校验、格式化、日期、金额、字段规则等通用纯逻辑优先复用或沉淀到 `client/apps/h5/src/tools`。
- 全局消息提示由根节点注册单例组件；业务页面、组件和 hooks 直接从消息工具模块 import `showMessage`、`hideMessage` 触发或关闭提示，不为此在组件内调用额外 hook。
- 已被 `unplugin-auto-import` 或 `src/types/global.d.ts` 覆盖的 TypeScript 类型，不在 H5 页面、组件和工具文件中重复显式导入；只保留确实无法全局声明的局部类型。

## UI 与交互

- 优先延续现有 H5 移动端样式语言，保持紧凑、清晰、可扫描。
- 不新增营销型落地页；用户端第一屏应是可用业务体验。
- 页面文案聚焦当前操作，不在 UI 中堆叠功能说明。
- 按钮、输入框、卡片文本必须适配移动宽度，不应互相遮挡。
- 同一表单组的字段行高度应稳定；输入框内辅助操作优先使用文字或图标型轻量入口，不得因按钮 padding、背景或高度撑大当前字段。
- 表单基础字段、必填字段和选填补充字段应有清晰边界；可展开或可补录的信息使用整体卡片或面板承载。

## 流程图与视觉文档

- 需要精确控制布局、编号、轴线、分支和回流关系的流程图，优先使用可控 SVG 绘制；Mermaid 仅用于不要求精确视觉顺序的草图。
- 流程图修改必须同时维护语义文档：节点含义、编号步骤表、状态迁移表和产品需求口径应与 SVG 保持一致。
- 新增主链路节点时必须占用完整行高，并按从上到下的阅读顺序同步调整后续编号；不得把新节点压缩塞进相邻两行之间。
- 新增、删除、拆分或改变节点类型时，先确定语义、编号和上下游关系，再同步调整节点尺寸、文本分行、锚点、上下间距、分支落点、回流线和相关文档；不得只改节点文字或只补一条线。
- 流程节点改为判断节点时，必须同时补齐“是/否”分支目标、分支标签、线条样式和必要的结果节点；不允许让旧流程节点继续承载含义不清的判断结果。
- 流程图必须先区分主链路、辅助分支、修改环路和终态节点。主链路表达读者默认的顺序推进，优先保持同轴向下；异常、否定、修改、回退等辅助链路走侧向分支或外侧回流。
- 同一语义终点只保留一个结果节点；多个来源进入同一终态时，优先让多条链路接入同一个终点，不复制多个含义相同的结束节点。
- 用户要求某节点“直接指向”另一节点时，必须重新判断二者是否已经构成主链路；若是，目标节点应与来源节点同轴，并由来源节点的主出线直达目标节点，不再保留多余中间终点或绕行支路。
- 删除、合并或收敛分支后，必须清理孤立的 `A/B` 后缀、旧分支编号、旧说明和旧连接线；当同一编号只剩一个节点时，编号应回到无后缀形式，并同步 SVG、步骤表和说明文字。
- 同一行只放相同编号或同一编号的不同分支；子节点必须落在父节点中轴线两侧或与父节点中轴线对齐，空间不足时扩展画布或延长分支，不压缩节点。子节点自身分支空间不足时，优先增大父节点分支横线长度或调整父子距离，再重算子节点分支路线。
- 流程节点使用矩形，判断节点使用菱形；连线目标是流程节点时必须直接指向该节点本身，只有目标是判断节点或明确的汇合点时才连接到线段。
- 多条链路共用同一条后续链路时，汇入线使用无箭头连接线，公共链路自身再保留方向箭头。
- 辅助修改环路应体现“偏离主链路再回到主链路”的语义：修改节点和再次确认节点可布置在侧轴，确认通过时从清晰的侧边接入主链路终点，未通过时回到修改节点；不要让修改环路抢占主链路轴线。
- 判断分支必须显式标注“是/否”；否分支使用红色线条和箭头，分支文字靠近箭头落点侧的竖线。分支左右方向以用户指定规则和视觉不交叉为准；如为避免交叉调整某个判断的左右方向，必须同步调整标签、颜色、箭头和文档描述。判断节点的侧向分支应从菱形左/右端点出线，向下主流程从底部端点出线，不用绕线假装侧向分支。
- 回流线优先绕在已有层级外侧，避免交叉；同阶段修改可用实线回流，跨阶段或长距离回退使用虚线回流。流程变化后必须移除已经失效的旧回流线、旧标签和旧箭头。
- 每次流程图修改后必须完成 SVG XML 解析、残留旧文案/旧编号搜索、浏览器整体图与修改局部渲染检查，并确认节点文字、连线、回流和全局布局无异常，最后执行 `git diff --check`。
- 生产或维护流程图时优先遵循项目 skill：`.codex/skills/flowchart-production-practices/SKILL.md`。

## 验证命令

修改完成后的页面、接口或运行时检查，优先使用已经运行的本地进程：

- 每次代码或产品功能修改完成后，必须检验相关功能是否正常运行；仅完成静态检查不算结束。
- 运行态检验应贴合本次改动范围：H5 页面改动至少确认页面可访问和相关交互无明显报错；接口改动至少确认健康检查和目标接口可用；同时涉及前后端时需要完成一次闭环联调。
- 运行状态确认不强制要求截图；截图仅在排查视觉布局、交互遮挡、响应式问题或用户明确要求时补充。
- 如受环境、账号、权限、网络或数据限制无法完成运行态检验，必须在最终回复中明确说明未检验项、阻塞原因和已完成的替代检查。
- 检查 H5 页面时，先确认 `http://127.0.0.1:8899/` 是否已有 Vite 进程可用；可用则直接复用该进程做页面、模块或接口联调检查。
- 检查后端接口时，先确认 `http://127.0.0.1:9988` 是否已有后端进程可用；可用则直接复用该进程做健康检查或接口验证。
- 已确认需要重启后端才能生效的场景，默认由 Codex 主动完成后端重启，并在重启后验证健康检查或目标接口；只有涉及用户明确保留的手动进程、端口冲突或权限限制时才先说明原因。
- 如果本次修改不涉及后端代码、配置、数据库迁移或后端运行时依赖，不需要重新启动后端服务，直接复用已有后端进程做接口或页面验证。
- 只有默认端口无进程、进程不属于当前项目、响应异常且确需重启时，才启动新的本地服务。
- 如果启动命令因端口占用自动切换到备用端口，先验证默认端口上的既有进程；不要直接把备用端口当作最终检查地址。
- 为验证临时启动的额外进程，完成检查后应主动停止；不要误停用户已有的进程。

前端 H5 修改后优先执行：

```bash
cd client
npm run typecheck:h5
npm run lint:h5
```

默认不做构建验证；只有用户明确要求、发布前检查或排查构建问题时，才执行 `npm run build:h5`。

后端修改后优先执行：

```bash
cd server
mvn -q -DskipTests compile
```

涉及数据库迁移、接口或本地联调时，还需要验证：

```bash
curl http://127.0.0.1:9988/actuator/health
```

## Context Sync 规则

- 踩坑了 → 调用 `write_context` 写到 `gotchas`
- 做了架构决策 → 调用 `write_context` 写到 `architecture`
- 发现 API 特殊行为 → 调用 `write_context` 写到 `api_notes`
- 用户说 `/sync-save` → 调用 `sync_push`
- 用户说 `/sync-load` → 调用 `sync_load`
