import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, test } from "node:test";
import { URL, fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
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
const timePanelStyles = readFileSync(
  new URL("../src/components/ScheduleCalendar/TimePanel/index.less", import.meta.url),
  "utf8"
);
const switchStyles = readFileSync(new URL("../src/ui/Switch/index.less", import.meta.url), "utf8");
const tutorApplicationsSource = readFileSync(
  new URL("../src/overlays/tutor/components/TutorApplications.tsx", import.meta.url),
  "utf8"
);
const useTrialScheduleSource = readFileSync(
  new URL("../src/components/ScheduleCalendar/CalendarTime/useTrialSchedule.ts", import.meta.url),
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
        },
        {
          "@h5/db/tutorStatus": [
            "TutorApplicantStatus",
            "TutorDemandStatus",
            "tutorApplicantStatusLabel",
            "tutorDemandStatusLabel"
          ]
        },
        {
          "lucide-react": [
            "AlertCircle",
            "BriefcaseBusiness",
            "CheckCircle2",
            "Crosshair",
            "GraduationCap",
            "Megaphone",
            "PackageCheck",
            "Settings",
            "ShoppingBag",
            "Store",
            "WalletCards",
            "XCircle"
          ]
        }
      ]
    })
  ],
  resolve: {
    alias: {
      "@h5": `${h5Root}/src`,
      "@shared": `${h5Root}/src/shared`,
      "@tools": `${h5Root}/src/tools`,
      "@ui": `${h5Root}/src/ui`
    }
  },
  root: h5Root,
  server: { hmr: false, middlewareMode: true },
  optimizeDeps: { noDiscovery: true }
});

after(async () => {
  delete globalThis.CalendarPanel;
  delete globalThis.TimePanel;
  await vite.close();
});

const { useTrialSchedule } = await vite.ssrLoadModule(
  "/src/components/ScheduleCalendar/CalendarTime/useTrialSchedule.ts"
);
const { CalendarPanel } = await vite.ssrLoadModule("/src/components/ScheduleCalendar/CalendarPanel/index.tsx");
const { TimePanel } = await vite.ssrLoadModule("/src/components/ScheduleCalendar/TimePanel/index.tsx");
globalThis.CalendarPanel = CalendarPanel;
globalThis.TimePanel = TimePanel;
const { CalendarTime } = await vite.ssrLoadModule("/src/components/ScheduleCalendar/CalendarTime/index.tsx");
const { Switch } = await vite.ssrLoadModule("/src/ui/Switch/index.tsx");
const { createTutorTaskModel } = await vite.ssrLoadModule("/src/tools/tutorTaskWorkflow.ts");
const { getDefaultTutorScheduleDate, getTutorDateKey } = await vite.ssrLoadModule("/src/tools/tutorCalendar.ts");
const { GlobalProvider, useGlobalUserActions } = await vite.ssrLoadModule("/src/globalProvider.tsx");
const { getMessageToastSnapshot, hideMessage } = await vite.ssrLoadModule("/src/tools/messageToast.ts");
const {
  createScheduleTimeTemplateFromDay,
  createTrialScheduleDayFromTemplate,
  createTrialSchedulePeriodState,
  createTrialSchedulePeriodStateForPeriod,
  getTrialScheduleCalendarDatas,
  getTrialSchedulePlan,
  getTrialScheduleSubtitle,
  getTrialScheduleValueFromSummary,
  trialSchedulePeriods
} = await vite.ssrLoadModule("/src/components/ScheduleCalendar/CalendarTime/model.ts");

/** 在服务端 React 渲染中执行真实 hook；需要检查特定日期时显式切换查看焦点。 */
function renderTrialSchedule(options, activeDate) {
  let schedule;

  function TrialScheduleProbe() {
    const currentSchedule = useTrialSchedule({ initialValue: null, scheduleType: "tested", ...options });

    if (activeDate && currentSchedule.activeDate !== activeDate) {
      currentSchedule.setActiveDate(activeDate);
      return React.createElement("div");
    }

    schedule = currentSchedule;
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

/** 递归查找组件返回树中符合条件的真实 React 元素。 */
function findReactElements(node, predicate) {
  const matches = [];

  function visit(child) {
    if (!React.isValidElement(child)) {
      return;
    }
    if (predicate(child)) {
      matches.push(child);
    }
    React.Children.forEach(child.props.children, visit);
  }

  visit(node);
  return matches;
}

/** 在真实 Provider 与 DOM 中渲染 CalendarTime，供模板操作交互测试复用。 */
async function renderCalendarTime({
  blockedScheduleSummary = "",
  canUseScheduleTemplateForDates = false,
  initialSummary = "2099年9月6日 13:00-15:00",
  maxScheduleDates = 3,
  occupiedTestedDates = [],
  scheduleTimeTemplate,
  scheduleType = "tested",
  onConfirm
}) {
  const NativeDate = globalThis.Date;
  const fixedNow = new NativeDate(2099, 8, 6, 12).getTime();
  class FixedDate extends NativeDate {
    constructor(...args) {
      super(...(args.length > 0 ? args : [fixedNow]));
    }

    static now() {
      return fixedNow;
    }
  }
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: "http://127.0.0.1/"
  });
  const previousGlobals = new Map();

  [
    ["Date", FixedDate],
    ["document", dom.window.document],
    ["Event", dom.window.Event],
    ["HTMLElement", dom.window.HTMLElement],
    ["localStorage", dom.window.localStorage],
    ["MouseEvent", dom.window.MouseEvent],
    ["navigator", dom.window.navigator],
    ["window", dom.window],
    ["IS_REACT_ACT_ENVIRONMENT", true]
  ].forEach(([key, value]) => {
    previousGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
  });
  dom.window.HTMLElement.prototype.attachEvent = () => {};
  dom.window.HTMLElement.prototype.detachEvent = () => {};

  function ScheduleTimeTemplateSeed() {
    const { setScheduleTimeTemplate } = useGlobalUserActions();

    React.useEffect(() => {
      if (scheduleTimeTemplate) {
        setScheduleTimeTemplate(scheduleTimeTemplate);
      }
    }, [setScheduleTimeTemplate]);

    return null;
  }

  const initialValue = getTrialScheduleValueFromSummary(initialSummary);
  const container = dom.window.document.getElementById("root");
  const root = createRoot(container);

  assert.ok(initialValue);
  await act(async () => {
    root.render(
      React.createElement(
        GlobalProvider,
        null,
        React.createElement(ScheduleTimeTemplateSeed),
        React.createElement(CalendarTime, {
          blockedScheduleSummary,
          canUseScheduleTemplateForDates,
          initialValue,
          maxScheduleDates,
          occupiedTestedDates,
          onClose: () => {},
          onConfirm,
          scheduleType
        })
      )
    );
  });

  return {
    container,
    async cleanup() {
      hideMessage();
      await act(async () => root.unmount());
      dom.window.close();
      previousGlobals.forEach((descriptor, key) => {
        if (descriptor) {
          Object.defineProperty(globalThis, key, descriptor);
        } else {
          delete globalThis[key];
        }
      });
    }
  };
}

/** 向目标元素派发一次点击，并等待 React 完成状态更新。 */
async function clickElement(element) {
  assert.ok(element);
  await act(async () => {
    element.dispatchEvent(new globalThis.MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
  });
}

/** 派发 CalendarPanel 使用的指针事件。 */
function dispatchCalendarPointer(target, type, pointerId = 1) {
  const event = new globalThis.MouseEvent(type, { bubbles: true });

  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: "mouse" }
  });
  target.dispatchEvent(event);
}

