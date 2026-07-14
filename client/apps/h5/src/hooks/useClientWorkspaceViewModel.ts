import {
  getHuntingHistoryOrders,
  getHuntingOngoingOrders,
  getRecommendedHuntingTasks
} from "@pages/Delegation/model";

/** 用户端工作台派生数据入参。 */
interface UseClientWorkspaceViewModelOptions {
  huntingShortcutProject: HuntingProject | null;
  publishedHuntingTasks: HuntingTask[];
  role: Role;
  workspaceData: {
    huntingTasks: HuntingTask[];
    orders: ClientOrder[];
    tutorDemands: TutorDemand[];
  };
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
  const hasPaymentRisk = roleOrders.some((order) => order.risk === "payment");
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
        .filter((demand) => demand.sourceType !== "tutorStudent")
        .map((demand) => ({
          address: demand.addressLabel ?? demand.school,
          budget: demand.budget,
          description: demand.description ?? `${demand.child} 需要 ${demand.subject} 家教，学校：${demand.school}`,
          id: demand.id,
          parentPhone: demand.publisherPhone ?? "家长电话待平台授权",
          period: demand.period ?? demand.status,
          publisher: demand.publisherName ?? "家长用户",
          requirement: `${demand.subject} · ${demand.school}`,
          status: demand.status,
          subject: demand.subject,
          title: demand.title ?? `${demand.child}${demand.subject}家教`
        })),
    [workspaceData.tutorDemands]
  );
  const tutorApplicationCandidates: TutorApplicationCandidate[] = useMemo(
    () =>
      workspaceData.tutorDemands.flatMap((demand) =>
        demand.applicants.map((applicant) => ({
          demandId: demand.id,
          id: applicant.id,
          major: applicant.major,
          name: applicant.name,
          school: applicant.school,
          status: applicant.status
        }))
      ),
    [workspaceData.tutorDemands]
  );
  const ongoingOrders = useMemo(
    () => [...getHuntingOngoingOrders(mergedHuntingTasks, role), ...roleOrders],
    [mergedHuntingTasks, role, roleOrders]
  );
  const orderDetailOrders = useMemo(
    () => [...getHuntingHistoryOrders(mergedHuntingTasks, role), ...roleOrders],
    [mergedHuntingTasks, role, roleOrders]
  );
  const recommendedHuntingTasks = useMemo(
    () => getRecommendedHuntingTasks(mergedHuntingTasks, huntingShortcutProject),
    [huntingShortcutProject, mergedHuntingTasks]
  );

  return {
    hasPaymentRisk,
    mergedHuntingTasks,
    ongoingOrders,
    orderDetailOrders,
    recommendedHuntingTasks,
    roleOrders,
    tutorApplicationCandidates,
    tutorTrialJobs
  };
}
