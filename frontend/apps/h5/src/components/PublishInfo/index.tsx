import "./index.less";
import {
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  FileText,
  GraduationCap,
  ListChecks,
  MapPin,
  PackageCheck,
  PencilLine,
  Plus,
  QrCode,
  ShieldCheck,
  UserRound,
  WalletCards,
  XCircle
} from "lucide-react";
import { formatTutorSubjects, parseTutorSubjects, tutorSubjectOptions } from "@shared/tutorModel";
import {
  delegationRequirementTags,
  isNegotiableAmount,
  isPositiveAmount,
  isTutorPublishType,
  isTutorWageAmountRequired,
  normalizeTutorWageMode,
  tutorWageModeOptions
} from "@tools/publishInfo";
import { getTutorDateKey } from "@tools/tutorCalendar";

/** 发布信息弹窗属性。 */
export interface PublishInfoProps {
  addressItems: AddressBookItem[];
  childOptions?: ChildProfileOption[];
  initialDraft?: PublishInfoDraft | null;
  initialType?: PublishInfoType;
  isPublishing?: boolean;
  onClose: () => void;
  onPublish: (draft: PublishInfoDraft) => void;
  onSave: (draft: PublishInfoDraft) => void;
  role: Role;
}

/** 发布草稿中的字符串字段 key，用于表单字段组件内部绑定字段更新事件。 */
type PublishInfoStringField = {
  [Key in keyof PublishInfoDraft]: PublishInfoDraft[Key] extends string ? Key : never;
}[keyof PublishInfoDraft];

/** 发布草稿字段更新回调。 */
type PublishInfoFieldChange = (key: keyof PublishInfoDraft, value: string) => void;

/** 发布表单标题，统一承接字段图标和标题文字。 */
function FieldLabel({ icon: Icon, label }: { icon: typeof Plus; label: string }) {
  return (
    <span className="publish-field-title">
      <Icon size={14} />
      {label}
    </span>
  );
}

/** 发布类型按钮配置。 */
interface PublishTypeOption {
  icon: typeof Plus;
  label: string;
  parentOnly?: boolean;
  value: PublishInfoType;
}

/** 发布类型配置，回收由独立快捷入口打开，不展示在发布类型切换中。 */
const publishTypeOptions: PublishTypeOption[] = [
  { icon: PackageCheck, label: "委托", value: "delegation" },
  { icon: BriefcaseBusiness, label: "兼职", value: "partTime" },
  { icon: GraduationCap, label: "家教招募", parentOnly: true, value: "tutor" },
  { icon: UserRound, label: "家教聘用", parentOnly: true, value: "tutorHire" }
];

/** 回收快捷入口使用的独立类型配置。 */
const recycleTypeOption: PublishTypeOption = { icon: PackageCheck, label: "回收", value: "recycle" };

/** 兼职计薪方式。 */
const partTimeWageModeOptions = ["按日结算", "汇总结算"];

/** 发布信息表单初始值。 */
const initialPublishInfoDraft: PublishInfoDraft = {
  addressId: "",
  amount: "",
  amountMode: "input",
  checkInMode: "",
  childId: "",
  delegationTime: "",
  depositAmount: "",
  depositRequired: "no",
  description: "",
  partTimeWageMode: "按日结算",
  requirement: "",
  requirementTags: [],
  signupFields: "",
  title: "",
  trialDuration: "",
  trialEnabled: "是",
  tutorDateEnd: "",
  tutorDateStart: "",
  tutorDates: [],
  tutorSchoolTags: [],
  tutorSubject: "",
  tutorTime: "",
  tutorWageAmount: "",
  tutorWageMode: "按小时结算",
  type: "delegation"
};

/** 委托时间快捷选项。 */
const delegationTimeQuickOptions = ["5min", "10min", "15min", "20min"];

/** 判断字符串是否为原生时间选择器可展示的 HH:mm。 */
function getNativeTimeValue(value: string) {
  return /^\d{2}:\d{2}$/.test(value) ? value : "";
}

/** 将发布周期日期格式化为表单按钮展示文案。 */
function formatPublishPeriodDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "请选择日期";
  }

  const [, month, day] = value.split("-");

  return `${Number(month)}月${Number(day)}日`;
}

/** 将计划周期格式化为合并后的触发器文案。 */
function formatPublishPeriodRange(startDate: string, endDate: string) {
  if (!startDate && !endDate) {
    return "请选择计划周期";
  }
  if (startDate && endDate) {
    return `${formatPublishPeriodDate(startDate)} - ${formatPublishPeriodDate(endDate)}`;
  }

  return `${formatPublishPeriodDate(startDate || endDate)} - 请选择结束日期`;
}

