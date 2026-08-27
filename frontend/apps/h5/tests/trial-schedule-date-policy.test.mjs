import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, test } from "node:test";
import { URL, fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import AutoImport from "unplugin-auto-import/vite";

const h5Root = fileURLToPath(new URL("../", import.meta.url));
const calendarPanelStyles = readFileSync(
  new URL("../src/components/ScheduleCalendar/CalendarPanel/index.less", import.meta.url),
  "utf8"
);
const calendarTimeStyles = readFileSync(
  new URL("../src/components/ScheduleCalendar/CalendarTime/index.less", import.meta.url),
  "utf8"
);
const tutorApplicationsSource = readFileSync(
  new URL("../src/overlays/tutor/components/TutorApplications.tsx", import.meta.url),
  "utf8"
);

const vite = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "error",
  plugins: [
    AutoImport({
      dts: false,
      imports: [
        "react",
        {
          "@h5/db/tutorEducation": ["TutorEducation", "tutorEducationLabel"]
        },
        {
          "@h5/db/tutorSubject": ["TutorSubject", "tutorSubjectLabel"]
        }
      ]
    })
  ],
  resolve: {
    alias: {
      "@h5": `${h5Root}/src`,
      "@shared": `${h5Root}/src/shared`,
      "@tools": `${h5Root}/src/tools`
    }
  },
  root: h5Root,
  server: { hmr: false, middlewareMode: true },
  optimizeDeps: { noDiscovery: true }
});

after(() => vite.close());

const { useTrialSchedule } = await vite.ssrLoadModule(
  "/src/components/ScheduleCalendar/CalendarTime/useTrialSchedule.ts"
);
const { CalendarPanel } = await vite.ssrLoadModule("/src/components/ScheduleCalendar/CalendarPanel/index.tsx");
const { TimePanel } = await vite.ssrLoadModule("/src/components/ScheduleCalendar/TimePanel/index.tsx");
const { getTrialScheduleSubtitle, getTrialScheduleValueFromSummary } = await vite.ssrLoadModule(
  "/src/components/ScheduleCalendar/CalendarTime/model.ts"
);

/** 在服务端 React 渲染中执行真实 hook，并返回本次渲染产生的日期策略。 */
function renderTrialSchedule(options) {
  let schedule;

  function TrialScheduleProbe() {
    schedule = useTrialSchedule({ initialValue: null, ...options });
    return React.createElement("div");
  }

  renderToStaticMarkup(React.createElement(TrialScheduleProbe));
  return schedule;
}

/** 读取指定日期按钮的状态类集合。 */
function getDateStateClasses(markup, dateKey) {
  const buttonMatch = markup.match(new RegExp(`class="([^"]*)" data-date-key="${dateKey}"`));
  assert.ok(buttonMatch, `未找到日期 ${dateKey} 对应的日历单元格`);

  return new Set(buttonMatch[1].split(/\s+/).filter(Boolean));
}

/** 读取指定日期按钮内部的完整标记。 */
function getDateCellMarkup(markup, dateKey) {
  const buttonMatch = markup.match(new RegExp(`<button[^>]*data-date-key="${dateKey}"[^>]*>([\\s\\S]*?)</button>`));
  assert.ok(buttonMatch, `未找到日期 ${dateKey} 对应的日历单元格`);

  return buttonMatch[1];
}

/** 读取指定日期按钮的开始标签，用于检查 disabled 等原生交互属性。 */
function getDateButtonMarkup(markup, dateKey) {
  const buttonMatch = markup.match(new RegExp(`<button[^>]*data-date-key="${dateKey}"[^>]*>`));
  assert.ok(buttonMatch, `未找到日期 ${dateKey} 对应的日历按钮`);

  return buttonMatch[0];
}

test("计划日期只负责回显，不限制家长选择其它日期", () => {
  const schedule = renderTrialSchedule({ plannedDates: ["2026-09-08", "2026-09-06"] });

  assert.deepEqual(schedule.plannedDates, ["2026-09-06", "2026-09-08"]);
  assert.deepEqual(schedule.selectableDates, []);
});

test("申请人存在可用时间时仍保留需求计划日期回显", () => {
  const schedule = renderTrialSchedule({
    availableScheduleSummary: "2026年9月10日 9:00-11:00",
    plannedDates: ["2026-09-06", "2026-09-08"]
  });

  assert.deepEqual(schedule.plannedDates, ["2026-09-06", "2026-09-08"]);
  assert.deepEqual(schedule.selectableDates, ["2026-09-10"]);
});

