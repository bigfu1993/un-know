# Structured Trial Schedule Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将家长提交试课日程接口收敛为唯一的 `dates[].timeRanges[]` 结构化契约，由后端派生起止日期与摘要，并移除运行时代码对申请表旧日程字段的依赖。

**Architecture:** H5 日历草稿生成共享 domain 契约，API Client 原样提交；后端请求模型负责 HTTP 结构校验，应用服务负责日期、时间和业务上限校验并生成标准摘要，唯一写入 `tutor_application_schedule`。旧 `tutor_applicant.trial_*` 列保留用于数据库历史兼容，但新提交、学生确认和工作流查询不再读写。

**Tech Stack:** React、TypeScript、Vite、Spring Boot、Java 21、JDBC、PostgreSQL、Node Test、JUnit 5

**Spec:** `docs/家教试课日程流程与接口.md`

## Global Constraints

- 请求只包含 `dates`，每个日期只包含 `date` 与 `timeRanges`。
- 有效日程为 1 至 3 个不同日期，每天至少一个 `start < end` 的时间段。
- 后端按日期排序并派生 `schedule_start`、`schedule_end`、`schedule_summary`。
- 不修改已应用 Flyway 迁移，不删除数据库旧列。
- 不修改 `frontend/apps/h5/src/components/ScheduleCalendar/TimePanel/index copy.tsx`。

---

### Task 1: Contract Regression Tests

**Files:**
- Modify: `frontend/apps/h5/tests/trial-schedule-date-policy.test.mjs`
- Modify: `server/apps/src/test/java/com/unknown/platform/modules/clientworkspace/application/TutorWorkspaceAppServiceTest.java`

**Interfaces:**
- Produces: `ConfirmTutorTrialRequest(dates)`、结构化 `TrialSchedulePlan.dates`
- Verifies: 日程摘要/起止日期由后端派生，学生确认依据 `tutor_application_schedule`

- [x] 前端增加结构化日程计划断言并运行专项测试，确认旧实现 RED。
- [x] 后端增加结构化请求、派生结果和学生确认条件断言并运行专项测试，确认旧实现 RED。

### Task 2: Frontend Contract Migration

**Files:**
- Modify: `frontend/apps/packages/domain/src/index.ts`
- Modify: `frontend/apps/h5/src/components/ScheduleCalendar/CalendarTime/model.ts`
- Modify: `frontend/apps/h5/src/types/tutor-workflow.ts`
- Modify: `frontend/apps/h5/src/overlays/tutor/components/TutorApplications.tsx`

**Interfaces:**
- Produces: `TutorTrialScheduleDate`、`ConfirmTutorTrialRequest { dates }`
- Consumes: `TrialScheduleDraft`

- [x] 把有效草稿转换为排序后的日期和时间段数组，同时保留仅供界面比较的 `summary`。
- [x] 让弹窗、Provider、hook 和 API Client 全程透传同名 `dates`，移除三个旧字段。
- [x] 运行前端专项测试并确认 GREEN。

### Task 3: Backend Contract And Persistence Migration

**Files:**
- Modify: `server/apps/src/main/java/com/unknown/platform/modules/clientworkspace/model/ConfirmTutorTrialRequest.java`
- Modify: `server/apps/src/main/java/com/unknown/platform/modules/clientworkspace/application/TutorWorkspaceAppService.java`

**Interfaces:**
- Consumes: `ConfirmTutorTrialRequest.dates()`
- Produces: 标准中文摘要、派生起止日期、`TRIAL_CONFIRMING` 状态和 trial 阶段日程记录

- [x] 使用嵌套 record 描述日期和时间段，并加入集合级 Bean Validation。
- [x] 在应用服务中校验重复日期、日期/时间格式和时间先后关系，生成排序摘要。
- [x] 申请状态更新不再写旧 `trial_*` 列；学生确认改查 trial 阶段日程表。
- [x] 删除运行时记录和查询中不再使用的旧日程字段。
- [x] 运行后端专项测试并确认 GREEN。

### Task 4: Documentation And Verification

**Files:**
- Modify: `docs/产品需求文档.md`
- Modify: `docs/家教试课日程流程与接口.md`

- [x] 将目标契约改为已实施契约，写清后端派生、旧列兼容边界和学生确认依据。
- [x] 搜索生产代码，确认不再出现请求字段 `trialStart`、`trialEnd`、`trialHalfDay`。
- [x] 运行 `npm run typecheck:h5`、`npm run lint:h5`、前端专项测试、后端目标测试、`mvn -q -DskipTests compile` 和 `git diff --check`；全量后端测试已尝试，但 Spring 上下文持续等待本地数据库，未获得完整结论。
- [x] 默认端口已有服务时验证健康检查和真实接口；当前 `8899`、`9988` 均未监听，记录运行态验证缺口且不擅自启动服务。
