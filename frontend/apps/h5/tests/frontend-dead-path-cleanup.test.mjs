import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { URL } from "node:url";

const h5SourceRoot = new URL("../src/", import.meta.url);
const packagesSourceRoot = new URL("../../packages/", import.meta.url);

/** 读取 H5 源码文件，供结构边界契约断言使用。 */
function readH5Source(relativePath) {
  return readFileSync(new URL(relativePath, h5SourceRoot), "utf8");
}

/** 读取前端共享包源码，供公开导出清理契约断言使用。 */
function readPackageSource(relativePath) {
  return readFileSync(new URL(relativePath, packagesSourceRoot), "utf8");
}

test("家长确认结束试课只保留 workflow-action 前端链路", () => {
  const trialListSource = readH5Source("overlays/tutor/components/TutorTrialList.tsx");
  const hostSource = readH5Source("overlays/tutor/host.tsx");
  const providerSource = readH5Source("overlays/tutor/provider.tsx");
  const overlayTypesSource = readH5Source("types/overlay.ts");
  const workflowTypesSource = readH5Source("types/tutor-workflow.ts");
  const hooksSource = readPackageSource("hooks/src/index.ts");
  const apiClientSource = readPackageSource("api-client/src/index.ts");

  assert.doesNotMatch(trialListSource, /onConfirmEnd|useCompleteTutorTrialEnd/);
  [hostSource, providerSource].forEach((source) => {
    assert.doesNotMatch(source, /onConfirmEnd|confirmTrialEnd|useCompleteTutorTrialEnd/);
  });
  assert.doesNotMatch(overlayTypesSource, /confirmTrialEnd|CompleteTutorTrialEndPayload/);
  assert.doesNotMatch(workflowTypesSource, /CompleteTutorTrialEndPayload/);
  assert.doesNotMatch(hooksSource, /useCompleteTutorTrialEnd|completeTutorTrialEnd|CompleteTutorTrialEndRequest/);
  assert.doesNotMatch(apiClientSource, /completeTutorTrialEnd|CompleteTutorTrialEndRequest/);
  assert.match(trialListSource, /"confirm_trial_end"/);
  assert.match(providerSource, /useHandleTutorWorkflowAction/);
});

test("CalendarPanel 不再暴露未使用的可选日期限制", () => {
  const calendarPanelSource = readH5Source("components/ScheduleCalendar/CalendarPanel/index.tsx");

  assert.doesNotMatch(
    calendarPanelSource,
    /selectableDates|selectableDateSet|hasSelectableDateLimit|isOutsideSelectableDates/
  );
  assert.match(calendarPanelSource, /selectableDateKeys/);
});

test("报价确认前端只保留统一 decision 接口", () => {
  const hooksSource = readPackageSource("hooks/src/index.ts");
  const apiClientSource = readPackageSource("api-client/src/index.ts");

  assert.doesNotMatch(hooksSource, /useConfirmHuntingTaskQuote|confirmHuntingTaskQuote/);
  assert.doesNotMatch(apiClientSource, /confirmHuntingTaskQuote/);
  assert.match(hooksSource, /useDecideHuntingTaskQuote/);
  assert.match(apiClientSource, /decideHuntingTaskQuote/);
});

test("注册角色选择复用共享 hook 而不是手写请求", () => {
  const registrationGuideSource = readH5Source("pages/login/components/RegistrationGuide.tsx");

  assert.match(registrationGuideSource, /useSelectClientRole/);
  assert.doesNotMatch(registrationGuideSource, /selectClientRoleAfterRegistration/);
  assert.doesNotMatch(registrationGuideSource, /fetch\(`\$\{getH5ApiBaseUrl\(\)\}\/client\/auth\/select-role`/);
});