/** 查找并点击指定文案的按钮，同时等待 React 刷新完状态。 */
async function clickButton(container, label) {
  const button = [...container.querySelectorAll("button")].find((candidate) => candidate.textContent === label);

  assert.ok(button, `未找到按钮：${label}`);
  await act(async () => {
    button.dispatchEvent(new globalThis.MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
  });

  return button;
}

test("计划日期只负责回显，不限制家长选择其它日期", () => {
  const schedule = renderTrialSchedule({ plannedDates: ["2026-09-08", "2026-09-06"] });

  assert.deepEqual(schedule.plannedDates, ["2026-09-06", "2026-09-08"]);
  assert.ok(!("selectableDates" in schedule));
});

test("排期 hook 不再暴露可用时间和整日全选路径", () => {
  assert.doesNotMatch(useTrialScheduleSource, /availableScheduleSummary/);
  assert.doesNotMatch(useTrialScheduleSource, /handleSelectFullDaySchedule/);
});

test("时间范围按十分钟间隔决定是否形成安排", () => {
  assert.deepEqual(createTrialSchedulePeriodState("08:00", "08:00"), {
    enabled: false,
    start: "08:00",
    end: "08:00"
  });
  assert.deepEqual(createTrialSchedulePeriodState("08:00", "08:09"), {
    enabled: false,
    start: "",
    end: ""
  });
  assert.deepEqual(createTrialSchedulePeriodState("08:00", "08:10"), {
    enabled: true,
    start: "08:00",
    end: "08:10"
  });
  assert.deepEqual(createTrialSchedulePeriodState("invalid", "08:10"), {
    enabled: false,
    start: "",
    end: ""
  });
});

test("试课提交计划从草稿推导排序后的结构化日期和时间段", () => {
  const plan = getTrialSchedulePlan({
    "2099-09-06": {
      morning: { enabled: true, start: "09:00", end: "10:30" },
      afternoon: { enabled: false, start: "", end: "" },
      evening: { enabled: false, start: "", end: "" }
    },
    "2099-09-08": {
      morning: { enabled: false, start: "", end: "" },
      afternoon: { enabled: false, start: "", end: "" },
      evening: { enabled: true, start: "18:00", end: "20:00" }
    }
  });

  assert.deepEqual(plan, {
    dates: [
      { date: "2099-09-06", timeRanges: [{ start: "09:00", end: "10:30" }] },
      { date: "2099-09-08", timeRanges: [{ start: "18:00", end: "20:00" }] }
    ],
    summary: "2099年9月6日 9:00-10:30；2099年9月8日 18:00-20:00"
  });
});

test("时间范围必须完整落在所属固定时段窗口内", () => {
  assert.deepEqual(createTrialSchedulePeriodStateForPeriod("morning", "07:00", "08:00"), {
    enabled: false,
    start: "",
    end: ""
  });
  assert.deepEqual(createTrialSchedulePeriodStateForPeriod("afternoon", "11:00", "12:00"), {
    enabled: false,
    start: "",
    end: ""
  });
  assert.deepEqual(createTrialSchedulePeriodStateForPeriod("evening", "21:00", "23:00"), {
    enabled: false,
    start: "",
    end: ""
  });
  assert.deepEqual(createTrialSchedulePeriodStateForPeriod("morning", "08:00", "12:00"), {
    enabled: true,
    start: "08:00",
    end: "12:00"
  });
});

test("新建时段必须落在相对窗口起点的十分钟刻度", () => {
  assert.deepEqual(createTrialSchedulePeriodStateForPeriod("morning", "08:05", "08:15"), {
    enabled: false,
    start: "",
    end: ""
  });
  assert.deepEqual(createTrialSchedulePeriodStateForPeriod("afternoon", "12:10", "12:25"), {
    enabled: false,
    start: "",
    end: ""
  });
});

test("历史 off-grid 与跨窗口时段保留原文但不进入可操作 range", () => {
  const offGridValue = getTrialScheduleValueFromSummary("2099年9月6日 09:05-10:05");
  const crossPeriodValue = getTrialScheduleValueFromSummary("2099年9月6日 11:00-13:00");

  assert.ok(offGridValue);
  assert.ok(crossPeriodValue);
  assert.deepEqual(offGridValue.scheduleDraft["2099-09-06"].morning, {
    enabled: true,
    end: "",
    legacyRange: { end: "10:05", start: "09:05" },
    start: ""
  });
  assert.deepEqual(crossPeriodValue.scheduleDraft["2099-09-06"].morning, {
    enabled: true,
    end: "",
    legacyRange: { end: "13:00", start: "11:00" },
    start: ""
  });
  assert.equal(offGridValue.plan.summary, "2099年9月6日 9:05-10:05");
});

test("模板整组覆盖并清空未包含时段", () => {
  assert.deepEqual(
    createTrialScheduleDayFromTemplate({
      morning: { start: "08:30", end: "11:20" }
    }),
    {
      morning: { enabled: true, start: "08:30", end: "11:20" },
      afternoon: { enabled: false, start: "", end: "" },
      evening: { enabled: false, start: "", end: "" }
    }
  );
  assert.deepEqual(
    createTrialScheduleDayFromTemplate({
      morning: { start: "07:00", end: "08:00" },
      afternoon: { start: "11:00", end: "12:00" },
      evening: { start: "21:00", end: "23:00" }
    }),
    {
      morning: { enabled: false, start: "", end: "" },
      afternoon: { enabled: false, start: "", end: "" },
      evening: { enabled: false, start: "", end: "" }
    }
  );
});

test("单日安排序列化为仅包含有效时段的稀疏模板", () => {
  assert.deepEqual(
    createScheduleTimeTemplateFromDay({
      morning: { enabled: true, start: "08:30", end: "11:20" },
      afternoon: { enabled: false, start: "", end: "" },
      evening: { enabled: false, start: "", end: "" }
    }),
    {
      morning: { start: "08:30", end: "11:20" }
    }
  );
});

test("模板转换拒绝任何未满足窗口十分钟刻度的 enabled 状态", () => {
  assert.throws(
    () =>
      createScheduleTimeTemplateFromDay({
        morning: { enabled: true, start: "08:05", end: "09:05" },
        afternoon: { enabled: true, start: "13:00", end: "15:00" },
        evening: { enabled: false, start: "", end: "" }
      }),
    /无法保存为模板/
  );
});

test("包含历史异常时段的单日安排拒绝部分遗漏后保存模板", () => {
  assert.throws(
    () =>
      createScheduleTimeTemplateFromDay({
        morning: {
          enabled: true,
          end: "",
          legacyRange: { end: "10:05", start: "09:05" },
          start: ""
        },
        afternoon: { enabled: true, start: "13:00", end: "15:00" },
        evening: { enabled: false, start: "", end: "" }
      }),
    /历史异常时段/
  );
});

test("日历始终只切换查看焦点且 hook 暴露原子范围与模板契约", () => {
  const schedule = renderTrialSchedule({ plannedDates: ["2026-09-06", "2026-09-08"] });

  assert.deepEqual(schedule.plannedDates, ["2026-09-06", "2026-09-08"]);
  assert.equal(typeof schedule.onChangePeriodRange, "function");
  assert.equal(typeof schedule.applyScheduleTimeTemplateToDates, "function");
  assert.ok(schedule.activeDaySchedule);
  assert.ok(!("mode" in schedule));
  assert.ok(!("onToggleDate" in schedule));
  assert.ok(!("onTogglePeriod" in schedule));
  assert.ok(!("onSelectFullDaySchedule" in schedule));
});

test("日历状态沿组件 props 链保持同一字段命名", () => {
  const schedule = renderTrialSchedule({ maxScheduleDates: 2 });

  assert.equal(schedule.maxScheduleDates, 2);
  assert.equal(typeof schedule.activeDate, "string");
  assert.equal(typeof schedule.setActiveDate, "function");
  assert.ok(Array.isArray(schedule.periods));
  assert.ok(Array.isArray(schedule.testedDatas));
  assert.ok(Array.isArray(schedule.testedPeriods));
  assert.ok(Array.isArray(schedule.arrangedDatas));
  assert.ok(Array.isArray(schedule.arrangedPeriods));
  assert.ok(!("maxArrangedDates" in schedule));
  assert.ok(!("maxSelectedDates" in schedule));
  assert.ok(!("selectedDate" in schedule));
  assert.ok(!("selectedDates" in schedule));
  assert.ok(!("calendarMode" in schedule));
  assert.ok(!("timePanelPeriods" in schedule));
  assert.ok(!("markers" in schedule));
  assert.ok(!("markerPeriods" in schedule));
  assert.ok(!("markerFallbackLabel" in schedule));
});

test("家长制定试课时由 CalendarTime 固定日历查看模式", () => {
  assert.doesNotMatch(tutorApplicationsSource, /<CalendarTime[\s\S]*?\n\s+mode="view"/);
});

test("家长试课排期主操作使用提交试课日程文案", () => {
  assert.match(tutorApplicationsSource, /return "提交试课日程";/);
  assert.doesNotMatch(tutorApplicationsSource, /试课信息确认/);
});

test("试课数据为日期添加试角标并显示上午下午晚上图标", () => {
  const dateKey = "2026-09-06";
  const markup = renderToStaticMarkup(
    React.createElement(CalendarPanel, {
      activeDate: dateKey,
      mode: "view",
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

test("日历排期数据不再生成时段标签", () => {
  assert.deepEqual(
    getTrialScheduleCalendarDatas({
      "2026-09-06": {
        morning: { enabled: true, end: "10:00", start: "09:00" }
      }
    }),
    [{ date: "2026-09-06", periods: ["morning"] }]
  );
});

test("日历单元格只显示时段图标且不渲染标签", () => {
  const dateKey = "2026-09-06";
  const markup = renderToStaticMarkup(
    React.createElement(CalendarPanel, {
      activeDate: dateKey,
      mode: "view",
      testedDatas: [
        {
          date: dateKey,
          periods: ["morning"]
        }
      ],
      testedPeriods: ["morning", "afternoon", "evening"]
    })
  );
  const document = new JSDOM(markup).window.document;
  const period = document.querySelector(`[data-date-key="${dateKey}"] .calendar-panel__period.has-data`);

  assert.ok(period);
  assert.ok(period.querySelector(".lucide-sunrise"));
  assert.equal(period.querySelectorAll("span").length, 0);
  assert.equal(period.textContent, "");
});

test("日历单元格在窄屏按七列等比收缩", () => {
  const panelRule = calendarPanelStyles.match(/(?:^|\n)\.calendar-panel\s*\{([^}]*)\}/s)?.[1];
  const toolbarRule = calendarPanelStyles.match(/\.calendar-panel__toolbar\s*\{([^}]*)\}/s)?.[1];
  const gridRule = calendarPanelStyles.match(
    /\.calendar-panel__weekdays,\s*\.calendar-panel__grid\s*\{([^}]*)\}/s
  )?.[1];
  const dayRule = calendarPanelStyles.match(/(?:^|\n)\.calendar-panel__day\s*\{([^}]*)\}/s)?.[1];

  assert.ok(panelRule);
  assert.match(panelRule, /width:\s*100%/);
  assert.match(panelRule, /min-width:\s*0/);
  assert.ok(toolbarRule);
  assert.match(toolbarRule, /width:\s*100%/);
  assert.match(toolbarRule, /max-width:\s*310px/);
  assert.match(toolbarRule, /min-width:\s*0/);
  assert.ok(gridRule);
  assert.match(gridRule, /width:\s*100%/);
  assert.match(gridRule, /max-width:\s*310px/);
  assert.match(gridRule, /min-width:\s*0/);
  assert.ok(dayRule);
  assert.match(dayRule, /width:\s*100%/);
  assert.match(dayRule, /max-width:\s*40px/);
  assert.match(dayRule, /aspect-ratio:\s*1/);
  assert.match(dayRule, /justify-self:\s*center/);
  assert.doesNotMatch(dayRule, /height:\s*40px/);
});

test("正式课程数据使用 arranged 契约且不显示试角标", () => {
  const dateKey = "2026-09-06";
  const markup = renderToStaticMarkup(
    React.createElement(CalendarPanel, {
      activeDate: dateKey,
      arrangedDatas: [{ date: dateKey, periods: ["morning", "afternoon", "evening"] }],
      arrangedPeriods: ["morning", "afternoon", "evening"],
      mode: "view"
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
      isActiveDatePast: false,
      isScheduleLimitReached: true,
      plannedDates: ["2026-09-06"]
    }),
    "试课最多安排 3 天。"
  );
  assert.equal(
    getTrialScheduleSubtitle({
      activeDate: "2026-09-08",
      isActiveDatePast: false,
      isScheduleLimitReached: false,
      plannedDates: ["2026-09-06"]
    }),
    "建议在计划日程内安排课程。"
  );
  assert.equal(
    getTrialScheduleSubtitle({
      activeDate: "2026-09-08",
      isActiveDatePast: false,
      isScheduleLimitReached: true,
      plannedDates: ["2026-09-06"]
    }),
    "试课最多安排 3 天；建议在计划日程内安排课程。"
  );
  assert.equal(
    getTrialScheduleSubtitle({
      activeDate: "2026-09-06",
      isActiveDatePast: false,
      isScheduleLimitReached: false,
      plannedDates: ["2026-09-06"]
    }),
    "请选择试课日期和时间。"
  );
});

test("查看过去日期时优先提示无法制定课程安排", () => {
  assert.equal(
    getTrialScheduleSubtitle({
      activeDate: "2020-01-15",
      isActiveDatePast: true,
      isScheduleLimitReached: true,
      plannedDates: ["2099-09-06"]
    }),
    "该日期无法制定课程安排"
  );
});

test("已有三天安排时查看已安排日期不会误报天数上限", () => {
  const initialValue = getTrialScheduleValueFromSummary(
    "2099年9月6日 9:00-11:00；2099年9月7日 9:00-11:00；2099年9月8日 9:00-11:00"
  );
  const schedule = renderTrialSchedule({ initialValue, maxScheduleDates: 3 }, "2099-09-06");

  assert.ok(initialValue);
  assert.equal(schedule.value?.plan.dates.length, 3);
  assert.equal(schedule.isScheduleLimitReached, false);
});

test("过去日期允许在日历查看且 TimePanel 在试课和正式课程排期中保持只读", () => {
  const pastDate = "2020-01-15";
  const initialValue = getTrialScheduleValueFromSummary("2020年1月15日 9:00-11:00");

  assert.ok(initialValue);
  ["tested", "arranged"].forEach((scheduleType) => {
    const schedule = renderTrialSchedule({ initialValue, scheduleType }, pastDate);
    const selectedPeriod = schedule.periods.find((period) => period.enabled);

    assert.equal(schedule.isActiveDatePast, true);
    assert.ok(selectedPeriod);
    assert.equal(selectedPeriod.isTimeInputDisabled, true);
    assert.equal(selectedPeriod.isClearDisabled, true);
    assert.equal(selectedPeriod.minTime, "08:00");
    assert.equal(selectedPeriod.maxTime, "12:00");
  });

  const markup = renderToStaticMarkup(
    React.createElement(CalendarPanel, {
      activeDate: pastDate,
      mode: "view",
      plannedDates: [pastDate],
      testedDatas: [{ date: pastDate, periods: ["morning"] }],
      testedPeriods: ["morning"]
    })
  );

  assert.doesNotMatch(getDateButtonMarkup(markup, pastDate), /disabled=""/);
  assert.ok(getDateStateClasses(markup, pastDate).has("past"));
});

test("发布计划日历不显示使用模板开关", () => {
  const markup = renderToStaticMarkup(
    React.createElement(CalendarPanel, {
      activeDate: "2099-09-06",
      mode: "edit",
      onActiveDateChange: () => {},
      onToggleDate: () => {},
      plannedDates: ["2099-09-06"]
    })
  );

  assert.doesNotMatch(markup, /role="switch"/);
  assert.doesNotMatch(markup, /使用模板/);
});

test("排期模板开关由 CalendarPanel 内部维护且点击先查看再设置模板", async () => {
  let confirmedValue;
  const view = await renderCalendarTime({
    canUseScheduleTemplateForDates: true,
    onConfirm: (value) => {
      confirmedValue = value;
    },
    scheduleTimeTemplate: { morning: { start: "08:30", end: "09:30" } }
  });

  try {
    const templateSwitch = view.container.querySelector('[role="switch"][aria-label="使用模板"]');
    const targetDate = view.container.querySelector('[data-date-key="2099-09-07"]');

    assert.ok(templateSwitch);
    assert.equal(templateSwitch.getAttribute("aria-checked"), "false");
    await clickElement(templateSwitch);
    assert.equal(templateSwitch.getAttribute("aria-checked"), "true");

    await clickElement(targetDate);
    assert.equal(targetDate.classList.contains("active"), true);
    assert.equal(targetDate.querySelectorAll(".calendar-panel__period.has-data").length, 0);

    await clickElement(targetDate);
    assert.equal(targetDate.querySelectorAll(".calendar-panel__period.has-data").length, 1);

    await clickButton(view.container, "确认");
    assert.deepEqual(confirmedValue.scheduleDraft["2099-09-07"], {
      morning: { enabled: true, start: "08:30", end: "09:30" },
      afternoon: { enabled: false, start: "", end: "" },
      evening: { enabled: false, start: "", end: "" }
    });
  } finally {
    await view.cleanup();
  }
});

test("排期模板开关开启后拖拽范围为每个日期设置模板", async () => {
  let confirmedValue;
  const view = await renderCalendarTime({
    canUseScheduleTemplateForDates: true,
    onConfirm: (value) => {
      confirmedValue = value;
    },
    scheduleTimeTemplate: { morning: { start: "08:30", end: "09:30" } }
  });

  try {
    await clickElement(view.container.querySelector('[role="switch"][aria-label="使用模板"]'));
    const rangeStart = view.container.querySelector('[data-date-key="2099-09-07"]');
    const rangeEnd = view.container.querySelector('[data-date-key="2099-09-08"]');
    view.container.ownerDocument.elementFromPoint = () => rangeEnd;

    await act(async () => dispatchCalendarPointer(rangeStart, "pointerdown", 7));
    await act(async () => dispatchCalendarPointer(globalThis.window, "pointermove", 7));
    await act(async () => dispatchCalendarPointer(globalThis.window, "pointerup", 7));
    await clickButton(view.container, "确认");

    assert.deepEqual(
      confirmedValue.plan.dates.map(({ date }) => date),
      ["2099-09-06", "2099-09-07", "2099-09-08"]
    );
    ["2099-09-07", "2099-09-08"].forEach((dateKey) => {
      assert.deepEqual(confirmedValue.scheduleDraft[dateKey].morning, {
        enabled: true,
        start: "08:30",
        end: "09:30"
      });
    });
  } finally {
    await view.cleanup();
  }
});

test("试课模板安排达到三天后锁定拖拽但仍允许点击取消", async () => {
  let confirmedValue;
  const view = await renderCalendarTime({
    canUseScheduleTemplateForDates: true,
    initialSummary: "2099年9月6日 9:00-11:00；2099年9月7日 9:00-11:00；2099年9月8日 9:00-11:00",
    onConfirm: (value) => {
      confirmedValue = value;
    },
    scheduleTimeTemplate: { morning: { start: "08:30", end: "09:30" } }
  });

  try {
    await clickElement(view.container.querySelector('[role="switch"][aria-label="使用模板"]'));
    const rangeStart = view.container.querySelector('[data-date-key="2099-09-09"]');
    const rangeEnd = view.container.querySelector('[data-date-key="2099-09-10"]');
    view.container.ownerDocument.elementFromPoint = () => rangeEnd;

    await act(async () => dispatchCalendarPointer(rangeStart, "pointerdown", 8));
    await act(async () => dispatchCalendarPointer(globalThis.window, "pointermove", 8));
    await act(async () => dispatchCalendarPointer(globalThis.window, "pointerup", 8));
    await clickButton(view.container, "确认");

    assert.deepEqual(
      confirmedValue.plan.dates.map(({ date }) => date),
      ["2099-09-06", "2099-09-07", "2099-09-08"]
    );

    const selectedDate = view.container.querySelector('[data-date-key="2099-09-07"]');
    await clickElement(selectedDate);
    assert.equal(selectedDate.classList.contains("active"), true);
    await clickElement(selectedDate);
    await clickButton(view.container, "确认");
    assert.deepEqual(
      confirmedValue.plan.dates.map(({ date }) => date),
      ["2099-09-06", "2099-09-08"]
    );
  } finally {
    await view.cleanup();
  }
});

test("试课模板拖拽超过剩余名额时保留前三天并进入锁定", async () => {
  let confirmedValue;
  const view = await renderCalendarTime({
    canUseScheduleTemplateForDates: true,
    initialSummary: "2099年9月6日 9:00-11:00；2099年9月7日 9:00-11:00",
    onConfirm: (value) => {
      confirmedValue = value;
    },
    scheduleTimeTemplate: { morning: { start: "08:30", end: "09:30" } }
  });

  try {
    await clickElement(view.container.querySelector('[role="switch"][aria-label="使用模板"]'));
    const rangeStart = view.container.querySelector('[data-date-key="2099-09-08"]');
    const rangeEnd = view.container.querySelector('[data-date-key="2099-09-10"]');
    view.container.ownerDocument.elementFromPoint = () => rangeEnd;

    await act(async () => dispatchCalendarPointer(rangeStart, "pointerdown", 10));
    await act(async () => dispatchCalendarPointer(globalThis.window, "pointermove", 10));
    await act(async () => dispatchCalendarPointer(globalThis.window, "pointerup", 10));
    await clickButton(view.container, "确认");

    assert.deepEqual(
      confirmedValue.plan.dates.map(({ date }) => date),
      ["2099-09-06", "2099-09-07", "2099-09-08"]
    );
  } finally {
    await view.cleanup();
  }
});

test("正式课程模板安排不受试课三天上限限制", async () => {
  let confirmedValue;
  const view = await renderCalendarTime({
    canUseScheduleTemplateForDates: true,
    initialSummary: "2099年9月6日 9:00-11:00；2099年9月7日 9:00-11:00；2099年9月8日 9:00-11:00",
    maxScheduleDates: null,
    onConfirm: (value) => {
      confirmedValue = value;
    },
    scheduleTimeTemplate: { morning: { start: "08:30", end: "09:30" } },
    scheduleType: "arranged"
  });

  try {
    await clickElement(view.container.querySelector('[role="switch"][aria-label="使用模板"]'));
    const rangeStart = view.container.querySelector('[data-date-key="2099-09-09"]');
    const rangeEnd = view.container.querySelector('[data-date-key="2099-09-10"]');
    view.container.ownerDocument.elementFromPoint = () => rangeEnd;

    await act(async () => dispatchCalendarPointer(rangeStart, "pointerdown", 9));
    await act(async () => dispatchCalendarPointer(globalThis.window, "pointermove", 9));
    await act(async () => dispatchCalendarPointer(globalThis.window, "pointerup", 9));
    await clickButton(view.container, "确认");

    assert.deepEqual(
      confirmedValue.plan.dates.map(({ date }) => date),
      ["2099-09-06", "2099-09-07", "2099-09-08", "2099-09-09", "2099-09-10"]
    );
  } finally {
    await view.cleanup();
  }
});

test("空时段使用时段图标并渲染带端点时间的两个十分钟滑块", () => {
  const markup = renderToStaticMarkup(
    React.createElement(TimePanel, {
      activeDateHasSchedule: false,
      activeDateLabel: "2026年9月6日",
      isActiveDatePast: false,
      isSavingScheduleTimeTemplate: false,
      onCancelAll: () => {},
      onChangePeriodRange: () => {},
      onClearPeriod: () => {},
      onSaveScheduleTimeTemplate: () => {},
      periods: trialSchedulePeriods.map((period) => ({
        enabled: false,
        end: "",
        isClearDisabled: true,
        isTimeInputDisabled: false,
        ...period,
        start: ""
      }))
    })
  );

  assert.match(markup, /type="range"[^>]*min="480"[^>]*max="720"[^>]*step="10"/);
  assert.equal((markup.match(/type="range"/g) ?? []).length, 6);
  assert.match(markup, /class="[^"]*time-panel__period-icon/);
  assert.match(markup, /class="lucide lucide-sunrise/);
  assert.match(markup, /class="lucide lucide-sun /);
  assert.match(markup, /class="lucide lucide-moon /);
  assert.doesNotMatch(markup, /<strong>(上午|下午|晚上)<\/strong>/);
  assert.match(markup, /class="time-panel__range-endpoint time-panel__range-endpoint--start">08:00<\/span>/);
  assert.match(markup, /class="time-panel__range-endpoint time-panel__range-endpoint--end">12:00<\/span>/);
  assert.match(markup, /class="time-panel__range-endpoint time-panel__range-endpoint--start">12:00<\/span>/);
  assert.match(markup, /class="time-panel__range-endpoint time-panel__range-endpoint--end">18:00<\/span>/);
  assert.match(markup, /class="time-panel__range-endpoint time-panel__range-endpoint--start">18:00<\/span>/);
  assert.match(markup, /class="time-panel__range-endpoint time-panel__range-endpoint--end">22:00<\/span>/);
  assert.doesNotMatch(markup, /time-panel__time-output/);
  assert.match(markup, /<button[^>]*>重置<\/button>/);
  assert.doesNotMatch(markup, /<button[^>]*>清空<\/button>/);
  assert.match(markup, /取消全选/);
  assert.match(markup, /记为模板/);
  assert.doesNotMatch(markup, /使用模板/);
  assert.doesNotMatch(markup, />全选</);
});

test("有效选择范围显示在滑块开始和结束时间之间", () => {
  const markup = renderToStaticMarkup(
    React.createElement(TimePanel, {
      activeDateHasSchedule: true,
      activeDateLabel: "2026年9月6日",
      isActiveDatePast: false,
      isSavingScheduleTimeTemplate: false,
      onCancelAll: () => {},
      onChangePeriodRange: () => {},
      onClearPeriod: () => {},
      onSaveScheduleTimeTemplate: () => {},
      periods: [
        {
          enabled: true,
          end: "10:00",
          isClearDisabled: false,
          isTimeInputDisabled: false,
          key: "morning",
          label: "上午",
          maxTime: "12:00",
          minTime: "08:00",
          start: "09:00"
        }
      ]
    })
  );
  const rangeMeta = markup.match(/<div class="time-panel__range-meta">([\s\S]*?)<\/div>/)?.[1];

  assert.ok(rangeMeta);
  assert.match(
    rangeMeta,
    /time-panel__range-endpoint--start">08:00<\/span>[\s\S]*time-panel__time-output[\s\S]*09:00[\s\S]*10:00[\s\S]*time-panel__range-endpoint--end">12:00<\/span>/
  );
});

test("有效选择范围文字使用主题色", () => {
  const timeOutputRule = timePanelStyles.match(/\.time-panel__time-output\s*\{([^}]*)\}/s)?.[1];

  assert.ok(timeOutputRule);
  assert.match(timeOutputRule, /color:\s*var\(--h5-accent\)/);
});

test("TimePanel 激活描边不参与盒模型且不会改变行高", () => {
  const periodLabelRule = timePanelStyles.match(/\.time-panel__period-label\s*\{([^}]*)\}/s)?.[1];
  const selectedPeriodLabelRule = timePanelStyles.match(
    /\.time-panel__row\.selected\s+\.time-panel__period-label\s*\{([^}]*)\}/s
  )?.[1];
  const focusedTrackRule = timePanelStyles.match(
    /\.time-panel__range-control:focus-within\s+\.time-panel__range-track\s*\{([^}]*)\}/s
  )?.[1];

  assert.ok(periodLabelRule);
  assert.ok(selectedPeriodLabelRule);
  assert.ok(focusedTrackRule);
  assert.match(timePanelStyles, /\.time-panel__row\s*\{[^}]*min-height:\s*30px/s);
  assert.match(periodLabelRule, /box-sizing:\s*border-box/);
  assert.match(periodLabelRule, /height:\s*30px/);
  assert.match(periodLabelRule, /border:\s*0/);
  assert.match(periodLabelRule, /box-shadow:\s*inset/);
  assert.doesNotMatch(selectedPeriodLabelRule, /\bborder(?:-[a-z-]+)?\s*:/);
  assert.match(selectedPeriodLabelRule, /box-shadow:\s*inset/);
  assert.doesNotMatch(focusedTrackRule, /\bborder(?:-[a-z-]+)?\s*:/);
});

