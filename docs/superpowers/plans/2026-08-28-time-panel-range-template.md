# TimePanel Range Slider And User Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `TimePanel` time inputs with 10-minute dual range sliders and persist one date-independent schedule template per logged-in user.

**Architecture:** Store the template as validated JSONB on `app_user`, expose it through the existing client profile/home contracts, and keep it in `GlobalProvider`. `CalendarTime` owns template persistence and schedule application, while `TimePanel` remains a controlled UI component and `useTrialSchedule` owns atomic range state and schedule constraints.

**Tech Stack:** Java 21, Spring Boot 3.3, JdbcTemplate, PostgreSQL JSONB, Flyway, React 18, TypeScript, Vite, Less, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-28-time-panel-range-template-design.md`

## Global Constraints

- Do not add a frontend slider dependency; use two native `input[type="range"]` controls.
- Slider step is exactly 10 minutes; ranges are morning `08:00-12:00`, afternoon `12:00-18:00`, evening `18:00-22:00`.
- A range only becomes a schedule when `end - start >= 10 minutes`; an equal pair clears that period.
- Template data contains time periods only and never contains a date.
- Do not modify `frontend/apps/h5/src/components/ScheduleCalendar/TimePanel/index copy.tsx`.
- Remove `availableScheduleSummary` only from the current `CalendarTime` editor path; do not redesign or delete later tutor workflow states/actions in this implementation.
- Preserve past-date read-only behavior, blocked-period behavior, and maximum selected-date behavior.
- The worktree already contains user changes in shared target files; do not create commits unless the user explicitly requests one.

---

### Task 1: Persist And Validate The User Schedule Template

**Files:**
- Create: `server/apps/src/main/resources/db/migration/V35__app_user_schedule_time_template.sql`
- Create: `server/apps/src/main/java/com/unknown/platform/common/api/ScheduleTimeRange.java`
- Create: `server/apps/src/main/java/com/unknown/platform/common/api/ScheduleTimeTemplate.java`
- Create: `server/apps/src/main/java/com/unknown/platform/modules/clientprofile/application/ScheduleTimeTemplatePolicy.java`
- Create: `server/apps/src/test/java/com/unknown/platform/modules/clientprofile/application/ScheduleTimeTemplatePolicyTest.java`
- Modify: `server/apps/src/main/java/com/unknown/platform/modules/clientprofile/application/ClientProfileAppService.java`
- Modify: `server/apps/src/main/java/com/unknown/platform/modules/clientprofile/controller/client/ClientProfileController.java`
- Modify: `server/apps/src/main/java/com/unknown/platform/modules/clienthome/application/ClientHomeAppService.java`
- Modify: `server/apps/src/main/java/com/unknown/platform/modules/clienthome/model/RoleProfile.java`

**Interfaces:**
- Produces: `ScheduleTimeRange(String start, String end)`.
- Produces: `ScheduleTimeTemplate(ScheduleTimeRange morning, ScheduleTimeRange afternoon, ScheduleTimeRange evening)`.
- Produces: `PUT /client/profile/schedule-time-template`, request and response both `ScheduleTimeTemplate`.
- Produces: `RoleProfile.scheduleTimeTemplate` for frontend home-profile hydration.

- [ ] **Step 1: Write the policy tests**

Create tests for a valid sparse template, a non-10-minute value, an out-of-window value, an equal range, and an empty template:

```java
@Test
void acceptsSparseTemplateOnTenMinuteBoundaries() {
  ScheduleTimeTemplate template = new ScheduleTimeTemplate(
      new ScheduleTimeRange("08:30", "11:20"),
      null,
      new ScheduleTimeRange("19:00", "21:30")
  );

  assertDoesNotThrow(() -> ScheduleTimeTemplatePolicy.validateForSave(template));
}