/** 将日期 key 转成仅日期对象，避免时区偏移影响周期范围计算。 */
function getDateFromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
}

/** 获取计划周期内的日期 key，供复用日历组件渲染已选范围。 */
function getPublishPeriodRangeDateKeys(startDate: string, endDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) {
    return [];
  }

  const dateKeys: string[] = [];
  const currentDate = getDateFromDateKey(startDate);
  const lastDate = getDateFromDateKey(endDate);

  while (currentDate <= lastDate) {
    dateKeys.push(getTutorDateKey(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dateKeys;
}

/**
 * 把已排序的日期 key 切分成若干段连续区间：逐个日期比对，能接上"前一段末尾+1天"就并入当前段，
 * 接不上就另起一段；不看整体是否全部连续，允许结果里同时存在连续段和孤立的单独日期。
 */
function splitPeriodDateKeysIntoContinuousSegments(sortedDateKeys: string[]) {
  const segments: string[][] = [];

  sortedDateKeys.forEach((dateKey) => {
    const lastSegment = segments[segments.length - 1];
    const lastDateKeyInSegment = lastSegment?.[lastSegment.length - 1];

    if (lastDateKeyInSegment) {
      const nextExpectedDate = getDateFromDateKey(lastDateKeyInSegment);
      nextExpectedDate.setDate(nextExpectedDate.getDate() + 1);

      if (getTutorDateKey(nextExpectedDate) === dateKey) {
        lastSegment.push(dateKey);
        return;
      }
    }

    segments.push([dateKey]);
  });

  return segments;
}

/**
 * 计划周期选中日期的详情文案：先把选中日期切分成若干连续段，每段内部连续的两天以上用"开始 - 结束"，
 * 段内只有一天就直接显示这天，段与段之间用顿号分隔——同一组选中里可以同时出现连续区间和孤立日期。
 */
function formatPublishPeriodDatesDetail(dates: string[]) {
  if (dates.length === 0) {
    return "请选择计划周期";
  }

  const sortedDateKeys = [...dates].sort();
  const segments = splitPeriodDateKeysIntoContinuousSegments(sortedDateKeys);

  return segments
    .map((segment) =>
      segment.length > 1 ? formatPublishPeriodRange(segment[0], segment[segment.length - 1]) : formatPublishPeriodDate(segment[0])
    )
    .join("、");
}

/** 获取地址下拉展示文案。 */
function getAddressOptionLabel(item: AddressBookItem) {
  const { buildingFloor, campusArea, contactName, deliveryAddress } = item.draft;
  const mainAddress = [campusArea, buildingFloor, deliveryAddress].filter(Boolean).join(" · ");
  const owner = contactName ? `${contactName} · ` : "";

  return `${item.isCurrent ? "当前 · " : ""}${owner}${mainAddress || "未填写地址"}`;
}

/** 判断发布表单是否满足当前类型的最小提交条件。 */
function getPublishFormValid(draft: PublishInfoDraft) {
  const hasTitle = Boolean(draft.title.trim());

  if (draft.type === "delegation" || draft.type === "recycle") {
    const hasValidAmount = isNegotiableAmount(draft) || isPositiveAmount(draft.amount);
    const hasValidDeposit = draft.depositRequired === "no" || isPositiveAmount(draft.depositAmount);

    return hasTitle && hasValidAmount && hasValidDeposit && Boolean(draft.delegationTime.trim());
  }

  if (draft.type === "partTime") {
    return hasTitle;
  }

  if (isTutorPublishType(draft.type)) {
    const hasValidWageAmount = !isTutorWageAmountRequired(draft.tutorWageMode) || isPositiveAmount(draft.tutorWageAmount);

    return hasTitle && Boolean(draft.addressId.trim()) && Boolean(draft.tutorDateStart.trim()) && Boolean(draft.tutorDateEnd.trim()) && hasValidWageAmount;
  }

  return false;
}

/** 发布信息弹窗，采集发布入口和独立回收入口的表单草稿。 */
export function PublishInfo({
  addressItems,
  childOptions = [],
  initialDraft = null,
  initialType = "delegation",
  isPublishing = false,
  onClose,
  onPublish,
  onSave,
  role
}: PublishInfoProps) {
  const availablePublishTypeOptions =
    initialType === "recycle"
      ? [recycleTypeOption]
      : role === "parent"
        ? publishTypeOptions.filter((option) => option.parentOnly)
        : publishTypeOptions.filter((option) => !option.parentOnly);
  const [draft, setDraft] = useState<PublishInfoDraft>(() => {
    const nextDraft = {
      ...initialPublishInfoDraft,
      ...(initialDraft ?? {}),
      addressId: initialDraft?.addressId || addressItems.find((item) => item.isCurrent)?.id || addressItems[0]?.id || "",
      childId: initialDraft?.childId || childOptions[0]?.id || "",
      type: initialDraft?.type ?? (role === "parent" && initialType !== "recycle" ? "tutor" : initialType)
    };

    return {
      ...nextDraft,
      trialEnabled: nextDraft.trialEnabled || initialPublishInfoDraft.trialEnabled,
      tutorWageMode: normalizeTutorWageMode(nextDraft.tutorWageMode)
    };
  });
  const isFormValid = getPublishFormValid(draft);
  const selectedType = availablePublishTypeOptions.find((option) => option.value === draft.type) ?? availablePublishTypeOptions[0];
  const SelectedIcon = selectedType.icon;

  /** 更新发布草稿字段。 */
  function handleFieldChange(key: keyof PublishInfoDraft, value: string) {
    setDraft((currentDraft) => {
      const nextValue = key === "tutorWageMode" ? normalizeTutorWageMode(value) : value;
      const nextDraft = {
        ...currentDraft,
        [key]: nextValue
      };

      if (key === "tutorWageMode" && !isTutorWageAmountRequired(nextValue)) {
        return {
          ...nextDraft,
          tutorWageAmount: ""
        };
      }

      return nextDraft;
    });
  }

  /** 切换委托要求标签。 */
  function handleToggleDelegationRequirementTag(tag: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      requirementTags: currentDraft.requirementTags.includes(tag)
        ? currentDraft.requirementTags.filter((item) => item !== tag)
        : [...currentDraft.requirementTags, tag]
    }));
  }

  /** 更新家教计划周期实际选中的日期集合；单独走这个 setter 是因为 handleFieldChange 只接受字符串值。 */
  function handleChangeTutorDates(dates: string[]) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      tutorDates: dates
    }));
  }

  /** 提交发布草稿。 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormValid || isPublishing) {
      return;
    }

    onPublish(draft);
  }

  return (
    <Modal
      ariaLabel="发布信息"
      onClose={onClose}
      onSubmit={handleSubmit}
      panelClassName="publish-info-sheet mx-auto grid max-h-[78vh] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(14px+env(safe-area-inset-bottom))] pt-[14px]"
      panelElement="form"
    >
        <div className="card-title publish-info-header flex items-center justify-between gap-[10px]">
          <SelectedIcon size={18} />
          <div className="publish-info-title-copy">
            <strong>{selectedType.label}发布</strong>
          </div>
          <button
            className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]"
            onClick={onClose}
            type="button"
            aria-label="关闭"
          >
            <XCircle size={20} />
          </button>
        </div>

        <div className="publish-info-body grid gap-[12px]">
          <div className="sheet-section grid gap-[8px]">
            <FieldLabel icon={ListChecks} label="类型" />
            <div className="segmented-control publish-type-tabs wrap flex gap-[8px]" aria-label="选择发布类型">
              {availablePublishTypeOptions.map((option) => {
                const Icon = option.icon;

                return (
                  <button
                    className={draft.type === option.value ? "active" : ""}
                    key={option.value}
                    onClick={() => handleFieldChange("type", option.value)}
                    title={option.label}
                    type="button"
                  >
                    <Icon size={15} />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {draft.type === "delegation" || draft.type === "recycle" ? (
            <DelegationPublishFields
              addressItems={addressItems}
              draft={draft}
              onChange={handleFieldChange}
              onToggleRequirementTag={handleToggleDelegationRequirementTag}
            />
          ) : draft.type === "partTime" ? (
            <PartTimePublishFields draft={draft} onChange={handleFieldChange} />
          ) : (
            <TutorPublishFields
              addressItems={addressItems}
              childOptions={childOptions}
              draft={draft}
              onChange={handleFieldChange}
              onChangeTutorDates={handleChangeTutorDates}
            />
          )}
        </div>

        <div className="sheet-actions publish-info-footer grid gap-[8px]">
          <button
            className="ghost-button publish-info-footer__cancel inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="primary-button publish-info-footer__submit inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={!isFormValid || isPublishing}
            type="submit"
          >
            <CheckCircle2 size={16} />
            {isPublishing ? "发布中" : "发布"}
          </button>
          <button
            className="ghost-button publish-info-footer__save inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            disabled={isPublishing}
            onClick={() => onSave(draft)}
            type="button"
          >
            保存
          </button>
        </div>
    </Modal>
  );
}

/** 委托和回收发布字段。 */
function DelegationPublishFields({
  addressItems,
  draft,
  onChange,
  onToggleRequirementTag
}: {
  addressItems: AddressBookItem[];
  draft: PublishInfoDraft;
  onChange: (key: keyof PublishInfoDraft, value: string) => void;
  onToggleRequirementTag: (tag: string) => void;
}) {
  const amountLabel = draft.type === "recycle" ? "回收金额" : "金额";
  const amountInputDisabled = isNegotiableAmount(draft);

  return (
    <div className="publish-form-fields grid gap-[10px]">
      <TextField
        draft={draft}
        field="title"
        icon={PencilLine}
        label="标题"
        onChange={onChange}
        placeholder="请输入发布标题"
        required
      />
      <label className={`profile-field publish-field grid gap-[7px] ${amountInputDisabled || draft.amount.trim() ? "" : "missing"}`}>
        <FieldLabel icon={CircleDollarSign} label={amountLabel} />
        <div className="segmented-control publish-segmented-field wrap flex gap-[8px]" aria-label="选择委托金额模式">
          <button
            className={draft.amountMode === "input" ? "active" : ""}
            onClick={() => onChange("amountMode", "input")}
            type="button"
          >
            输入金额
          </button>
          <button
            className={draft.amountMode === "negotiable" ? "active" : ""}
            onClick={() => onChange("amountMode", "negotiable")}
            type="button"
          >
            协商
          </button>
        </div>
        <input
          disabled={amountInputDisabled}
          inputMode="decimal"
          onChange={(event) => onChange("amount", event.target.value)}
          placeholder={amountInputDisabled ? "金额将由双方协商确认" : "请输入金额"}
          type="text"
          value={draft.amount}
        />
        {!amountInputDisabled && draft.amount.trim() && !isPositiveAmount(draft.amount) ? (
          <em>金额必须为大于 0 的数字</em>
        ) : null}
      </label>
      <label className={`profile-field publish-field grid gap-[7px] ${draft.depositRequired === "yes" && !isPositiveAmount(draft.depositAmount) ? "missing" : ""}`}>
        <FieldLabel icon={ShieldCheck} label="是否需要押金" />
        <div className="segmented-control publish-segmented-field wrap flex gap-[8px]" aria-label="是否需要委托押金">
          <button
            className={draft.depositRequired === "no" ? "active" : ""}
            onClick={() => onChange("depositRequired", "no")}
            type="button"
          >
            否
          </button>
          <button
            className={draft.depositRequired === "yes" ? "active" : ""}
            onClick={() => onChange("depositRequired", "yes")}
            type="button"
          >
            是
          </button>
        </div>
        {draft.depositRequired === "yes" ? (
          <>
            <input
              inputMode="decimal"
              onChange={(event) => onChange("depositAmount", event.target.value)}
              placeholder="请输入需要冻结的押金金额"
              type="text"
              value={draft.depositAmount}
            />
            {draft.depositAmount.trim() && !isPositiveAmount(draft.depositAmount) ? (
              <em>押金金额必须为大于 0 的数字</em>
            ) : null}
            <em>毁约扣除押金50%。</em>
          </>
        ) : null}
      </label>
      <DelegationTimeField draft={draft} onChange={onChange} />
      <TextAreaField
        draft={draft}
        field="description"
        icon={FileText}
        label="描述"
        onChange={onChange}
        placeholder="请输入服务或物品描述"
      />
      <label className="profile-field publish-field grid gap-[7px]">
        <FieldLabel icon={ListChecks} label="要求" />
        <div className="publish-tag-list flex flex-wrap gap-[8px]" aria-label="选择委托要求">
          {delegationRequirementTags.map((tag) => (
            <button
              className={draft.requirementTags.includes(tag) ? "active" : ""}
              key={tag}
              onClick={() => onToggleRequirementTag(tag)}
              type="button"
            >
              {tag}
            </button>
          ))}
        </div>
      </label>
      <TextField
        draft={draft}
        field="requirement"
        icon={ClipboardCheck}
        label="自定义要求"
        onChange={onChange}
        placeholder="可补充其他要求"
      />
      <label className={`profile-field publish-field grid gap-[7px] ${draft.addressId ? "" : "missing"}`}>
        <FieldLabel icon={MapPin} label="目的地" />
        <select
          disabled={addressItems.length === 0}
          onChange={(event) => onChange("addressId", event.target.value)}
          value={draft.addressId}
        >
          {addressItems.length > 0 ? (
            addressItems.map((item) => (
              <option key={item.id} value={item.id}>
                {getAddressOptionLabel(item)}
              </option>
            ))
          ) : (
            <option value="">暂无目的地，请先到设置添加地址</option>
          )}
        </select>
      </label>
    </div>
  );
}

