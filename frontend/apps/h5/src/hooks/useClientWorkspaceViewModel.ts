import { getHuntingHistoryOrders, getRecommendedHuntingTasks } from "@pages/home/commission/model";
import { getTutorDemandBudgetLabel } from "@tools/tutorDemand";
import { isTutorTrialSettledServicePendingStatus } from "@tools/tutorTrial";

/** 用户端工作台派生数据入参。 */
interface UseClientWorkspaceViewModelOptions {
  huntingShortcutProject: HuntingProject | null;
  publishedHuntingTasks: HuntingTask[];
  role: Role;
  workspaceData: {
    huntingTasks: HuntingTask[];
    orders: ClientOrder[];
    /** 家长自己发布的家教需求 + 申请人，只服务进行中弹窗，跟页面浏览列表 tutorDemands 分开请求。 */
    tutorApplications: TutorDemand[];
    /** 家教列表浏览：学生角色是 TutorDemand 需求，家长角色是 TutorCertifiedStudent 原始学生数据。 */
    tutorDemands: Array<TutorDemand | TutorCertifiedStudent>;
  };
}

/** 判断家教列表条目是否是家长端浏览的原始认证学生数据，而不是家教需求。 */
export function isTutorCertifiedStudent(demand: TutorDemand | TutorCertifiedStudent): demand is TutorCertifiedStudent {
  return "tutor_certification" in demand;
}

/** 家教品类归档终态：需求主状态和申请细分状态各自的已结束/已取消，加上申请细分状态特有的
 *  已失效（家长拒绝）、试课已结束——不含正式雇佣失效，那个状态还有"重新发起正式雇佣"操作
 *  要展示，不能归档。家教已经 KEY 化，这里用精确匹配，不再靠中文子串判断。 */
const archivedTutorStatusKeys: string[] = [
  TutorDemandStatus.Ended,
  TutorDemandStatus.Cancelled,
  TutorApplicantStatus.Ended,
  TutorApplicantStatus.Cancelled,
  TutorApplicantStatus.Rejected,
  TutorApplicantStatus.TrialEnded
];

/** 判断接口订单是否应保留在订单历史而不再展示到进行中列表。 */
function isArchivedClientOrder(order: ClientOrder) {
  if (order.category === "tutor") {
    if (isTutorTrialSettledServicePendingStatus(order.status)) {
      return false;
    }
    return archivedTutorStatusKeys.includes(order.status);
  }

  return Object.values(TutorOrderStatus).some((status) => order.status.includes(status));
}

/** 将工作台接口数据转换为 App 和各页面需要的展示模型。 */
export function useClientWorkspaceViewModel({
  huntingShortcutProject,
  publishedHuntingTasks,
  role,
  workspaceData
}: UseClientWorkspaceViewModelOptions) {
  const roleOrders = useMemo(
    () => (workspaceData.orders ?? []).filter((order) => order.role === role),
    [workspaceData.orders, role]
  );
  const ongoingRoleOrders = useMemo(() => roleOrders.filter((order) => !isArchivedClientOrder(order)), [roleOrders]);
  const mergedHuntingTasks = useMemo(
    () => [
      ...publishedHuntingTasks,
      ...workspaceData.huntingTasks.filter(
        (task) => !publishedHuntingTasks.some((publishedTask) => publishedTask.id === task.id)
      )
    ],
    [publishedHuntingTasks, workspaceData.huntingTasks]
  );
  const tutorTrialJobs: TutorTrialJob[] = useMemo(
    () =>
      workspaceData.tutorDemands
        .filter((demand): demand is TutorDemand => !isTutorCertifiedStudent(demand) && demand.sourceType !== "tutorStudent")
        .map((demand) => ({
          address: demand.addressLabel ?? demand.school,
          budget: getTutorDemandBudgetLabel(demand.budget),
          description: demand.description ?? `${demand.child} 需要 ${demand.subject} 家教，学校：${demand.school}`,
          id: demand.id,
          parentPhone: demand.publisher?.phone ?? "家长电话待平台授权",
          period: demand.period ?? demand.status,
          periodDates: demand.periodDates ?? [],
          publisher: demand.publisher ?? { nickname: "家长用户" },
          requirement: `${demand.subject} · ${demand.school}`,
          status: demand.status,
          subject: demand.subject,
          title: demand.title ?? `${demand.child}${demand.subject}家教`
        })),
    [workspaceData.tutorDemands]
  );
  const tutorApplicationCandidates: TutorApplicationCandidate[] = useMemo(
    () =>
      workspaceData.tutorApplications.flatMap((demand) =>
        demand.applicants.map((applicant) => ({
          availability: applicant.availability,
          demandId: demand.id,
          gpa: applicant.gpa,
          hiredTimes: applicant.hiredTimes,
          id: applicant.id,
          major: applicant.major,
          nickname: applicant.nickname,
          school: applicant.school,
          serviceConfirmationCancelledBy: applicant.serviceConfirmationCancelledBy,
          serviceSchedule: applicant.serviceSchedule,
          status: applicant.status,
          trialFee: applicant.trialFee,
          trialSchedule: applicant.trialSchedule
        }))
      ),
    [workspaceData.tutorApplications]
  );
  // 进行中列表现在由后端 /workspace/ongoing 接口按角色直接聚合返回（学生角色已包含委托/狩猎），
  // 不再需要前端用 getHuntingOngoingOrders 从 huntingTasksResponse 现算拼接。
  const ongoingOrders = ongoingRoleOrders;
  const orderDetailOrders = useMemo(
    () => [...getHuntingHistoryOrders(mergedHuntingTasks, role), ...roleOrders],
    [mergedHuntingTasks, role, roleOrders]
  );
  const recommendedHuntingTasks = useMemo(
    () => getRecommendedHuntingTasks(mergedHuntingTasks, huntingShortcutProject),
    [huntingShortcutProject, mergedHuntingTasks]
  );

  return {
    hasPaymentRisk: roleOrders.some((order) => order.risk === "payment"),
    mergedHuntingTasks,
    ongoingOrders,
    orderDetailOrders,
    recommendedHuntingTasks,
    roleOrders,
    tutorApplicationCandidates,
    tutorTrialJobs
  };
}
