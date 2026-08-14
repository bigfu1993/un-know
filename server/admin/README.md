# 佚名管理端后端服务

> 当前状态：目录占位，尚未初始化工程，也尚未确定是否会成为独立部署单元。
> 目录定位：作为管理端后端代码未来的落脚点，与 `server/apps`（用户端后端）分开管理。
> 依据：`../../docs/admin-plan.md`、`../../frontend/admin/管理端项目开发文档.md`。

## 待决策事项

`server/apps/后端项目开发文档.md` 第 2 节明确记录了「第一版不拆分成两个后端项目」的结论（跨端事务一致性、钱包/押金强一致、迭代速度、部署单元数量），建议是用户端、管理端共用同一个 Spring Boot 项目、同一个数据库，只在 Controller/DTO/权限层区分。这与本目录"未来独立后端服务"的定位存在张力，需要在真正开发管理端接口前明确：

- 方案 A：维持单体，管理端接口继续加进 `server/apps` 的 `modules/admin` 包，本目录仅作为文档/占位，不放代码。
- 方案 B：推翻单体决策，在本目录初始化独立 Spring Boot 工程，并把 `server/apps` 现有的 `modules/admin`（`AdminHealthController`）迁出到这里。

## 说明

- 当前 `server/apps` 中的 `modules/admin` 包（`AdminHealthController`）原样保留在用户端后端内，未做任何拆分。
- 工程初始化前，本目录不参与构建。