/** 兼职发布字段。 */
function PartTimePublishFields({
  draft,
  onChange
}: {
  draft: PublishInfoDraft;
  onChange: (key: keyof PublishInfoDraft, value: string) => void;
}) {
  return (
    <div className="publish-form-fields grid gap-[10px]">
      <TextField
        draft={draft}
        field="title"
        icon={PencilLine}
        label="标题"
        onChange={onChange}
        placeholder="请输入兼职标题"
        required
      />
      <TextAreaField
        draft={draft}
        field="description"
        icon={FileText}
        label="描述"
        onChange={onChange}
        placeholder="请输入兼职内容"
      />
      <TextAreaField
        draft={draft}
        field="requirement"
        icon={ListChecks}
        label="要求"
        onChange={onChange}
        placeholder="请输入报名要求"
      />
      <TextField
        draft={draft}
        field="checkInMode"
        icon={QrCode}
        label="签到方式"
        onChange={onChange}
        placeholder="例如二维码签到、定位签到"
      />
      <SegmentedField
        draft={draft}
        field="partTimeWageMode"
        icon={WalletCards}
        label="计薪方式"
        onChange={onChange}
        options={partTimeWageModeOptions}
      />
      <TextAreaField
        draft={draft}
        field="signupFields"
        icon={ClipboardCheck}
        label="报名表单"
        onChange={onChange}
        placeholder="请输入需要报名人填写的信息"
      />
    </div>
  );
}

