import assert from "node:assert/strict";
import path from "node:path";
import test, { after } from "node:test";
import { URL, fileURLToPath } from "node:url";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const h5Root = fileURLToPath(new URL("../", import.meta.url));
const vite = await createServer({
  configFile: false,
  logLevel: "error",
  optimizeDeps: { noDiscovery: true },
  resolve: {
    alias: {
      "@unknown/api-client": path.resolve(h5Root, "../packages/api-client/src"),
      "@unknown/domain": path.resolve(h5Root, "../packages/domain/src"),
      "@unknown/hooks": path.resolve(h5Root, "../packages/hooks/src")
    }
  },
  root: h5Root,
  server: { hmr: false, middlewareMode: true }
});

after(() => vite.close());

const { clientOngoingOrdersQueryKey, useOngoingOrderSnapshot } = await vite.ssrLoadModule("@unknown/hooks");

/** 在 React Query Provider 中读取目标进行中订单快照。 */
function renderOngoingOrderSnapshot(queryClient, demandId) {
  let snapshot;

  function SnapshotProbe() {
    snapshot = useOngoingOrderSnapshot("parent", demandId);
    return React.createElement("div", { className: "ongoing-order-snapshot-probe" });
  }

  renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: queryClient }, React.createElement(SnapshotProbe))
  );
  return snapshot;
}

test("进行中订单快照保留完整卡片数据而不是只切出 plannedDates", () => {
  const queryClient = new QueryClient();
  const ongoingOrder = {
    amount: 300,
    contact: "家长",
    detail: "初中数学辅导",
    id: "TD20990906001",
    plannedDates: ["2099-09-06", "2099-09-08"],
    role: "parent",
    status: "试课申请中",
    title: "数学家教"
  };

  queryClient.setQueryData([...clientOngoingOrdersQueryKey, "parent"], [ongoingOrder]);

  assert.equal(renderOngoingOrderSnapshot(queryClient, ongoingOrder.id), ongoingOrder);
  assert.equal(renderOngoingOrderSnapshot(queryClient, "TD-MISSING"), null);
});
