import { getHuntingTaskPublishTimeText } from "@pages/Delegation/model";
import { getChildProfileOptions } from "@shared/clientPageModel";
import {
  buildPublishHuntingTaskRequest,
  buildPublishTutorDemandRequest,
  getLatestLocalPublishInfoDraft,
  isHuntingTaskPublishType,
  saveLocalPublishInfoDraft
} from "@tools/publishInfo";

/** 发布 mutation 回调参数。 */
interface PublishMutationCallbacks<T> {
  onError: (error: unknown) => void;
  onSuccess: (response: T) => void;
}

/** 发布流程入参。 */
interface UsePublishInfoFlowOptions {
  addressItems: AddressBookItem[];
  isPublishing: boolean;
  onBeforeOpen?: () => void;
  onPublishedHuntingTask: (task: HuntingTask) => void;
  onPublishedToTab: (tab: ClientModuleKey) => void;
  publishHuntingTask: (
    payload: PublishHuntingTaskRequest,
    callbacks: PublishMutationCallbacks<HuntingTask>
  ) => void;
  publishTutorDemand: (
    payload: PublishTutorDemandRequest,
    callbacks: PublishMutationCallbacks<unknown>
  ) => void;
  refetchWorkspace: () => void;
  profileDraft: ProfileDraftState;
  role: Role;
  showMessage: (content: string, options?: MessageToastOptions) => void;
}

/** 发布信息流程控制器，集中管理发布弹窗、草稿和发布成功后的跳转。 */
export function usePublishInfoFlow({
  addressItems,
  isPublishing,
  onBeforeOpen,
  onPublishedHuntingTask,
  onPublishedToTab,
  publishHuntingTask,
  publishTutorDemand,
  refetchWorkspace,
  profileDraft,
  role,
  showMessage
}: UsePublishInfoFlowOptions) {
  const [isPublishInfoOpen, setIsPublishInfoOpen] = useState(false);
  const [publishInfoInitialType, setPublishInfoInitialType] = useState<PublishInfoType>("delegation");
  const [publishInfoInitialDraft, setPublishInfoInitialDraft] = useState<PublishInfoDraft | null>(null);
  const [pendingPublishDraft, setPendingPublishDraft] = useState<LocalPublishInfoDraft | null>(null);
  const [pendingPublishType, setPendingPublishType] = useState<PublishInfoType>("delegation");
  const [publishedHuntingTasks, setPublishedHuntingTasks] = useState<HuntingTask[]>([]);
  const publishChildOptions = useMemo(() => getChildProfileOptions(profileDraft), [profileDraft]);

  /** 清空本地补充到工作台的已发布委托缓存。 */
  function resetPublishedHuntingTasks() {
    setPublishedHuntingTasks([]);
  }

  /** 使用指定草稿打开发布信息弹窗。 */
  function openPublishInfo(type: PublishInfoType, draft: PublishInfoDraft | null) {
    setPublishInfoInitialType(type);
    setPublishInfoInitialDraft(draft);
    setPendingPublishDraft(null);
    setIsPublishInfoOpen(true);
  }

  /** 按类型打开发布信息弹窗，打开前先检查本地草稿。 */
  function requestOpenPublishInfo(type: PublishInfoType) {
    onBeforeOpen?.();

    const latestDraft = getLatestLocalPublishInfoDraft(type);
    if (latestDraft) {
      setPendingPublishDraft(latestDraft);
      setPendingPublishType(type);
      setIsPublishInfoOpen(false);
      return;
    }

    openPublishInfo(type, null);
  }

  /** 打开发布信息弹窗。 */
  function openDefaultPublishInfo() {
    requestOpenPublishInfo(role === "parent" ? "tutor" : "delegation");
  }

  /** 打开回收发布弹窗，复用发布表单但固定为回收类型。 */
  function openRecycleInfo() {
    requestOpenPublishInfo("recycle");
  }

  /** 保存发布信息草稿，暂不进入业务列表。 */
  function savePublishInfo(draft: PublishInfoDraft) {
    try {
      saveLocalPublishInfoDraft(draft, "draft");
      setIsPublishInfoOpen(false);
      showMessage("发布草稿已保存。", { type: "success" });
    } catch {
      showMessage("发布草稿保存失败，请检查浏览器存储权限。", { type: "error" });
    }
  }

  /** 发布委托、回收或家教信息。 */
  function publishInfo(draft: PublishInfoDraft) {
    if (draft.type === "tutor") {
      const payload = buildPublishTutorDemandRequest(draft, addressItems, publishChildOptions);

      publishTutorDemand(payload, {
        onSuccess: () => {
          saveLocalPublishInfoDraft(draft, "published");
          setIsPublishInfoOpen(false);
          onPublishedToTab("tutor");
          showMessage("家教需求已发布，已加入进行中列表。", { type: "success" });
          refetchWorkspace();
        },
        onError: (error) => {
          showMessage(getErrorMessage(error, "家教发布失败，请稍后重试。"), { type: "error" });
        }
      });
      return;
    }

    if (!isHuntingTaskPublishType(draft.type)) {
      try {
        saveLocalPublishInfoDraft(draft, "draft");
        setIsPublishInfoOpen(false);
        showMessage("当前仅委托和回收接入真实发布，已先保存为草稿。", { type: "warning" });
      } catch {
        showMessage("发布草稿保存失败，请检查浏览器存储权限。", { type: "error" });
      }
      return;
    }

    try {
      const payload = buildPublishHuntingTaskRequest(draft, addressItems);
      const publishTypeLabel = draft.type === "recycle" ? "回收" : "委托";

      publishHuntingTask(payload, {
        onSuccess: (task) => {
          const publishedTask: HuntingTask = {
            ...task,
            amountNegotiable: Boolean(payload.amountNegotiable),
            depositAmount: payload.depositAmount ?? 0,
            depositRequired: Boolean(payload.depositRequired),
            description: payload.description,
            destination: payload.destination ?? payload.location,
            fee: payload.amountNegotiable ? 0 : task.fee,
            isMine: true,
            publishTime: task.publishTime ?? getHuntingTaskPublishTimeText(new Date()),
            quoteCount: task.quoteCount ?? 0,
            quotes: task.quotes ?? [],
            requirement: payload.requirement,
            requirementTags: payload.requirementTags ?? [],
            status: task.status
          };

          setPublishedHuntingTasks((tasks) => [
            publishedTask,
            ...tasks.filter((item) => item.id !== publishedTask.id)
          ]);
          onPublishedHuntingTask(publishedTask);
          setIsPublishInfoOpen(false);
          showMessage(`${publishTypeLabel}已发布，可在委托列表查看。`, { type: "success" });
          onPublishedToTab("hunting");
          refetchWorkspace();
        },
        onError: (error) => {
          showMessage(getErrorMessage(error, `${publishTypeLabel}发布失败，请稍后重试。`), { type: "error" });
        }
      });
    } catch (error) {
      showMessage(getErrorMessage(error, "发布信息校验失败，请检查表单内容。"), { type: "error" });
    }
  }

  return {
    isPublishInfoOpen,
    isPublishing,
    openDefaultPublishInfo,
    openPublishInfo,
    openRecycleInfo,
    pendingPublishDraft,
    pendingPublishType,
    publishInfo,
    publishChildOptions,
    publishInfoInitialDraft,
    publishInfoInitialType,
    publishedHuntingTasks,
    resetPublishedHuntingTasks,
    savePublishInfo,
    setIsPublishInfoOpen,
    setPendingPublishDraft
  };
}