test("TimePanel 轨道填充层和拖拽点使用统一圆角几何", () => {
  const rangeControlRule = timePanelStyles.match(/\.time-panel__range-control\s*\{([^}]*)\}/s)?.[1];
  const rangeTrackRule = timePanelStyles.match(/\.time-panel__range-track\s*\{([^}]*)\}/s)?.[1];
  const rangeFillRule = timePanelStyles.match(/\.time-panel__range-track::after\s*\{([^}]*)\}/s)?.[1];
  const webkitThumbRule = timePanelStyles.match(
    /\.time-panel__range-input::-webkit-slider-thumb\s*\{([^}]*)\}/s
  )?.[1];
  const mozThumbRule = timePanelStyles.match(/\.time-panel__range-input::-moz-range-thumb\s*\{([^}]*)\}/s)?.[1];
  const disabledWebkitThumbRule = timePanelStyles.match(
    /\.time-panel__range-input:disabled::-webkit-slider-thumb\s*\{([^}]*)\}/s
  )?.[1];
  const disabledMozThumbRule = timePanelStyles.match(
    /\.time-panel__range-input:disabled::-moz-range-thumb\s*\{([^}]*)\}/s
  )?.[1];

  assert.ok(rangeControlRule);
  assert.ok(rangeTrackRule);
  assert.ok(rangeFillRule);
  assert.ok(webkitThumbRule);
  assert.ok(mozThumbRule);
  assert.ok(disabledWebkitThumbRule);
  assert.ok(disabledMozThumbRule);
  assert.match(rangeControlRule, /--time-range-fill:/);
  assert.match(rangeTrackRule, /height:\s*10px/);
  assert.match(rangeTrackRule, /border-radius:\s*5px/);
  assert.doesNotMatch(rangeTrackRule, /linear-gradient/);
  assert.match(rangeFillRule, /left:\s*var\(--time-range-start\)/);
  assert.match(rangeFillRule, /right:\s*calc\(100%\s*-\s*var\(--time-range-end\)\)/);
  assert.match(rangeFillRule, /border-radius:\s*inherit/);
  assert.match(webkitThumbRule, /width:\s*16px/);
  assert.match(webkitThumbRule, /height:\s*10px/);
  assert.match(webkitThumbRule, /margin-top:\s*0/);
  assert.match(webkitThumbRule, /border-radius:\s*5px/);
  assert.match(webkitThumbRule, /background:\s*var\(--time-range-fill\)/);
  assert.match(mozThumbRule, /width:\s*16px/);
  assert.match(mozThumbRule, /height:\s*10px/);
  assert.match(mozThumbRule, /border-radius:\s*5px/);
  assert.match(mozThumbRule, /background:\s*var\(--time-range-fill\)/);
  assert.match(disabledWebkitThumbRule, /background:\s*var\(--time-range-fill\)/);
  assert.match(disabledMozThumbRule, /background:\s*var\(--time-range-fill\)/);
});