test("日历状态沿组件 props 链保持同一字段命名", () => {
  const schedule = renderTrialSchedule({ maxSelectedDates: 2 });

  assert.equal(schedule.maxSelectedDates, 2);
  assert.equal(typeof schedule.activeDate, "string");
  assert.equal(typeof schedule.setActiveDate, "function");
  assert.equal(schedule.mode, "edit");
  assert.ok(Array.isArray(schedule.periods));
  assert.ok(Array.isArray(schedule.testedDatas));
  assert.ok(Array.isArray(schedule.testedPeriods));
  assert.ok(Array.isArray(schedule.arrangedDatas));
  assert.ok(Array.isArray(schedule.arrangedPeriods));
  assert.ok(!("maxArrangedDates" in schedule));
  assert.ok(!("selectedDate" in schedule));
  assert.ok(!("calendarMode" in schedule));
  assert.ok(!("timePanelPeriods" in schedule));
  assert.ok(!("markers" in schedule));
  assert.ok(!("markerPeriods" in schedule));
  assert.ok(!("markerFallbackLabel" in schedule));
});

test("家长制定试课时日期单元格只切换查看焦点", () => {
  const schedule = renderTrialSchedule({ mode: "view" });

  assert.equal(schedule.mode, "view");
  assert.equal(schedule.onToggleDate, undefined);
  assert.match(tutorApplicationsSource, /<CalendarTime[\s\S]*?\n\s+mode="view"/);
});