@Test
void rejectsEqualRange() {
  ScheduleTimeTemplate template = new ScheduleTimeTemplate(
      new ScheduleTimeRange("08:00", "08:00"), null, null
  );

  BusinessException error = assertThrows(
      BusinessException.class,
      () -> ScheduleTimeTemplatePolicy.validateForSave(template)
  );
  assertEquals("SCHEDULE_TIME_TEMPLATE_INVALID", error.code());
}
```

- [ ] **Step 2: Run the policy test and verify RED**

Run:

```bash
cd server/apps
mvn -q -Dtest=ScheduleTimeTemplatePolicyTest test
```

Expected: compilation fails because the template records and policy do not exist.

- [ ] **Step 3: Add the migration and API records**

Migration content:

```sql
ALTER TABLE app_user
  ADD COLUMN IF NOT EXISTS schedule_time_template JSONB NOT NULL DEFAULT '{}'::jsonb;
```

The template record uses nullable period fields and omits null fields from JSON:

```java
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ScheduleTimeTemplate(
    ScheduleTimeRange morning,
    ScheduleTimeRange afternoon,
    ScheduleTimeRange evening
) {
  public boolean isEmpty() {
    return morning == null && afternoon == null && evening == null;
  }
}
```

- [ ] **Step 4: Implement strict server-side policy validation**

`ScheduleTimeTemplatePolicy.validateForSave` rejects null/empty templates and validates each non-null period through one private helper. Parse with `LocalTime.parse`, require both minutes divisible by 10, enforce period bounds, and require `end.isAfter(start)`. Throw:

```java
throw new BusinessException("SCHEDULE_TIME_TEMPLATE_INVALID", "时间模板格式不正确");
```

Use exact boundaries:

```java
validateRange(template.morning(), LocalTime.of(8, 0), LocalTime.of(12, 0));
validateRange(template.afternoon(), LocalTime.of(12, 0), LocalTime.of(18, 0));
validateRange(template.evening(), LocalTime.of(18, 0), LocalTime.of(22, 0));
```

- [ ] **Step 5: Run the policy test and verify GREEN**

Run:

```bash
cd server/apps
mvn -q -Dtest=ScheduleTimeTemplatePolicyTest test
```

Expected: all policy tests pass.

- [ ] **Step 6: Implement profile update and home-profile loading**

Inject `ObjectMapper` into `ClientProfileAppService` and `ClientHomeAppService`.

Add this application-service method:

```java
@Transactional
public ScheduleTimeTemplate updateScheduleTimeTemplate(
    String authorization,
    ScheduleTimeTemplate template
) {
  long userId = clientSessionService.requireUserId(authorization);
  ScheduleTimeTemplatePolicy.validateForSave(template);
  String templateJson = writeScheduleTimeTemplate(template);
  jdbcTemplate.update(
      "UPDATE app_user SET schedule_time_template = CAST(? AS jsonb), updated_at = NOW() WHERE id = ?",
      templateJson,
      userId
  );
  return template;
}
```

Add controller method:

```java
@PutMapping("/schedule-time-template")
public ApiResponse<ScheduleTimeTemplate> updateScheduleTimeTemplate(
    ClientRequestContext context,
    @RequestBody ScheduleTimeTemplate template
) {
  return ApiResponse.ok(
      clientProfileAppService.updateScheduleTimeTemplate(context.authorization(), template)
  );
}
```

Extend the home profile SQL with `u.schedule_time_template::text AS schedule_time_template`, deserialize `{}` to an empty `ScheduleTimeTemplate`, and pass it as the final `RoleProfile` field.

- [ ] **Step 7: Compile the backend**

Run:

```bash
cd server/apps
mvn -q -DskipTests compile
```

Expected: exit code 0.

---

### Task 2: Add Shared Frontend Contracts And Global User State

**Files:**
- Modify: `frontend/apps/packages/domain/src/index.ts`
- Modify: `frontend/apps/packages/api-client/src/index.ts`
- Modify: `frontend/apps/h5/src/globalProvider.tsx`
- Create: `frontend/apps/h5/tests/schedule-time-template-contract.test.mjs`

**Interfaces:**
- Consumes: backend `ScheduleTimeTemplate` JSON shape from Task 1.
- Produces: domain `ScheduleTimeRange` and `ScheduleTimeTemplate`.
- Produces: `updateClientScheduleTimeTemplate(template): Promise<ScheduleTimeTemplate>`.
- Produces: `useGlobalUser().scheduleTimeTemplate` and `useGlobalUserActions().setScheduleTimeTemplate`.

- [ ] **Step 1: Write the frontend contract test**

Use Vite `ssrLoadModule` to import the domain/api-client source and source-text assertions for `GlobalProvider`. Assert that the type/API/context names exist and the API path is exact:

```js
test("用户时间模板契约贯通 domain、api-client 和 GlobalProvider", () => {
  assert.match(domainSource, /interface ScheduleTimeTemplate/);
  assert.match(apiClientSource, /updateClientScheduleTimeTemplate/);
  assert.match(apiClientSource, /client\/profile\/schedule-time-template/);
  assert.match(globalProviderSource, /scheduleTimeTemplate/);
  assert.match(globalProviderSource, /setScheduleTimeTemplate/);
});
```

- [ ] **Step 2: Run the contract test and verify RED**

Run:

```bash
cd frontend/apps/h5
node --test tests/schedule-time-template-contract.test.mjs
```

Expected: assertions fail because the contract is absent.

- [ ] **Step 3: Add domain and API-client contracts**

Add:

```ts
export interface ScheduleTimeRange {
  start: string;
  end: string;
}

