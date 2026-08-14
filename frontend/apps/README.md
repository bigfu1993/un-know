# 佚名用户端

当前用户端已确认采用 React 技术栈：

- 微信小程序：Taro + React
- 原生 App：React Native
- H5：React + Vite
- 共享核心：接口 SDK、领域枚举、状态规则、表单校验和设计 token

第一版已提供 `miniapp` 的 Taro 微信小程序工程和 `h5` 的 H5 用户端工程。两端共享 `packages` 内的领域模型、接口 SDK、业务 hooks 和 UI token，平台 UI 层分别适配 Taro 组件与 H5 DOM。

## 本地运行

```bash
npm install
npm run dev
```

默认会启动微信小程序 Taro watch 构建，生成目录：

```text
frontend/apps/miniapp/dist
```

使用微信开发者工具打开 `frontend/apps/miniapp`，项目配置会将 `dist` 作为小程序根目录。

运行 H5：

```bash
npm run dev:h5
```

默认访问：

```text
http://127.0.0.1:8899
```