/** 家教招募和家教聘用共用发布字段。 */
function TutorPublishFields({
  addressItems,
  childOptions,
  draft,
  onChange,
  onChangeTutorDates
}: {
  addressItems: AddressBookItem[];
  childOptions: ChildProfileOption[];
  draft: PublishInfoDraft;
  onChange: (key: keyof PublishInfoDraft, value: string) => void;
  onChangeTutorDates: (dates: string[]) => void;
}) {
  return (
    <div className="publish-form-fields grid gap-[10px]">
      <TextField
        draft={draft}
        field="title"
        icon={PencilLine}
        label="标题"
        onChange={onChange}
        placeholder="请输入发布任务描述"
        required
      />
      <label className="profile-field publish-field grid gap-[7px]">
        <FieldLabel icon={UserRound} label="孩子" />
        <select onChange={(event) => onChange("childId", event.target.value)} value={draft.childId}>
          <option value="">暂不指定孩子</option>
          {childOptions.map((child) => (
            <option key={child.id} value={child.id}>
              {[child.name, child.grade, child.school].filter(Boolean).join(" · ")}
            </option>
          ))}
        </select>
      </label>
      <MultiTagChoiceField
        draft={draft}
        field="tutorSubject"
        icon={BookOpen}
        label="学科"
        onChange={onChange}
        options={tutorSubjectOptions}
      />
      <TutorPlanPeriodField draft={draft} onChange={onChange} onChangeTutorDates={onChangeTutorDates} />
      <SwitchField
        checked={draft.trialEnabled === "是"}
        icon={BadgeCheck}
        label="是否试课"
        offLabel="否"
        onChange={(checked) => onChange("trialEnabled", checked ? "是" : "否")}
        onLabel="是"
      />
      <TutorWageField draft={draft} onChange={onChange} />
      <TutorAddressField addressItems={addressItems} draft={draft} onChange={onChange} />
      <TextAreaField
        draft={draft}
        field="description"
        icon={FileText}
        label="补充信息"
        onChange={onChange}
        placeholder="可补充孩子情况、授课偏好或其他说明"
      />
    </div>
  );
}

