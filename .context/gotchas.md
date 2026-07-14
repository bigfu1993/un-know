# 避雷点 / 踩坑记录

- H5 运行时值不能只依赖 `auto-imports.d.ts` 的类型声明兜底；组件中直接使用 `tools` 导出的运行时常量时需要显式导入。例：`MessageToast` 需要 `import { messageToastMeta } from "@tools/messageToast"`，否则登录页触发 toast 会出现 `messageToastMeta is not defined at MessageToast`。

- 不要把业务按钮显隐误判成纯前端问题。按钮是否出现通常代表后端状态机和权限决策，必须先查接口响应、数据库记录和后端应用服务，再改 H5。