test("TimePanel 拖拽点使用适度加宽的内部高光", () => {
  const webkitThumbRule = timePanelStyles.match(
    /\.time-panel__range-input::-webkit-slider-thumb\s*\{([^}]*)\}/s
  )?.[1];
  const mozThumbRule = timePanelStyles.match(/\.time-panel__range-input::-moz-range-thumb\s*\{([^}]*)\}/s)?.[1];
  const innerHighlight =
    /box-shadow:\s*inset 0 0 0 1\.5px color-mix\(in srgb, var\(--h5-surface-solid\) 56%, transparent\)/;

  assert.ok(webkitThumbRule);
  assert.ok(mozThumbRule);
  assert.match(webkitThumbRule, innerHighlight);
  assert.match(mozThumbRule, innerHighlight);
});

test("历史异常时段以只读原文行展示并保留重置入口", () => {
  const markup = renderToStaticMarkup(
    React.createElement(TimePanel, {
      activeDateHasSchedule: true,
      activeDateLabel: "2099年9月6日",
      isActiveDatePast: false,
      isSavingScheduleTimeTemplate: false,
      onCancelAll: () => {},
      onChangePeriodRange: () => {},
      onClearPeriod: () => {},
      onSaveScheduleTimeTemplate: () => {},
      periods: [
        {
          enabled: true,
          end: "",
          isClearDisabled: false,
          isTimeInputDisabled: true,
          key: "morning",
          label: "上午",
          legacyRange: { end: "10:05", start: "09:05" },
          maxTime: "12:00",
          minTime: "08:00",
          start: ""
        }
      ]
    })
  );

  assert.match(markup, /time-panel__row[^"]*legacy/);
  assert.match(markup, /历史异常时段/);
  assert.match(markup, /09:05/);
  assert.match(markup, /10:05/);
  assert.doesNotMatch(markup, /type="range"/);
  assert.match(markup, /<button[^>]*>重置<\/button>/);
});

test("非过去且未占用的历史异常时段可重置后重新显示双滑块", async () => {
  const view = await renderCalendarTime({
    initialSummary: "2099年9月6日 09:05-10:05",
    onConfirm: () => {}
  });

  try {
    const legacyRow = view.container.querySelector(".time-panel__row.legacy");

    assert.ok(legacyRow);
    assert.equal(legacyRow.querySelectorAll('input[type="range"]').length, 0);
    assert.equal(legacyRow.querySelector(".time-panel__reset-button")?.disabled, false);

    await clickButton(view.container, "重置");

    const resetMorningRow = view.container.querySelector(".time-panel__row");
    assert.ok(resetMorningRow);
    assert.ok(!resetMorningRow.classList.contains("legacy"));
    assert.equal(resetMorningRow.querySelectorAll('input[type="range"]').length, 2);
  } finally {
    await view.cleanup();
  }
});

test("已占用的历史异常时段保持只读且不允许清空", () => {
  const initialValue = getTrialScheduleValueFromSummary("2099年9月6日 09:05-10:05");
  const schedule = renderTrialSchedule({
    blockedScheduleSummary: "2099年9月6日 8:00-10:00",
    initialValue
  }, "2099-09-06");
  const morning = schedule.periods.find((period) => period.key === "morning");

  assert.ok(morning);
  assert.equal(morning.isTimeInputDisabled, true);
  assert.equal(morning.isClearDisabled, true);
});

test("其他家教需求占用上午任意时间后锁定当天整个上午", () => {
  const schedule = renderTrialSchedule(
    {
      occupiedTestedDates: [
        {
          date: "2099-09-06",
          timeRanges: [{ start: "08:30", end: "09:30" }]
        }
      ]
    },
    "2099-09-06"
  );
  const morning = schedule.periods.find((period) => period.key === "morning");
  const afternoon = schedule.periods.find((period) => period.key === "afternoon");

  assert.equal(morning?.isUnavailable, true);
  assert.equal(morning?.isTimeInputDisabled, true);
  assert.equal(afternoon?.isUnavailable, false);
  assert.equal(afternoon?.isTimeInputDisabled, false);
});

test("统一申请列表按申请状态暴露对应流程动作", () => {
  const cases = [
    ["APPLICATION_PENDING", ["scheduleTrial", "rejectTrial"]],
    ["TRIAL_CONFIRMING", ["rescheduleTrial", "cancelApplication"]],
    ["TRIALING", ["requestTrialResult"]],
    ["TRIAL_END_CONFIRMING", ["confirmTrialEnd"]],
    ["TRIAL_RESULT_PROCESSING", ["offerTutorService", "closeTrialContinueRecruiting"]],
    ["TRIAL_SETTLED_SERVICE_PENDING", ["offerTutorService", "closeTrialContinueRecruiting"]],
    ["SERVICE_CONFIRMING", ["cancelServiceConfirmation"]],
    ["SERVICE_SCHEDULE_PENDING", ["submitServiceSchedule", "cancelServiceConfirmation"]],
    ["SERVICE_SCHEDULE_CONFIRMING", ["requestServiceEnd"]],
    ["FORMAL_SERVICE", ["requestServiceEnd"]],
    ["SERVICE_END_CONFIRMING", ["requestServiceEnd"]],
    ["SETTLEMENT_CONFIRMING", []],
    ["SETTLEMENT_REVISING", ["resubmitSettlement"]],
    ["SYSTEM_SETTLING", []],
    ["FORMAL_SERVICE_INVALID", ["offerTutorService", "removeRejectedServiceOffer"]]
  ];

  cases.forEach(([status, expectedActions]) => {
    const task = createTutorTaskModel({ candidate: { status }, role: "parent" });

    assert.equal(task.isApplicationListVisible, true, status);
    assert.deepEqual(task.availableActions, expectedActions, status);
  });
});

test("模板包含家长账号已占用时段时整次应用失败", () => {
  const schedule = renderTrialSchedule(
    {
      occupiedTestedDates: [
        {
          date: "2099-09-06",
          timeRanges: [{ start: "10:00", end: "11:00" }]
        }
      ]
    },
    "2099-09-06"
  );

  assert.deepEqual(
    schedule.applyScheduleTimeTemplateToDates(
      ["2099-09-06"],
      ["2099-09-06"],
      { morning: { start: "08:00", end: "09:00" } }
    ),
    { ok: false, reason: "模板包含已占用时段" }
  );
});

test("双滑块交叉时原子回调将起止值夹紧到同一位置", () => {
  const changes = [];
  const tree = TimePanel({
    activeDateHasSchedule: true,
    activeDateLabel: "2026年9月6日",
    isActiveDatePast: false,
    isSavingScheduleTimeTemplate: false,
    onCancelAll: () => {},
    onChangePeriodRange: (...args) => changes.push(args),
    onClearPeriod: () => {},
    onSaveScheduleTimeTemplate: () => {},
    periods: [
      {
        enabled: true,
        end: "10:00",
        isClearDisabled: false,
        isTimeInputDisabled: false,
        key: "morning",
        label: "上午",
        maxTime: "12:00",
        minTime: "08:00",
        start: "09:00"
      }
    ]
  });
  const ranges = findReactElements(tree, (element) => element.type === "input" && element.props.type === "range");

  assert.equal(ranges.length, 2);
  ranges[0].props.onChange({ target: { value: "660" } });
  ranges[1].props.onChange({ target: { value: "480" } });
  assert.deepEqual(changes, [
    ["morning", "10:00", "10:00"],
    ["morning", "09:00", "09:00"]
  ]);
});

test("滑块重合后保留当前位置且日期单元格不显示日程", async () => {
  const view = await renderCalendarTime({
    initialSummary: "2099年9月6日 09:00-10:00",
    onConfirm: () => {}
  });

  try {
    const rangeControl = view.container.querySelector(".time-panel__range-control");

    assert.ok(rangeControl);
    rangeControl.getBoundingClientRect = () => ({
      bottom: 36,
      height: 36,
      left: 0,
      right: 240,
      top: 0,
      width: 240,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
    rangeControl.setPointerCapture = () => {};
    rangeControl.hasPointerCapture = () => false;

    function dispatchPointer(type, clientX) {
      const event = new globalThis.MouseEvent(type, {
        bubbles: true,
        buttons: type === "pointerup" ? 0 : 1,
        clientX
      });

      Object.defineProperties(event, {
        pointerId: { value: 10 },
        pointerType: { value: "mouse" }
      });
      rangeControl.dispatchEvent(event);
    }

    await act(async () => dispatchPointer("pointerdown", 60));
    await act(async () => dispatchPointer("pointermove", 120));
    await act(async () => dispatchPointer("pointerup", 120));

    const collapsedRanges = view.container.querySelectorAll('.time-panel__row input[type="range"]');
    const dateButton = view.container.querySelector('[data-date-key="2099-09-06"]');

    assert.equal(collapsedRanges[0]?.value, "600");
    assert.equal(collapsedRanges[1]?.value, "600");
    assert.ok(dateButton);
    assert.equal(dateButton.classList.contains("selected"), false);
    assert.equal(dateButton.querySelectorAll(".calendar-panel__period.has-data").length, 0);
  } finally {
    await view.cleanup();
  }
});

test("十分钟短区间通过轨道指针事件仍可分别调整开始与结束", async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: "http://127.0.0.1/"
  });
  const previousGlobals = new Map();

  [
    ["document", dom.window.document],
    ["Event", dom.window.Event],
    ["HTMLElement", dom.window.HTMLElement],
    ["MouseEvent", dom.window.MouseEvent],
    ["navigator", dom.window.navigator],
    ["window", dom.window],
    ["IS_REACT_ACT_ENVIRONMENT", true]
  ].forEach(([key, value]) => {
    previousGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
  });
  dom.window.HTMLElement.prototype.attachEvent = () => {};
  dom.window.HTMLElement.prototype.detachEvent = () => {};

  const changes = [];
  const container = dom.window.document.getElementById("root");
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        React.createElement(TimePanel, {
          activeDateHasSchedule: true,
          activeDateLabel: "2026年9月6日",
          isActiveDatePast: false,
          isSavingScheduleTimeTemplate: false,
          onCancelAll: () => {},
          onChangePeriodRange: (...args) => changes.push(args),
          onClearPeriod: () => {},
          onSaveScheduleTimeTemplate: () => {},
          periods: [
            {
              enabled: true,
              end: "09:10",
              isClearDisabled: false,
              isTimeInputDisabled: false,
              key: "morning",
              label: "上午",
              maxTime: "12:00",
              minTime: "08:00",
              start: "09:00"
            }
          ]
        })
      );
    });

    const rangeControl = container.querySelector(".time-panel__range-control");
    const capturedPointerIds = [];
    const releasedPointerIds = [];
    const activePointerIds = new Set();

    assert.ok(rangeControl);
    rangeControl.getBoundingClientRect = () => ({
      bottom: 30,
      height: 30,
      left: 0,
      right: 48,
      top: 0,
      width: 48,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
    rangeControl.setPointerCapture = (pointerId) => {
      capturedPointerIds.push(pointerId);
      activePointerIds.add(pointerId);
    };
    rangeControl.hasPointerCapture = (pointerId) => activePointerIds.has(pointerId);
    rangeControl.releasePointerCapture = (pointerId) => {
      releasedPointerIds.push(pointerId);
      activePointerIds.delete(pointerId);
    };

    function dispatchPointer(type, clientX, pointerId) {
      const event = new globalThis.MouseEvent(type, {
        bubbles: true,
        buttons: type === "pointerup" ? 0 : 1,
        clientX
      });
      Object.defineProperties(event, {
        pointerId: { value: pointerId },
        pointerType: { value: "mouse" }
      });
      rangeControl.dispatchEvent(event);
    }

    await act(async () => dispatchPointer("pointerdown", 12, 7));
    assert.equal(dom.window.document.activeElement?.getAttribute("aria-label"), "上午开始时间");
    await act(async () => dispatchPointer("pointermove", 10, 7));
    assert.deepEqual(changes.at(-1), ["morning", "08:50", "09:10"]);
    await act(async () => dispatchPointer("pointerup", 10, 7));

    await act(async () => dispatchPointer("pointerdown", 14, 8));
    assert.equal(dom.window.document.activeElement?.getAttribute("aria-label"), "上午结束时间");
    await act(async () => dispatchPointer("pointermove", 16, 8));
    assert.deepEqual(changes.at(-1), ["morning", "09:00", "09:20"]);
    await act(async () => dispatchPointer("pointerup", 16, 8));

    assert.deepEqual(capturedPointerIds, [7, 8]);
    assert.deepEqual(releasedPointerIds, [7, 8]);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    previousGlobals.forEach((descriptor, key) => {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        delete globalThis[key];
      }
    });
  }
});