/** 家教计薪字段，按小时和按天时必须补充金额。 */
function TutorWageField({
  draft,
  onChange
}: {
  draft: PublishInfoDraft;
  onChange: PublishInfoFieldChange;
}) {
  const wageMode = normalizeTutorWageMode(draft.tutorWageMode);
  const shouldInputAmount = isTutorWageAmountRequired(wageMode);
  const hasInvalidAmount = shouldInputAmount && draft.tutorWageAmount.trim() && !isPositiveAmount(draft.tutorWageAmount);

  return (
    <label className={`profile-field publish-field grid gap-[7px] ${shouldInputAmount && !isPositiveAmount(draft.tutorWageAmount) ? "missing" : ""}`}>
      <FieldLabel icon={WalletCards} label="计薪方式" />
      <div className="segmented-control publish-segmented-field wrap flex gap-[8px]">
        {tutorWageModeOptions.map((option) => (
          <button className={wageMode === option ? "active" : ""} key={option} onClick={() => onChange("tutorWageMode", option)} type="button">
            {option}
          </button>
        ))}
      </div>
      {shouldInputAmount ? (
        <>
          <input
            inputMode="decimal"
            onChange={(event) => onChange("tutorWageAmount", event.target.value)}
            placeholder={wageMode === "按天结算" ? "请输入每天金额" : "请输入每小时金额"}
            type="text"
            value={draft.tutorWageAmount}
          />
          {hasInvalidAmount ? <em>计薪金额必须为大于 0 的数字</em> : null}
        </>
      ) : null}
    </label>
  );
}

