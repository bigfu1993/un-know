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
  publisher: string;
  requirement: string;
  status: string;
  subject: string;
  title: string;
}

/** 家长端试课申请列表候选人。 */
export interface TutorApplicationCandidate {
  id: string;
  major: string;
  name: string;
  school: string;
  status: string;
}
