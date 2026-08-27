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
const { CalendarPanel } = await vite.ssrLoadModule(
  "/src/components/ScheduleCalendar/CalendarPanel/index.tsx"
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
  assert.ok(!("maxArrangedDates" in schedule));
  assert.ok(!("selectedDate" in schedule));
  assert.ok(!("calendarMode" in schedule));
  assert.ok(!("timePanelPeriods" in schedule));
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
  assert.match(
    calendarPanelStyles,
    /\.calendar-panel__day\.planned[^{]*[{][^}]*(?:background|background-color)\s*:/
  );
  assert.doesNotMatch(calendarPanelStyles, /\.calendar-panel__day\.planned::after/);
  assert.doesNotMatch(
    calendarPanelStyles,
    /\.calendar-panel__day\.selected[^{]*[{][^}]*(?:background|background-color)\s*:/
  );
  assert.doesNotMatch(calendarPanelStyles, /\.calendar-panel__day\.arranged/);
});
