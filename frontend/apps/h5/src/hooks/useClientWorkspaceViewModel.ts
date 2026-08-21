import { getHuntingHistoryOrders, getRecommendedHuntingTasks } from "@pages/home/commission/model";
import { getTutorDemandBudgetLabel } from "@tools/tutorDemand";

/** 用户端工作台派生数据入参。 */
interface UseClientWorkspaceViewModelOptions {
  huntingShortcutProject: HuntingProject | null;
  role: Role;
  workspaceData: {
    huntingTasks: HuntingTask[];
    /** 进行中订单，后端已按角色聚合且只返回真正进行中的记录（归档状态已在服务端过滤）。 */
    orders: ClientOrder[];
    /** 订单历史，跟 orders 同一套底层数据但不做归档过滤，只服务订单历史页。 */
    orderHistory: ClientOrder[];
    /** 兼职列表：家教是兼职的一种类型，学生角色下会跟兼职岗位聚合在同一个数组返回，字段结构不同。 */
    partTimeJobs: Array<PartTimeJob | TutorDemand>;
  };
}

/** 判断兼职列表条目是否是家教需求，而不是普通兼职岗位。 */
export function isTutorDemand(job: PartTimeJob | TutorDemand): job is TutorDemand {
  return "applicants" in job;
}

/** 将工作台接口数据转换为 App 和各页面需要的展示模型。 */
export function useClientWorkspaceViewModel({
  huntingShortcutProject,
  role,
  workspaceData
}: UseClientWorkspaceViewModelOptions) {
  const roleOrders = useMemo(
    () => (workspaceData.orders ?? []).filter((order) => order.role === role),
    [workspaceData.orders, role]
  );
  const roleOrderHistory = useMemo(
    () => (workspaceData.orderHistory ?? []).filter((order) => order.role === role),
    [workspaceData.orderHistory, role]
  );
  const partTimeJobs: PartTimeJob[] = useMemo(
    () => workspaceData.partTimeJobs.filter((job): job is PartTimeJob => !isTutorDemand(job)),
    [workspaceData.partTimeJobs]
  );
  const tutorTrialJobs: TutorTrialJob[] = useMemo(
    () =>
      workspaceData.partTimeJobs
        .filter((job): job is TutorDemand => isTutorDemand(job) && job.sourceType !== "tutorStudent")
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
    [workspaceData.partTimeJobs]
  );
  // 进行中列表现在由后端 /workspace/ongoing 接口按角色直接聚合返回（学生角色已包含委托/狩猎），
  // 且已在服务端过滤掉归档状态，不再需要前端用 getHuntingOngoingOrders 现算拼接或二次过滤。
  const ongoingOrders = roleOrders;
  const orderDetailOrders = useMemo(
    () => [...getHuntingHistoryOrders(workspaceData.huntingTasks, role), ...roleOrderHistory],
    [role, roleOrderHistory, workspaceData.huntingTasks]
  );
  const recommendedHuntingTasks = useMemo(
    () => getRecommendedHuntingTasks(workspaceData.huntingTasks, huntingShortcutProject),
    [huntingShortcutProject, workspaceData.huntingTasks]
  );

  return {
    hasPaymentRisk: roleOrders.some((order) => order.risk === "payment"),
    huntingTasks: workspaceData.huntingTasks,
    ongoingOrders,
    orderDetailOrders,
    partTimeJobs,
    recommendedHuntingTasks,
    roleOrders,
    tutorTrialJobs
  };
}
