import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { after } from "node:test";
import { URL, fileURLToPath } from "node:url";
import { createServer } from "vite";

const h5Root = fileURLToPath(new URL("../", import.meta.url));
const domainSource = readFileSync(new URL("../../packages/domain/src/index.ts", import.meta.url), "utf8");
const apiClientSource = readFileSync(new URL("../../packages/api-client/src/index.ts", import.meta.url), "utf8");
const globalProviderSource = readFileSync(new URL("../src/globalProvider.tsx", import.meta.url), "utf8");

const vite = await createServer({
  configFile: false,
  root: h5Root,
  resolve: {
    alias: {
      "@unknown/api-client": path.resolve(h5Root, "../packages/api-client/src"),
      "@unknown/domain": path.resolve(h5Root, "../packages/domain/src")
    }
  },
  server: { hmr: false, middlewareMode: true },
  optimizeDeps: { noDiscovery: true },
  logLevel: "error"
});

after(() => vite.close());

test("用户时间模板契约贯通 domain、api-client 和 GlobalProvider", async () => {
  await vite.ssrLoadModule("@unknown/domain");
  const apiClient = await vite.ssrLoadModule("@unknown/api-client");

  assert.match(domainSource, /interface ScheduleTimeTemplate/);
  assert.equal(typeof apiClient.updateClientScheduleTimeTemplate, "function");
  assert.match(apiClientSource, /updateClientScheduleTimeTemplate/);
  assert.match(apiClientSource, /client\/profile\/schedule-time-template/);
  assert.match(globalProviderSource, /scheduleTimeTemplate/);
  assert.match(globalProviderSource, /setScheduleTimeTemplate/);
});