test("空上午从重合起点向右拖动时选择结束端并创建十分钟区间", async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: "http://127.0.0.1/"
  });
  const previousGlobals = new Map();

  [
    ["document", dom.window.document],
    ["Event", dom.window.Event],
    ["HTMLElement", dom.window.HTMLElement],
    ["MouseEvent", dom.window.MouseEvent],
    ["navigator", dom.window.navigator],
    ["window", dom.window],
    ["IS_REACT_ACT_ENVIRONMENT", true]
  ].forEach(([key, value]) => {
    previousGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
  });
  dom.window.HTMLElement.prototype.attachEvent = () => {};
  dom.window.HTMLElement.prototype.detachEvent = () => {};

  const changes = [];
  const container = dom.window.document.getElementById("root");
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        React.createElement(TimePanel, {
          activeDateHasSchedule: false,
          activeDateLabel: "2026年9月6日",
          isActiveDatePast: false,
          isSavingScheduleTimeTemplate: false,
          onCancelAll: () => {},
          onChangePeriodRange: (...args) => changes.push(args),
          onClearPeriod: () => {},
          onSaveScheduleTimeTemplate: () => {},
          periods: [
            {
              enabled: false,
              end: "",
              isClearDisabled: true,
              isTimeInputDisabled: false,
              key: "morning",
              label: "上午",
              maxTime: "12:00",
              minTime: "08:00",
              start: ""
            }
          ]
        })
      );
    });

    const rangeControl = container.querySelector(".time-panel__range-control");
    const capturedPointerIds = [];
    const releasedPointerIds = [];
    const activePointerIds = new Set();

    assert.ok(rangeControl);
    rangeControl.getBoundingClientRect = () => ({
      bottom: 30,
      height: 30,
      left: 0,
      right: 48,
      top: 0,
      width: 48,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
    rangeControl.setPointerCapture = (pointerId) => {
      capturedPointerIds.push(pointerId);
      activePointerIds.add(pointerId);
    };
    rangeControl.hasPointerCapture = (pointerId) => activePointerIds.has(pointerId);
    rangeControl.releasePointerCapture = (pointerId) => {
      releasedPointerIds.push(pointerId);
      activePointerIds.delete(pointerId);
    };

    function dispatchPointer(type, clientX, pointerId) {
      const event = new globalThis.MouseEvent(type, {
        bubbles: true,
        buttons: type === "pointerup" ? 0 : 1,
        clientX
      });
      Object.defineProperties(event, {
        pointerId: { value: pointerId },
        pointerType: { value: "mouse" }
      });
      rangeControl.dispatchEvent(event);
    }

    await act(async () => dispatchPointer("pointerdown", 0, 9));
    await act(async () => dispatchPointer("pointermove", 2, 9));

    assert.equal(dom.window.document.activeElement?.getAttribute("aria-label"), "上午结束时间");
    assert.deepEqual(changes, [["morning", "08:00", "08:10"]]);

    await act(async () => dispatchPointer("pointerup", 2, 9));
    assert.deepEqual(capturedPointerIds, [9]);
    assert.deepEqual(releasedPointerIds, [9]);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    previousGlobals.forEach((descriptor, key) => {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        delete globalThis[key];
      }
    });
  }
});