export interface ScheduleTimeTemplate {
  morning?: ScheduleTimeRange;
  afternoon?: ScheduleTimeRange;
  evening?: ScheduleTimeRange;
}
```

Append `scheduleTimeTemplate: ScheduleTimeTemplate` to `RoleProfile` and add:

```ts
export async function updateClientScheduleTimeTemplate(
  payload: ScheduleTimeTemplate
): Promise<ScheduleTimeTemplate> {
  return requestJson<ScheduleTimeTemplate>("/client/profile/schedule-time-template", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}
```

- [ ] **Step 4: Extend GlobalProvider without adding a second state source**

Add `scheduleTimeTemplate` to `GlobalUser`, populate it from `profile?.scheduleTimeTemplate ?? {}`, and add a stable action:

```ts
const setScheduleTimeTemplate = useCallback(
  (scheduleTimeTemplate: ScheduleTimeTemplate) => {
    commitUser({ ...userRef.current, scheduleTimeTemplate });
  },
  [commitUser]
);
```

Include the action in the memoized `GlobalUserActionsContext` value. Do not persist it to localStorage; the database/home profile remains the source of truth.

- [ ] **Step 5: Run the contract test and workspace typecheck**

Run:

```bash
cd frontend/apps/h5
node --test tests/schedule-time-template-contract.test.mjs
```

Then:

```bash
cd frontend/apps
npm run typecheck:h5
```

Expected: both commands exit 0.

---

### Task 3: Make Schedule Ranges Atomic And Remove Availability Constraints

**Files:**
- Modify: `frontend/apps/h5/src/components/ScheduleCalendar/CalendarTime/model.ts`
- Modify: `frontend/apps/h5/src/components/ScheduleCalendar/CalendarTime/useTrialSchedule.ts`
- Modify: `frontend/apps/h5/src/components/ScheduleCalendar/CalendarTime/index.tsx`
- Modify: `frontend/apps/h5/src/overlays/tutor/components/TutorApplications.tsx`
- Modify: `frontend/apps/h5/src/overlays/tutor/components/TutorTrialList.tsx`
- Modify: `frontend/apps/h5/src/pages/home/auth/orders/components/OrderActions.tsx`
- Modify: `frontend/apps/h5/tests/trial-schedule-date-policy.test.mjs`

**Interfaces:**
- Consumes: frontend `ScheduleTimeTemplate` from Task 2.
- Produces: period configs with `minTime` and `maxTime`.
- Produces: `onChangePeriodRange(periodKey, start, end)`.
- Produces: `applyScheduleTimeTemplate(template): { ok: boolean; reason?: string }`.
- Produces: `activeDaySchedule`,供 `CalendarTime` 生成待保存模板。
- Removes: `availableScheduleSummary`, `onTogglePeriod`, and TimePanel full-select callback from the `CalendarTime` path.

- [ ] **Step 1: Add failing range-policy tests**

Extend the existing Node suite to assert exact boundaries and state semantics:

```js
test("时间范围按十分钟间隔决定是否形成安排", () => {
  assert.deepEqual(createTrialSchedulePeriodState("08:00", "08:00"), {
    enabled: false,
    start: "",
    end: ""
  });
  assert.deepEqual(createTrialSchedulePeriodState("08:00", "08:10"), {
    enabled: true,
    start: "08:00",
    end: "08:10"
  });
});

test("模板整组覆盖并清空未包含时段", () => {
  assert.deepEqual(createTrialScheduleDayFromTemplate({
    morning: { start: "08:30", end: "11:20" }
  }), {
    morning: { enabled: true, start: "08:30", end: "11:20" },
    afternoon: { enabled: false, start: "", end: "" },
    evening: { enabled: false, start: "", end: "" }
  });
});
```

Add source assertions proving `availableScheduleSummary` and `handleSelectFullDaySchedule` no longer exist in `useTrialSchedule.ts`.

- [ ] **Step 2: Run the schedule suite and verify RED**

Run:

```bash
cd frontend/apps/h5
node --test tests/trial-schedule-date-policy.test.mjs
```

Expected: new helper imports/assertions fail.

- [ ] **Step 3: Define fixed period boundaries and pure transformations**

Change period config to:

```ts
export const trialSchedulePeriods: TrialSchedulePeriodConfig[] = [
  { key: "morning", label: "上午", minTime: "08:00", maxTime: "12:00" },
  { key: "afternoon", label: "下午", minTime: "12:00", maxTime: "18:00" },
  { key: "evening", label: "晚上", minTime: "18:00", maxTime: "22:00" }
];
```

Implement and export:

```ts
export function createTrialSchedulePeriodState(start: string, end: string): TrialSchedulePeriodState;
export function createTrialScheduleDayFromTemplate(
  template: ScheduleTimeTemplate
): Record<TrialSchedulePeriodKey, TrialSchedulePeriodState>;
export function createScheduleTimeTemplateFromDay(
  daySchedule: Record<TrialSchedulePeriodKey, TrialSchedulePeriodState>
): ScheduleTimeTemplate;
```

The first function normalizes equal/invalid/under-10-minute values to the empty state. The template functions omit disabled periods and reset omitted periods.

- [ ] **Step 4: Replace field updates with atomic range updates**

In `useTrialSchedule`, replace `handleChangePeriodTime` with:

```ts
function handleChangePeriodRange(periodKey: TrialSchedulePeriodKey, start: string, end: string) {
  if (isDateDisabledForNewSchedule(activeDate) || isPeriodBlockedBySchedule(activeDate, periodKey)) {
    return;
  }
  const currentDaySchedule = scheduleDraft[activeDate] ?? createDefaultDaySchedule();
  syncDaySchedule(activeDate, {
    ...currentDaySchedule,
    [periodKey]: createTrialSchedulePeriodState(start, end)
  });
}
```

Add one all-or-nothing `applyScheduleTimeTemplate` method that rejects past/disabled dates and any template period blocked by `blockedScheduleDraft`, then calls `syncDaySchedule(activeDate, createTrialScheduleDayFromTemplate(template))`.

- [ ] **Step 5: Remove editor availability and automatic selection paths**

Delete from `UseTrialScheduleOptions` and the hook:

- `availableScheduleSummary`.
- `availableScheduleValue`, `availableScheduleDraft`, `hasAvailableScheduleLimit`.
- `selectableDates`, `selectableDateSet`, `hasSelectableDateLimit` and `isOutsideSelectableDates` derivation from availability.
- `isPeriodOutsideAvailableSchedule`, `createRangeSelectedDaySchedule`, `handleTogglePeriodPreset`, `handleSelectFullDaySchedule`, and `handleToggleDaySchedule`.
- Available-data merging into tested/arranged calendar data.
- `mode` from `UseTrialScheduleOptions`; `CalendarTime` always passes `mode="view"` to `CalendarPanel` so date interaction only changes the viewing focus.
- Returned `selectableDates`, `isOutsideSelectableDates`, `onTogglePeriod`, `onSelectFullDaySchedule`, and date-toggle callback.

Keep `plannedDates` as display-only guidance, `blockedScheduleSummary` as the occupied-period source, and `maxSelectedDates` as the day-count limit.

Return `activeDaySchedule` for template serialization. Retain `hasNoSelectablePeriods` only if it is still consumed outside the replaced top action row; otherwise remove it together with the old status branch rather than leaving an unused value.

Remove `availableScheduleSummary={...}` at the three current `CalendarTime` call sites and remove the explicit `mode="view"` prop from `TutorApplications` because `CalendarTime` now owns view-only date behavior. Do not remove later workflow payload fields/actions in this task.

- [ ] **Step 6: Run the schedule suite and typecheck**

Run:

```bash
cd frontend/apps/h5
node --test tests/trial-schedule-date-policy.test.mjs
```

Then:

```bash
cd frontend/apps
npm run typecheck:h5
```

Expected: all assertions and TypeScript checks pass.

---

### Task 4: Render Dual Sliders And Wire Template Operations

**Files:**
- Modify: `frontend/apps/h5/src/components/ScheduleCalendar/TimePanel/index.tsx`
- Modify: `frontend/apps/h5/src/components/ScheduleCalendar/TimePanel/index.less`
- Modify: `frontend/apps/h5/src/components/ScheduleCalendar/CalendarTime/index.tsx`
- Modify: `frontend/apps/h5/tests/trial-schedule-date-policy.test.mjs`
- Do not modify: `frontend/apps/h5/src/components/ScheduleCalendar/TimePanel/index copy.tsx`

**Interfaces:**
- Consumes: `onChangePeriodRange`, range boundaries, template transform helpers, global template and profile API from Tasks 2-3.
- Produces: controlled dual-slider rows and three top operations: `取消全选`, `记为模板`, `使用模板`.

- [ ] **Step 1: Record the protected copy hash**

Run:

```bash
shasum 'frontend/apps/h5/src/components/ScheduleCalendar/TimePanel/index copy.tsx'
```

Record the hash in the execution notes and compare it again in Task 5.

- [ ] **Step 2: Add failing SSR markup tests**

Render `TimePanel` with one empty morning period and assert:

```js
assert.match(markup, /type="range"[^>]*min="480"[^>]*max="720"[^>]*step="10"/);
assert.equal((markup.match(/type="range"/g) ?? []).length, 2);
assert.match(markup, /08:00/);
assert.match(markup, /取消全选/);
assert.match(markup, /记为模板/);
assert.match(markup, /使用模板/);
assert.doesNotMatch(markup, />全选</);
```

Add a past-date case asserting both ranges and all three operations are disabled.

- [ ] **Step 3: Run the suite and verify RED**

Run:

```bash
cd frontend/apps/h5
node --test tests/trial-schedule-date-policy.test.mjs
```

Expected: range and operation assertions fail against the old inputs/buttons.

- [ ] **Step 4: Implement controlled dual range rows**

Add minute conversion helpers local to `TimePanel`:

```ts
function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
```

For each period, derive empty slider values from `minTime`, render two overlaid range inputs, clamp start to `<= end` and end to `>= start`, and call `onChangePeriodRange` with both values in one event. Every `div` must have a unique semantic class.

Replace the clickable period-name button with a static label. Keep the per-period clear button.

- [ ] **Step 5: Implement the three top operations**

`TimePanelProps` receives:

```ts
hasScheduleTimeTemplate: boolean;
isSavingScheduleTimeTemplate: boolean;
onCancelAll: () => void;
onSaveScheduleTimeTemplate: () => void;
onUseScheduleTimeTemplate: () => void;
```

Render all three as compact text actions. Apply these disabled rules:

- `取消全选`: past date or no current-day schedule.
- `记为模板`: past date, no current-day schedule, or saving.
- `使用模板`: past date, no template, saving, or date-count limit reached for an unselected date.

- [ ] **Step 6: Wire CalendarTime to the profile API and GlobalProvider**

Read `scheduleTimeTemplate` from `useGlobalUser()` and `setScheduleTimeTemplate` from `useGlobalUserActions()`.

Save flow:

```ts
const template = createScheduleTimeTemplateFromDay(schedule.activeDaySchedule);
const savedTemplate = await updateClientScheduleTimeTemplate(template);
setScheduleTimeTemplate(savedTemplate);
showMessage("时间模板已更新。", { type: "success" });
```

Use flow calls `schedule.applyScheduleTimeTemplate(scheduleTimeTemplate)`. On failure show the returned reason; on success show `时间模板已应用到当前日期。`. Preserve the current manual schedule until the apply operation passes all checks.

- [ ] **Step 7: Implement compact range styling**

In `index.less`:

- Keep the panel and rows compact.
- Give the slider wrapper stable height and width.
- Overlay both range inputs with transparent tracks and independently clickable thumbs.
- Render a neutral base track plus a success-color selected segment using CSS custom properties calculated from start/end percentages.
- Keep time output and action text from wrapping or overlapping at `320px` width.
- Preserve disabled/read-only visual states.

- [ ] **Step 8: Run the schedule suite, typecheck, and lint**

Run:

```bash
cd frontend/apps/h5
node --test tests/trial-schedule-date-policy.test.mjs
```

Then:

```bash
cd frontend/apps
npm run typecheck:h5
npm run lint:h5
```

Expected: all commands exit 0. The Vite SSR test may print the known sandbox HMR WebSocket warning, but test assertions must pass and the process must exit 0.

---

### Task 5: Synchronize Product Documentation And Verify End To End

**Files:**
- Modify: `docs/产品需求文档.md`
- Verify only: all files changed in Tasks 1-4.

**Interfaces:**
- Consumes: completed backend/frontend behavior.
- Produces: synchronized product contract and verification evidence.

- [ ] **Step 1: Update the product requirement document**

Replace TimePanel input/full-select wording with:

- Three fixed 10-minute dual-slider windows.
- Equal handles mean no schedule.
- `取消全选`, `记为模板`, `使用模板` behavior.
- One date-independent user template stored in `app_user.schedule_time_template`.
- Template overwrite and past-date disabled behavior.
- Current `CalendarTime` no longer constrained by student availability.
- Later availability workflow cleanup is explicitly deferred.

- [ ] **Step 2: Run backend tests and compile**

Run:

```bash
cd server/apps
mvn -q -Dtest=ScheduleTimeTemplatePolicyTest test
mvn -q -DskipTests compile
```

Expected: both commands exit 0.

- [ ] **Step 3: Run frontend checks**

Run:

```bash
cd frontend/apps/h5
node --test tests/schedule-time-template-contract.test.mjs
node --test tests/trial-schedule-date-policy.test.mjs
```

Then:

```bash
cd frontend/apps
npm run typecheck:h5
npm run lint:h5
```

Expected: all commands exit 0.

- [ ] **Step 4: Check formatting and patch integrity**

Run Prettier against modified frontend source/test files, then:

```bash
git diff --check
```

Expected: no formatting errors in modified source and no whitespace errors in the patch.

- [ ] **Step 5: Verify the protected copy is unchanged**

Run:

```bash
shasum 'frontend/apps/h5/src/components/ScheduleCalendar/TimePanel/index copy.tsx'
git diff -- 'frontend/apps/h5/src/components/ScheduleCalendar/TimePanel/index copy.tsx'
```

Expected: hash matches Task 4 Step 1 and `git diff` is empty. The file remains untracked if it was untracked before this work.

- [ ] **Step 6: Perform runtime verification when services are available**

Do not start or restart services automatically. If `http://127.0.0.1:8899/` and `http://127.0.0.1:9988` are already available, verify:

1. Empty sliders overlap at `08:00`, `12:00`, and `18:00`.
2. Dragging in 10-minute increments creates a schedule; collapsing clears it.
3. Saving a sparse template survives page refresh.
4. Applying the template overwrites all manually selected periods for the current date.
5. Past dates remain viewable but all schedule/template operations are disabled.
6. The layout remains usable at desktop and mobile widths with no console errors.

If either service is unavailable, record the missing runtime verification and do not claim UI/API end-to-end success.
