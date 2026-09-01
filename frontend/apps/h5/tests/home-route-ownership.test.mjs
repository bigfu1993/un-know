import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const sourceRoot = new URL("../src/", import.meta.url);

/** 读取 H5 源码文件，供路由所有权结构测试使用。 */
function readSource(relativePath) {
  return readFileSync(new URL(relativePath, sourceRoot), "utf8");
}

test("App 只组合一级路由，Home 模块拥有嵌套子路由", () => {
  const appSource = readSource("App.tsx");
  const homeEntryUrl = new URL("pages/home/index.tsx", sourceRoot);
  const homeRoutesUrl = new URL("pages/home/routes.tsx", sourceRoot);
  const legacyClientRoutesUrl = new URL("router/ClientRoutes.tsx", sourceRoot);

  assert.equal(existsSync(homeEntryUrl), true, "缺少 Home 布局入口");
  assert.equal(existsSync(homeRoutesUrl), true, "缺少 Home 子路由配置");
  assert.equal(existsSync(legacyClientRoutesUrl), false, "旧 ClientRoutes 应当移除");
  assert.match(appSource, /homeRoute/);
  assert.doesNotMatch(appSource, /ClientRoutes|@pages\/home\/(shop|job|commission|edu)/);

  const homeEntrySource = readFileSync(homeEntryUrl, "utf8");
  const homeRoutesSource = readFileSync(homeRoutesUrl, "utf8");

  assert.match(homeEntrySource, /<Outlet\s*\/>/);
  for (const path of ["shop", "job", "commission", "edu", "merchant-sales", "marketing"]) {
    assert.match(homeRoutesSource, new RegExp(`path: ["']${path}["']`));
    assert.doesNotMatch(homeRoutesSource, new RegExp(`path: ["']/${path}["']`));
  }
});

test("登录页面不在一级登录路由内重复创建 Routes", () => {
  const appStateSource = readSource("components/AppStateScreens/index.tsx");

  assert.doesNotMatch(appStateSource, /<Routes>/);
  assert.match(appStateSource, /<Login\s+onLoginSuccess=/);
});

test("Home Context 与消费 hook 收敛在单个 Provider 文件", () => {
  const legacyContextUrl = new URL("pages/home/context.ts", sourceRoot);
  const legacyRuntimeUrl = new URL("pages/home/runtime.ts", sourceRoot);
  const providerUrl = new URL("pages/home/provider.tsx", sourceRoot);
  const providerDirectoryUrl = new URL("pages/home/provider/", sourceRoot);

  assert.equal(existsSync(legacyContextUrl), false, "Home 根目录不应保留独立 context.ts");
  assert.equal(existsSync(legacyRuntimeUrl), false, "Home 运行时逻辑不应保留独立 runtime.ts");
  assert.equal(existsSync(providerUrl), true, "Home 根目录缺少 provider.tsx");
  assert.equal(existsSync(providerDirectoryUrl), false, "不应为 Home Provider 新建子目录");

  const providerSource = readFileSync(providerUrl, "utf8");
  assert.match(providerSource, /createContext/);
  assert.match(providerSource, /function useHomeRuntime\(\)/);
  assert.match(providerSource, /export function HomeProvider/);
  assert.match(providerSource, /export function useHomeRuntimeContext/);
  assert.doesNotMatch(providerSource, /export (const|function) HomeRuntimeContext/);
  assert.doesNotMatch(providerSource, /export function useHomeRuntime\(/);

  for (const path of [
    "App.tsx",
    "layouts/client/index.tsx",
    "pages/home/index.tsx",
    "pages/home/auth/routes.tsx",
    "pages/home/components/RouteEntries.tsx",
  ]) {
    const source = readSource(path);
    assert.doesNotMatch(source, /home\/context|\.\.?\/context/);
  }
});