test("过去日期的双滑块和 TimePanel 两项操作全部保持禁用", () => {
  const markup = renderToStaticMarkup(
    React.createElement(TimePanel, {
      activeDateHasSchedule: true,
      activeDateLabel: "2020年1月15日",
      isActiveDatePast: true,
      isSavingScheduleTimeTemplate: false,
      onCancelAll: () => {},
      onChangePeriodRange: () => {},
      onClearPeriod: () => {},
      onSaveScheduleTimeTemplate: () => {},
      periods: [
        {
          enabled: true,
          end: "11:00",
          isClearDisabled: true,
          isTimeInputDisabled: true,
          key: "morning",
          label: "上午",
          maxTime: "12:00",
          minTime: "08:00",
          start: "09:00"
        }
      ]
    })
  );

  const ranges = markup.match(/<input[^>]*type="range"[^>]*>/g) ?? [];

  assert.equal(ranges.length, 2);
  ranges.forEach((range) => assert.match(range, /disabled=""/));
  ["取消全选", "记为模板"].forEach((label) => {
    assert.match(markup, new RegExp(`<button[^>]*disabled=""[^>]*>${label}<\\/button>`));
  });
  assert.doesNotMatch(markup, /使用模板/);
});

test("记为模板通过资料接口保存当前日程并同步全局模板", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init });
    return new globalThis.Response(
      JSON.stringify({
        code: "OK",
        message: "OK",
        data: { afternoon: { start: "13:00", end: "15:00" } }
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  };
  const view = await renderCalendarTime({ canUseScheduleTemplateForDates: true, onConfirm: () => {} });

  try {
    await clickButton(view.container, "记为模板");

    assert.equal(requests.length, 1);
    assert.match(String(requests[0].url), /\/client\/profile\/schedule-time-template$/);
    assert.equal(requests[0].init.method, "PUT");
    assert.deepEqual(JSON.parse(requests[0].init.body), {
      afternoon: { start: "13:00", end: "15:00" }
    });
    assert.equal(getMessageToastSnapshot()?.content, "时间模板已更新。");
    assert.equal(view.container.querySelector('[role="switch"][aria-label="使用模板"]')?.disabled, false);
  } finally {
    await view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("历史异常时段保存模板时明确拒绝且不调用资料接口", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init });
    return new globalThis.Response(
      JSON.stringify({
        code: "OK",
        message: "OK",
        data: { morning: { start: "09:00", end: "10:00" } }
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  };
  const view = await renderCalendarTime({
    initialSummary: "2099年9月6日 09:05-10:05",
    onConfirm: () => {}
  });

  try {
    await clickButton(view.container, "记为模板");

    assert.equal(requests.length, 0);
    assert.equal(getMessageToastSnapshot()?.content, "请先清空并重新设置历史异常时段。");
  } finally {
    await view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("模板开关对重新选入的日期整组覆盖并清空模板外时段", async () => {
  let confirmedValue;
  const view = await renderCalendarTime({
    canUseScheduleTemplateForDates: true,
    onConfirm: (value) => {
      confirmedValue = value;
    },
    scheduleTimeTemplate: { morning: { start: "08:30", end: "09:30" } }
  });

  try {
    await clickElement(view.container.querySelector('[role="switch"][aria-label="使用模板"]'));
    const activeDate = view.container.querySelector('[data-date-key="2099-09-06"]');
    await clickElement(activeDate);
    await clickElement(activeDate);
    await clickButton(view.container, "确认");

    assert.deepEqual(confirmedValue.scheduleDraft["2099-09-06"], {
      morning: { enabled: true, start: "08:30", end: "09:30" },
      afternoon: { enabled: false, start: "", end: "" },
      evening: { enabled: false, start: "", end: "" }
    });
  } finally {
    await view.cleanup();
  }
});

test("模板命中占用时提示原因并保留当前手工安排", async () => {
  let confirmedValue;
  const view = await renderCalendarTime({
    blockedScheduleSummary: "2099年9月7日 8:00-10:00",
    canUseScheduleTemplateForDates: true,
    onConfirm: (value) => {
      confirmedValue = value;
    },
    scheduleTimeTemplate: { morning: { start: "08:30", end: "09:30" } }
  });

  try {
    await clickElement(view.container.querySelector('[role="switch"][aria-label="使用模板"]'));
    const blockedDate = view.container.querySelector('[data-date-key="2099-09-07"]');
    await clickElement(blockedDate);
    await clickElement(blockedDate);
    await clickButton(view.container, "确认");

    assert.equal(getMessageToastSnapshot()?.content, "模板包含已占用时段");
    assert.deepEqual(confirmedValue.scheduleDraft["2099-09-06"], {
      morning: { enabled: false, start: "", end: "" },
      afternoon: { enabled: true, start: "13:00", end: "15:00" },
      evening: { enabled: false, start: "", end: "" }
    });
  } finally {
    await view.cleanup();
  }
});

test("试课安排动态副标题使用独立红色提示样式", () => {
  assert.match(tutorApplicationsSource, /className="trial-schedule-sheet__hint"/);
  assert.match(
    calendarTimeStyles,
    /\.trial-schedule-sheet\s+\.trial-schedule-sheet__hint\s*\{[^}]*color:\s*var\(--h5-danger\)/s
  );
});

test("Switch 支持 mini、small、default、large 四档尺寸且默认保持原尺寸", () => {
  const sizes = ["mini", "small", "default", "large"];

  sizes.forEach((size) => {
    const markup = renderToStaticMarkup(
      React.createElement(Switch, {
        checked: false,
        label: `${size} 开关`,
        onChange: () => {},
        size
      })
    );

    assert.match(markup, new RegExp(`switch-control--${size}`));
  });

  const defaultMarkup = renderToStaticMarkup(
    React.createElement(Switch, {
      checked: false,
      label: "默认开关",
      onChange: () => {}
    })
  );

  assert.match(defaultMarkup, /switch-control--default/);
  assert.match(switchStyles, /\.switch-control--mini\s*\{[^}]*--switch-width:\s*30px[^}]*--switch-height:\s*18px/s);
  assert.match(switchStyles, /\.switch-control--small\s*\{[^}]*--switch-width:\s*36px[^}]*--switch-height:\s*20px/s);
  assert.match(switchStyles, /\.switch-control--default\s*\{[^}]*--switch-width:\s*42px[^}]*--switch-height:\s*24px/s);
  assert.match(switchStyles, /\.switch-control--large\s*\{[^}]*--switch-width:\s*50px[^}]*--switch-height:\s*28px/s);
  assert.match(switchStyles, /transform:\s*translateX\(var\(--switch-thumb-translate\)\)/);
});

test("TimePanel 不再提供整日全选入口", () => {
  const markup = renderToStaticMarkup(
    React.createElement(TimePanel, {
      activeDateHasSchedule: false,
      activeDateLabel: "2026年9月6日",
      isActiveDatePast: false,
      isSavingScheduleTimeTemplate: false,
      onCancelAll: () => {},
      onChangePeriodRange: () => {},
      onClearPeriod: () => {},
      onSaveScheduleTimeTemplate: () => {},
      periods: []
    })
  );

  assert.doesNotMatch(markup, /最多安排/);
  assert.doesNotMatch(markup, />全选<\/button>/);
});

test("计划日期只由 plannedDates 添加 planned 状态类", () => {
  const markup = renderToStaticMarkup(
    React.createElement(CalendarPanel, {
      activeDate: "2026-09-06",
      mode: "view",
      plannedDates: ["2026-09-06", "2026-09-08"]
    })
  );
  const plannedDateClasses = getDateStateClasses(markup, "2026-09-06");
  const anotherPlannedDateClasses = getDateStateClasses(markup, "2026-09-08");

  assert.ok(plannedDateClasses.has("planned"));
  assert.ok(!plannedDateClasses.has("selected"));
  assert.ok(anotherPlannedDateClasses.has("planned"));
  assert.ok(!anotherPlannedDateClasses.has("selected"));
  assert.ok(!anotherPlannedDateClasses.has("arranged"));
});

test("日历打开时统一查看当天且不被已有计划日期覆盖", () => {
  const todayKey = getTutorDateKey(new Date());
  let defaultDate;
  const schedule = renderTrialSchedule({ plannedDates: ["2099-12-31"] });
  const markup = renderToStaticMarkup(
    React.createElement(CalendarPanel, {
      mode: "view",
      plannedDates: ["2099-12-31"]
    })
  );
  const [year, month] = todayKey.split("-");

  assert.doesNotThrow(() => {
    defaultDate = getDefaultTutorScheduleDate();
  });
  assert.equal(defaultDate, todayKey);
  assert.equal(schedule.activeDate, todayKey);
  assert.match(markup, new RegExp(`${year}年${Number(month)}月`));
  assert.doesNotMatch(markup, /2099年12月/);
  assert.ok(getDateStateClasses(markup, todayKey).has("active"));
});

test("计划日期使用背景色且不再显示圆点标记", () => {
  assert.match(calendarPanelStyles, /\.calendar-panel__day\.planned[^{]*[{][^}]*(?:background|background-color)\s*:/);
  assert.doesNotMatch(calendarPanelStyles, /\.calendar-panel__day\.planned::after/);
  assert.doesNotMatch(calendarPanelStyles, /\.selected/);
  assert.doesNotMatch(calendarPanelStyles, /\.calendar-panel__day\.arranged/);
});

test("日期单元格样式优先级为 active 高于 past 高于 planned", () => {
  const plannedRuleIndex = calendarPanelStyles.indexOf(".calendar-panel__day.planned {");
  const pastRuleIndex = calendarPanelStyles.indexOf(".calendar-panel__day.past {");
  const activeRuleIndex = calendarPanelStyles.indexOf(".calendar-panel__day.active {");

  assert.ok(plannedRuleIndex >= 0);
  assert.ok(pastRuleIndex > plannedRuleIndex);
  assert.ok(activeRuleIndex > pastRuleIndex);
  assert.match(calendarPanelStyles, /\.calendar-panel__day\.past\s*\{[^}]*opacity:\s*0\.[0-9]+/);
  assert.match(calendarPanelStyles, /\.calendar-panel__day\.active\s*\{[^}]*opacity:\s*1/);
  assert.doesNotMatch(calendarPanelStyles, /\.calendar-panel__day\.past:not\(\.planned\)/);
});

test("日历日期文字区分未来、过去和当天状态", () => {
  assert.match(
    calendarPanelStyles,
    /\.calendar-panel__day strong\s*\{[^}]*color:\s*var\(--h5-accent\)/
  );
  assert.match(
    calendarPanelStyles,
    /\.calendar-panel__day\.past strong\s*\{[^}]*color:\s*var\(--h5-subtle\)/
  );
  assert.match(
    calendarPanelStyles,
    /\.calendar-panel__day\.today strong\s*\{[^}]*background:\s*var\(--h5-text\)[^}]*color:\s*var\(--h5-surface-solid\)/
  );
});
