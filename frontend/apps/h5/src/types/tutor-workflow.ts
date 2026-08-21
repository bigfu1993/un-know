/** 家长端发布家教需求时可选择的孩子。 */
export interface ChildProfileOption {
  grade: string;
  id: string;
  name: string;
  school: string;
}

/** 学生端可见的家教兼职卡片。 */
export interface TutorTrialJob {
  address: string;
  budget: string;
  description: string;
  id: string;
  parentPhone: string;
  period: string;
  /** 计划周期实际选中的完整日期集合，允许不连续的零散日期；period 只是这个集合的开始至结束摘要文案。 */
  periodDates: string[];
  publisher: import("@unknown/domain").UserNickname;
  requirement: string;
  status: string;
  subject: string;
  title: string;
}

/** 家长端试课申请列表候选人。 */
export interface TutorApplicationCandidate {
  availability: string;
  demandId: string;
  gpa: string;
  hiredTimes: number;
  id: string;
  major: string;
  nickname: string;
  school: string;
  serviceConfirmationCancelledBy?: string;
  serviceSchedule?: string;
  status: string;
  trialFee?: number;
  trialSchedule: string;
}

/** 家长端确认试课安排载荷。 */
export interface ConfirmTutorTrialPayload {
  applicationId: string;
  demandId: string;
  trialEnd: string;
  trialHalfDay: string;
  trialStart: string;
}

/** 家长端确认试课结束载荷。 */
export interface CompleteTutorTrialEndPayload {
  applicationId: string;
  demandId: string;
  hireTutor?: boolean;
  trialFee: number;
  tutorSchedule?: string;
}

/** 家教流程动作载荷，由业务按钮补充当前申请 ID。 */
export type TutorWorkflowActionPayload = import("@unknown/domain").TutorWorkflowActionRequest & {
  applicationId: string;
  demandId?: string;
};

/** 家教流程动作类型，实际定义来自 domain 包，H5 通过 types 目录自动导入。 */
export type { TutorWorkflowAction, TutorWorkflowActionRequest } from "@unknown/domain";