/** 家教授课地址字段。 */
function TutorAddressField({
  addressItems,
  draft,
  onChange
}: {
  addressItems: AddressBookItem[];
  draft: PublishInfoDraft;
  onChange: PublishInfoFieldChange;
}) {
  return (
    <label className={`profile-field publish-field grid gap-[7px] ${draft.addressId ? "" : "missing"}`}>
      <FieldLabel icon={MapPin} label="授课地址（必填）" />
      <select
        disabled={addressItems.length === 0}
        onChange={(event) => onChange("addressId", event.target.value)}
        value={draft.addressId}
      >
        {addressItems.length > 0 ? (
          addressItems.map((item) => (
            <option key={item.id} value={item.id}>
              {getAddressOptionLabel(item)}
            </option>
          ))
        ) : (
          <option value="">暂无地址，请先添加地址</option>
        )}
      </select>
    </label>
  );
}

/** 家教招募和家教聘用的计划周期字段，合并开始和结束日期入口。 */
function TutorPlanPeriodField({
  draft,
  onChange,
  onChangeTutorDates
}: {
  draft: PublishInfoDraft;
  onChange: PublishInfoFieldChange;
  onChangeTutorDates: (dates: string[]) => void;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const hasInvalidDateRange = Boolean(draft.tutorDateStart && draft.tutorDateEnd && draft.tutorDateEnd < draft.tutorDateStart);
  const hasSelectedRange = Boolean(draft.tutorDateStart && draft.tutorDateEnd && !hasInvalidDateRange);

  /** 重置计划周期：清空选中的完整日期集合和推导出的开始~结束日期。 */
  function handleResetPeriod() {
    onChangeTutorDates([]);
    onChange("tutorDateStart", "");
    onChange("tutorDateEnd", "");
  }

  return (
    <div className={`profile-field publish-field tutor-period-date-field grid gap-[8px] ${hasSelectedRange ? "" : "missing"}`}>
      <FieldLabel icon={CalendarDays} label="计划周期" />
      <div className={`tutor-period-date-field__trigger flex items-center justify-between gap-[10px] ${hasSelectedRange ? "filled" : ""}`}>
        <div
          aria-haspopup="dialog"
          aria-label="选择计划周期"
          className="tutor-period-date-field__open grid gap-[2px]"
          onClick={() => setIsPickerOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsPickerOpen(true);
            }
          }}
          role="button"
          tabIndex={0}
        >
          {hasSelectedRange ? (
            <span className="tutor-period-date-field__count">共 {draft.tutorDates.length} 天</span>
          ) : null}
          <span className="tutor-period-date-field__value">{formatPublishPeriodDatesDetail(draft.tutorDates)}</span>
        </div>
        {hasSelectedRange ? (
          <button className="tutor-period-date-field__reset text-button" onClick={handleResetPeriod} type="button">
            重置
          </button>
        ) : null}
      </div>
      {hasInvalidDateRange ? <em>周期结束日期不能早于开始日期</em> : null}
      {isPickerOpen ? (
        <TutorPlanPeriodPicker
          draft={draft}
          onChange={onChange}
          onChangeTutorDates={onChangeTutorDates}
          onClose={() => setIsPickerOpen(false)}
        />
      ) : null}
    </div>
  );
}