test("试课数据为日期添加试角标并显示上午下午晚上图标", () => {
  const dateKey = "2026-09-06";
  const markup = renderToStaticMarkup(
    React.createElement(CalendarPanel, {
      activeDate: dateKey,
      mode: "view",
      selectedDates: [],
      testedDatas: [{ date: dateKey, periods: ["morning", "afternoon", "evening"] }],
      testedPeriods: ["morning", "afternoon", "evening"]
    })
  );
  const cellMarkup = getDateCellMarkup(markup, dateKey);

  assert.match(cellMarkup, /calendar-panel__day-badge[^>]*>试<\/span>/);
  assert.match(cellMarkup, /lucide-sunrise/);
  assert.match(cellMarkup, /lucide-sun(?:\s|")/);
  assert.match(cellMarkup, /lucide-moon/);
});

test("正式课程数据使用 arranged 契约且不显示试角标", () => {
  const dateKey = "2026-09-06";
  const markup = renderToStaticMarkup(
    React.createElement(CalendarPanel, {
      activeDate: dateKey,
      arrangedDatas: [{ date: dateKey, periods: ["morning", "afternoon", "evening"] }],
      arrangedPeriods: ["morning", "afternoon", "evening"],
      mode: "view",
      selectedDates: []
    })
  );
  const cellMarkup = getDateCellMarkup(markup, dateKey);

  assert.doesNotMatch(cellMarkup, /calendar-panel__day-badge/);
  assert.match(cellMarkup, /lucide-sunrise/);
  assert.match(cellMarkup, /lucide-sun(?:\s|")/);
  assert.match(cellMarkup, /lucide-moon/);
});

test("上午下午晚上图标统一固定在时段左侧", () => {
  assert.match(
    calendarPanelStyles,
    /\.calendar-panel__period-icon\s*\{[^}]*(?:position:\s*absolute)[^}]*(?:left:\s*3px)/s
  );
});

test("试课弹窗副标题按三天上限状态和计划范围动态组合", () => {
  assert.equal(
    getTrialScheduleSubtitle({
      activeDate: "2026-09-06",
      isScheduleLimitReached: true,
      plannedDates: ["2026-09-06"]
    }),
    "试课最多安排 3 天。"
  );
  assert.equal(
    getTrialScheduleSubtitle({
      activeDate: "2026-09-08",
      isScheduleLimitReached: false,
      plannedDates: ["2026-09-06"]
    }),
    "建议在计划日程内安排课程。"
  );
  assert.equal(
    getTrialScheduleSubtitle({
      activeDate: "2026-09-08",
      isScheduleLimitReached: true,
      plannedDates: ["2026-09-06"]
    }),
    "试课最多安排 3 天；建议在计划日程内安排课程。"
  );
  assert.equal(
    getTrialScheduleSubtitle({
      activeDate: "2026-09-06",
      isScheduleLimitReached: false,
      plannedDates: ["2026-09-06"]
    }),
    "请选择试课日期和时间。"
  );
});

test("已有三天安排时查看已安排日期不会误报天数上限", () => {
  const initialValue = getTrialScheduleValueFromSummary(
    "2099年9月6日 9:00-11:00；2099年9月7日 9:00-11:00；2099年9月8日 9:00-11:00"
  );
  const schedule = renderTrialSchedule({ initialValue, maxSelectedDates: 3 });

  assert.ok(initialValue);
  assert.equal(schedule.selectedDates.length, 3);
  assert.equal(schedule.isScheduleLimitReached, false);
});

test("过去日期允许在日历查看且 TimePanel 在试课和正式课程排期中保持只读", () => {
  const pastDate = "2020-01-15";
  const initialValue = getTrialScheduleValueFromSummary("2020年1月15日 9:00-11:00");

  assert.ok(initialValue);
  ["tested", "arranged"].forEach((scheduleType) => {
    const schedule = renderTrialSchedule({ initialValue, scheduleType });
    const selectedPeriod = schedule.periods.find((period) => period.enabled);

    assert.equal(schedule.isActiveDatePast, true);
    assert.ok(selectedPeriod);
    assert.equal(selectedPeriod.isToggleDisabled, true);
    assert.equal(selectedPeriod.isTimeInputDisabled, true);
    assert.equal(selectedPeriod.isClearDisabled, true);
  });

  const markup = renderToStaticMarkup(
    React.createElement(CalendarPanel, {
      activeDate: pastDate,
      mode: "view",
      selectedDates: [pastDate],
      testedDatas: [{ date: pastDate, periods: ["morning"] }],
      testedPeriods: ["morning"]
    })
  );

  assert.doesNotMatch(getDateButtonMarkup(markup, pastDate), /disabled=""/);
  assert.ok(getDateStateClasses(markup, pastDate).has("past"));
});

test("过去日期的当日安排操作保持禁用", () => {
  const markup = renderToStaticMarkup(
    React.createElement(TimePanel, {
      activeDateHasSchedule: true,
      activeDateLabel: "2020年1月15日",
      hasNoSelectablePeriods: false,
      isActiveDatePast: true,
      isOutsideSelectableDates: false,
      isScheduleLimitReached: false,
      onChangePeriodTime: () => {},
      onClearDaySchedule: () => {},
      onClearPeriod: () => {},
      onSelectFullDaySchedule: () => {},
      onTogglePeriod: () => {},
      periods: []
    })
  );

  assert.match(markup, /<button[^>]*disabled=""[^>]*>移除当日安排<\/button>/);
});

test("试课安排动态副标题使用独立红色提示样式", () => {
  assert.match(tutorApplicationsSource, /className="trial-schedule-sheet__hint"/);
  assert.match(
    calendarTimeStyles,
    /\.trial-schedule-sheet\s+\.trial-schedule-sheet__hint\s*\{[^}]*color:\s*var\(--h5-danger\)/s
  );
});

test("TimePanel 达到天数上限时不再显示最多安排提示", () => {
  const markup = renderToStaticMarkup(
    React.createElement(TimePanel, {
      activeDateHasSchedule: false,
      activeDateLabel: "2026年9月6日",
      hasNoSelectablePeriods: false,
      isActiveDatePast: false,
      isOutsideSelectableDates: false,
      isScheduleLimitReached: true,
      onChangePeriodTime: () => {},
      onClearDaySchedule: () => {},
      onClearPeriod: () => {},
      onSelectFullDaySchedule: () => {},
      onTogglePeriod: () => {},
      periods: []
    })
  );

  assert.doesNotMatch(markup, /最多安排/);
  assert.match(markup, /<button[^>]*disabled=""[^>]*>全选<\/button>/);
});

test("计划日期与当前选中日期使用独立状态类", () => {
  const markup = renderToStaticMarkup(
    React.createElement(CalendarPanel, {
      activeDate: "2026-09-06",
      mode: "view",
      plannedDates: ["2026-09-06"],
      selectedDates: ["2026-09-08"]
    })
  );
  const plannedDateClasses = getDateStateClasses(markup, "2026-09-06");
  const selectedDateClasses = getDateStateClasses(markup, "2026-09-08");

  assert.ok(plannedDateClasses.has("planned"));
  assert.ok(!plannedDateClasses.has("selected"));
  assert.ok(selectedDateClasses.has("selected"));
  assert.ok(!selectedDateClasses.has("planned"));
  assert.ok(!selectedDateClasses.has("arranged"));
});

test("计划日期使用背景色且不再显示圆点标记", () => {
  assert.match(calendarPanelStyles, /\.calendar-panel__day\.planned[^{]*[{][^}]*(?:background|background-color)\s*:/);
  assert.doesNotMatch(calendarPanelStyles, /\.calendar-panel__day\.planned::after/);
  assert.doesNotMatch(
    calendarPanelStyles,
    /\.calendar-panel__day\.selected[^{]*[{][^}]*(?:background|background-color)\s*:/
  );
  assert.doesNotMatch(calendarPanelStyles, /\.calendar-panel__day\.arranged/);
});
