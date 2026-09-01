import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { URL } from "node:url";

const repoRoot = new URL("../../../../", import.meta.url);

/** 读取仓库内文件，验证计划日期跨层命名契约。 */
function readRepoSource(relativePath) {
  return readFileSync(new URL(relativePath, repoRoot), "utf8");
}

test("发布家教计划日期从草稿到前后端请求统一使用 plannedDates", () => {
  const publishInfoSource = readRepoSource("frontend/apps/h5/src/components/PublishInfo/index.tsx");
  const publishModelSource = readRepoSource("frontend/apps/h5/src/tools/publishInfo.ts");
  const domainSource = readRepoSource("frontend/apps/packages/domain/src/index.ts");
  const javaRequestSource = readRepoSource(
    "server/apps/src/main/java/com/unknown/platform/modules/clientworkspace/model/PublishTutorDemandRequest.java"
  );
  const javaServiceSource = readRepoSource(
    "server/apps/src/main/java/com/unknown/platform/modules/clientworkspace/application/TutorWorkspaceAppService.java"
  );

  [publishInfoSource, publishModelSource].forEach((source) => assert.doesNotMatch(source, /tutorDates|selectedDates/));
  assert.match(publishInfoSource, /plannedDates/);
  assert.match(publishModelSource, /plannedDates:\s*draft\.plannedDates/);
  assert.doesNotMatch(publishModelSource, /periodDates/);
  assert.match(domainSource, /interface PublishTutorDemandRequest[\s\S]*?plannedDates\?: string\[\]/);
  assert.doesNotMatch(domainSource, /interface PublishTutorDemandRequest[\s\S]*?periodDates\?: string\[\]/);
  assert.match(javaRequestSource, /List<String> plannedDates/);
  assert.doesNotMatch(javaRequestSource, /periodDates/);
  assert.match(javaServiceSource, /request\.plannedDates\(\)/);
  assert.doesNotMatch(javaServiceSource, /request\.periodDates\(\)/);
});

test("日历和试课排期不再维护 selectedDates", () => {
  const calendarPanelSource = readRepoSource(
    "frontend/apps/h5/src/components/ScheduleCalendar/CalendarPanel/index.tsx"
  );
  const calendarTimeSource = readRepoSource(
    "frontend/apps/h5/src/components/ScheduleCalendar/CalendarTime/index.tsx"
  );
  const scheduleModelSource = readRepoSource(
    "frontend/apps/h5/src/components/ScheduleCalendar/CalendarTime/model.ts"
  );
  const scheduleHookSource = readRepoSource(
    "frontend/apps/h5/src/components/ScheduleCalendar/CalendarTime/useTrialSchedule.ts"
  );

  [calendarPanelSource, calendarTimeSource, scheduleModelSource, scheduleHookSource].forEach((source) => {
    assert.doesNotMatch(source, /selectedDates|maxSelectedDates/);
  });
  assert.match(calendarPanelSource, /plannedDates/);
  assert.match(scheduleHookSource, /schedulePlan\?\.dates/);
  assert.match(scheduleModelSource, /Object\.keys\(scheduleDraft\)/);
});
