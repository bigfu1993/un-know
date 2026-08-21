import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const sourceRoot = new URL("../src/", import.meta.url);

/** 读取 H5 源码文件，供全局用户 Provider 结构测试使用。 */
function readSource(relativePath) {
  return readFileSync(new URL(relativePath, sourceRoot), "utf8");
}

test("GlobalProvider 单文件拥有登录用户状态与更新动作", () => {
  const providerUrl = new URL("globalProvider.tsx", sourceRoot);
  const legacyStoreUrl = new URL("store/global.ts", sourceRoot);
  const legacyProviderUrl = new URL("store/GlobalStoreProvider.tsx", sourceRoot);

  assert.equal(existsSync(providerUrl), true, "缺少全局用户 Provider");
  assert.equal(existsSync(legacyStoreUrl), false, "用户信息不应继续保留在 Zustand store");
  assert.equal(existsSync(legacyProviderUrl), false, "旧 GlobalStoreProvider 应当移除");

  const providerSource = readFileSync(providerUrl, "utf8");
  assert.match(providerSource, /const GlobalUserContext = createContext/);
  assert.match(providerSource, /export function GlobalProvider/);
  assert.match(providerSource, /export function useGlobalUser/);
  assert.match(providerSource, /export function useGlobalUserActions/);
  assert.match(providerSource, /getStoredClientAuthSession/);
  assert.doesNotMatch(providerSource, /export (const|function) GlobalUserContext/);
});

test("GlobalProvider 只装配登录后路由并覆盖全部 ClientLayout 子页面", () => {
  const appSource = readSource("App.tsx");
  const layoutSource = readSource("layouts/client/index.tsx");
  const mainSource = readSource("main.tsx");
  const authRoutesSource = readSource("pages/home/auth/routes.tsx");
  const loginRouteSource = authRoutesSource.slice(
    authRoutesSource.indexOf("export function LoginRoute"),
    authRoutesSource.indexOf("export function MineRoute")
  );

  assert.match(layoutSource, /<GlobalProvider>[\s\S]*<HomeProvider>/);
  assert.doesNotMatch(appSource, /<HomeProvider>/);
  assert.doesNotMatch(mainSource, /GlobalStoreProvider/);
  assert.match(loginRouteSource, /setStoredClientAuthSession/);
  assert.doesNotMatch(loginRouteSource, /useHomeRuntimeContext/);

  for (const path of [
    "components/AppShell/index.tsx",
    "overlays/publish/provider.tsx",
    "overlays/tutor/provider.tsx",
    "pages/home/commission/index.tsx",
    "pages/home/runtime.ts",
    "pages/mine/index.tsx",
    "pages/settings/index.tsx"
  ]) {
    assert.doesNotMatch(readSource(path), /@h5\/store\/global/);
  }
});