/** 家教计划周期弹窗，用日历面板选择开始~结束日期。 */
function TutorPlanPeriodPicker({
  draft,
  onChange,
  onChangeTutorDates,
  onClose
}: {
  draft: PublishInfoDraft;
  onChange: PublishInfoFieldChange;
  onChangeTutorDates: (dates: string[]) => void;
  onClose: () => void;
}) {
  const todayKey = useMemo(() => getTutorDateKey(new Date()), []);
  /** 初始选中日期优先用草稿里已经保存的零散日期集合；老草稿只有开始~结束区间时，退化成展开这段连续区间。 */
  const initialSelectedDateKeys = useMemo(
    () => (draft.tutorDates.length > 0 ? draft.tutorDates : getPublishPeriodRangeDateKeys(draft.tutorDateStart, draft.tutorDateEnd)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [activeDate, setActiveDate] = useState(draft.tutorDateStart || todayKey);
  /** 日历当前选中的日期集合（可以是不连续的零散日期），是本弹窗的选中数据源头；开始~结束日期只是从中推导出的连续区间摘要。 */
  const [selectedDateKeys, setSelectedDateKeys] = useState<string[]>(initialSelectedDateKeys);
  const sortedSelectedDateKeys = useMemo(() => [...selectedDateKeys].sort(), [selectedDateKeys]);
  const periodStartDate = sortedSelectedDateKeys[0] ?? "";
  const periodEndDate = sortedSelectedDateKeys[sortedSelectedDateKeys.length - 1] ?? "";
  const hasSelectedRange = selectedDateKeys.length > 0;

  /**
   * 选中日期集合变化后，把完整日期集合和推导出的开始~结束日期一起同步回发布草稿：
   * tutorDates 保留真实的零散选中结果，tutorDateStart/tutorDateEnd 只作展示用的连续区间摘要，
   * 提交接口时两者都会带上，不会再出现"选的零散日期、提交后只剩一段连续区间"的丢失。
   * 确认按钮的可点击状态直接看 hasSelectedRange，不受这里的一拍延迟影响。
   */
  useEffect(() => {
    onChangeTutorDates(sortedSelectedDateKeys);
    onChange("tutorDateStart", periodStartDate);
    onChange("tutorDateEnd", periodEndDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedSelectedDateKeys, periodStartDate, periodEndDate]);

  /** 单击已查看日期或滑动选择结束时触发：切换选中，支持多选和滑动批量选中/取消。 */
  function handleToggleSelectedDate(dateKey: string) {
    setSelectedDateKeys((currentDateKeys) =>
      currentDateKeys.includes(dateKey)
        ? currentDateKeys.filter((currentDateKey) => currentDateKey !== dateKey)
        : [...currentDateKeys, dateKey]
    );
  }

  return (
    <Modal
      ariaLabel="选择计划周期"
      onClose={onClose}
      panelClassName="tutor-plan-period-modal mx-auto grid max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
    >
        <div className="card-title flex items-center justify-between gap-[10px]">
          <CalendarDays size={18} />
          <div className="tutor-plan-period-title-copy">
            <strong>计划周期</strong>
            <span>{formatPublishPeriodRange(periodStartDate, periodEndDate)}</span>
          </div>
          <button aria-label="关闭" className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]" onClick={onClose} type="button">
            <XCircle size={20} />
          </button>
        </div>

        <ScheduleCalendar
          activeDate={activeDate}
          maxSelectedDates={null}
          mode="edit"
          onActiveDateChange={setActiveDate}
          onToggleDate={handleToggleSelectedDate}
          selectedDates={selectedDateKeys}
        />

        <div className="sheet-actions flex gap-[10px]">
          <button className="ghost-button flex-1 min-h-[38px] px-[10px] py-[8px]" onClick={onClose} type="button">
            取消
          </button>
          <button
            className="primary-button flex-1 min-h-[38px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={!hasSelectedRange}
            onClick={onClose}
            type="button"
          >
            完成
          </button>
        </div>
    </Modal>
  );
}

/** 委托时间字段，支持快捷时效和手动截止时间。 */
function DelegationTimeField({
  draft,
  onChange
}: {
  draft: PublishInfoDraft;
  onChange: PublishInfoFieldChange;
}) {
  const value = draft.delegationTime;

  /** 更新当前绑定的委托时间字段。 */
  function handleChange(value: string) {
    onChange("delegationTime", value);
  }

  return (
    <label className={`profile-field publish-field grid gap-[7px] ${value.trim() ? "" : "missing"}`}>
      <FieldLabel icon={Clock3} label="完成截止时间" />
      <div className="publish-time-options flex flex-wrap gap-[8px]">
        {delegationTimeQuickOptions.map((timeOption) => (
          <button
            className={value === timeOption ? "active" : ""}
            key={timeOption}
            onClick={() => handleChange(timeOption)}
            type="button"
          >
            {timeOption.replace("min", " 分钟内")}
          </button>
        ))}
      </div>
      <input
        aria-label="委托完成截止时间"
        onChange={(event) => handleChange(event.target.value)}
        type="time"
        value={getNativeTimeValue(value)}
      />
    </label>
  );
}

/** 单行文本发布字段。 */
function TextField({
  draft,
  errorText,
  field,
  icon,
  inputMode = "text",
  label,
  onChange,
  placeholder,
  required = false
}: {
  draft: PublishInfoDraft;
  errorText?: string;
  field: PublishInfoStringField;
  icon: typeof Plus;
  inputMode?: "decimal" | "text";
  label: string;
  onChange: PublishInfoFieldChange;
  placeholder: string;
  required?: boolean;
}) {
  const value = String(draft[field] ?? "");

  return (
    <label className={`profile-field publish-field grid gap-[7px] ${required && !value.trim() ? "missing" : ""}`}>
      <FieldLabel icon={icon} label={label} />
      <input
        inputMode={inputMode}
        onChange={(event) => onChange(field, event.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
      {errorText ? <em>{errorText}</em> : null}
    </label>
  );
}

/** 多行文本发布字段。 */
function TextAreaField({
  draft,
  field,
  icon,
  label,
  onChange,
  placeholder,
  required = false
}: {
  draft: PublishInfoDraft;
  field: PublishInfoStringField;
  icon: typeof Plus;
  label: string;
  onChange: PublishInfoFieldChange;
  placeholder: string;
  required?: boolean;
}) {
  const value = String(draft[field] ?? "");

  return (
    <label className={`profile-field publish-field grid gap-[7px] ${required && !value.trim() ? "missing" : ""}`}>
      <FieldLabel icon={icon} label={label} />
      <textarea onChange={(event) => onChange(field, event.target.value)} placeholder={placeholder} value={value} />
    </label>
  );
}

/** 标签式单选发布字段。 */
function SegmentedField({
  draft,
  field,
  icon,
  label,
  onChange,
  options
}: {
  draft: PublishInfoDraft;
  field: PublishInfoStringField;
  icon: typeof Plus;
  label: string;
  onChange: PublishInfoFieldChange;
  options: string[];
}) {
  const value = String(draft[field] ?? "");

  return (
    <label className={`profile-field publish-field grid gap-[7px] ${value ? "" : "missing"}`}>
      <FieldLabel icon={icon} label={label} />
      <div className="segmented-control publish-segmented-field wrap flex gap-[8px]">
        {options.map((option) => (
          <button className={value === option ? "active" : ""} key={option} onClick={() => onChange(field, option)} type="button">
            {option}
          </button>
        ))}
      </div>
    </label>
  );
}

/** 可点击 div 模拟的单选 tag，用于发布弹窗内不需要按钮语义的轻量选项。 */
function PublishChoiceTag({
  active,
  label,
  onSelect
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <div
      aria-pressed={active}
      className={`publish-choice-tag ${active ? "active" : ""}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {label}
    </div>
  );
}

/** 发布弹窗内的开关字段，用于是/否类轻量配置。 */
function SwitchField({
  checked,
  icon,
  label,
  offLabel,
  onChange,
  onLabel
}: {
  checked: boolean;
  icon: typeof Plus;
  label: string;
  offLabel: string;
  onChange: (checked: boolean) => void;
  onLabel: string;
}) {
  const nextChecked = !checked;

  return (
    <div className="profile-field publish-field publish-switch-field grid gap-[7px]">
      <FieldLabel icon={icon} label={label} />
      <div className="publish-switch-row">
        <div
          aria-checked={checked}
          aria-label={label}
          className={`publish-switch ${checked ? "active" : ""}`}
          onClick={() => onChange(nextChecked)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onChange(nextChecked);
            }
          }}
          role="switch"
          tabIndex={0}
        >
          <span className="publish-switch__thumb" />
        </div>
        <span className="publish-switch__value">{checked ? onLabel : offLabel}</span>
      </div>
    </div>
  );
}

/** 标签式多选发布字段，使用 div 模拟 tag 并用顿号格式持久化选中项。 */
function MultiTagChoiceField({
  draft,
  field,
  icon,
  label,
  onChange,
  options
}: {
  draft: PublishInfoDraft;
  field: PublishInfoStringField;
  icon: typeof Plus;
  label: string;
  onChange: PublishInfoFieldChange;
  options: string[];
}) {
  const value = String(draft[field] ?? "");
  const selectedOptions = parseTutorSubjects(value);

  /** 切换一个 tag 选项，并按项目现有学科字符串格式写回草稿。 */
  function handleToggleOption(option: string) {
    const nextOptions = selectedOptions.includes(option)
      ? selectedOptions.filter((selectedOption) => selectedOption !== option)
      : [...selectedOptions, option];

    onChange(field, formatTutorSubjects(nextOptions));
  }

  return (
    <label className={`profile-field publish-field grid gap-[7px] ${selectedOptions.length > 0 ? "" : "missing"}`}>
      <FieldLabel icon={icon} label={label} />
      <div className="publish-choice-tags flex flex-wrap gap-[8px]" aria-label={`多选${label}`}>
        {options.map((option) => (
          <PublishChoiceTag
            active={selectedOptions.includes(option)}
            key={option}
            label={option}
            onSelect={() => handleToggleOption(option)}
          />
        ))}
      </div>
    </label>
  );
}
