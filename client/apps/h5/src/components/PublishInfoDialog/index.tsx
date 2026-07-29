import "./index.less";
import { BriefcaseBusiness, CheckCircle2, GraduationCap, PackageCheck, Plus, XCircle } from "lucide-react";
import { tutorSubjectOptions } from "@shared/tutorModel";
import {
  delegationRequirementTags,
  isNegotiableAmount,
  isPositiveAmount
} from "@tools/publishInfo";

export { PublishDraftConfirmDialog } from "./PublishDraftConfirmDialog";

/** 发布信息弹窗属性。 */
export interface PublishInfoDialogProps {
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
  { icon: GraduationCap, label: "家教", parentOnly: true, value: "tutor" }
];

/** 回收快捷入口使用的独立类型配置。 */
const recycleTypeOption: PublishTypeOption = { icon: PackageCheck, label: "回收", value: "recycle" };

/** 兼职计薪方式。 */
const partTimeWageModeOptions = ["按日结算", "汇总结算"];

/** 家教计薪方式。 */
const tutorWageModeOptions = ["按课时结算", "按次结算", "汇总结算"];


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
  trialEnabled: "否",
  tutorDateEnd: "",
  tutorDateStart: "",
  tutorSchoolTags: [],
  tutorSubject: "",
  tutorTime: "",
  tutorWageMode: "按课时结算",
  type: "delegation"
};

/** 委托时间快捷选项。 */
const delegationTimeQuickOptions = ["5min", "10min", "15min", "20min"];

/** 判断字符串是否为原生时间选择器可展示的 HH:mm。 */
function getNativeTimeValue(value: string) {
  return /^\d{2}:\d{2}$/.test(value) ? value : "";
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

  return hasTitle && Boolean(draft.addressId.trim()) && Boolean(draft.tutorDateStart.trim()) && Boolean(draft.tutorDateEnd.trim());
}

/** 发布信息弹窗，采集发布入口和独立回收入口的表单草稿。 */
export function PublishInfoDialog({
  addressItems,
  childOptions = [],
  initialDraft = null,
  initialType = "delegation",
  isPublishing = false,
  onClose,
  onPublish,
  onSave,
  role
}: PublishInfoDialogProps) {
  const availablePublishTypeOptions =
    initialType === "recycle"
      ? [recycleTypeOption]
      : role === "parent"
        ? publishTypeOptions.filter((option) => option.value === "tutor")
        : publishTypeOptions.filter((option) => !option.parentOnly);
  const [draft, setDraft] = useState<PublishInfoDraft>(() => ({
    ...initialPublishInfoDraft,
    ...(initialDraft ?? {}),
    addressId: initialDraft?.addressId || addressItems.find((item) => item.isCurrent)?.id || addressItems[0]?.id || "",
    childId: initialDraft?.childId || childOptions[0]?.id || "",
    type: initialDraft?.type ?? (role === "parent" && initialType !== "recycle" ? "tutor" : initialType)
  }));
  const isFormValid = getPublishFormValid(draft);
  const selectedType = availablePublishTypeOptions.find((option) => option.value === draft.type) ?? availablePublishTypeOptions[0];
  const SelectedIcon = selectedType.icon;

  /** 更新发布草稿字段。 */
  function handleFieldChange(key: keyof PublishInfoDraft, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [key]: value
    }));
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

  /** 提交发布草稿。 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormValid || isPublishing) {
      return;
    }

    onPublish(draft);
  }

  return (
    <section className="checkout-sheet" aria-label="发布信息">
      <div className="sheet-backdrop" onClick={onClose} />
      <form
        className="sheet-panel publish-info-sheet mx-auto grid max-h-[78vh] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(14px+env(safe-area-inset-bottom))] pt-[14px]"
        onSubmit={handleSubmit}
      >
        <div className="card-title publish-info-header flex items-center justify-between gap-[10px]">
          <SelectedIcon size={18} />
          <div>
            <strong>发布信息</strong>
            <span>{selectedType.label}发布表单</span>
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
            <span>类型</span>
            <div className="segmented-control publish-type-tabs wrap flex gap-[8px]" aria-label="选择发布类型">
              {availablePublishTypeOptions.map((option) => {
                const Icon = option.icon;

                return (
                  <button
                    className={draft.type === option.value ? "active" : ""}
                    key={option.value}
                    onClick={() => handleFieldChange("type", option.value)}
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
            />
          )}
        </div>

        <div className="sheet-actions publish-info-footer grid gap-[8px]">
          <button
            className="ghost-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="ghost-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            disabled={isPublishing}
            onClick={() => onSave(draft)}
            type="button"
          >
            保存
          </button>
          <button
            className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={!isFormValid || isPublishing}
            type="submit"
          >
            <CheckCircle2 size={16} />
            {isPublishing ? "发布中" : "发布"}
          </button>
        </div>
      </form>
    </section>
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
        label="标题"
        onChange={onChange}
        placeholder="请输入发布标题"
        required
      />
      <label className={`profile-field publish-field grid gap-[7px] ${amountInputDisabled || draft.amount.trim() ? "" : "missing"}`}>
        <span>{amountLabel}</span>
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
        <span>是否需要押金</span>
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
        label="描述"
        onChange={onChange}
        placeholder="请输入服务或物品描述"
      />
      <label className="profile-field publish-field grid gap-[7px]">
        <span>要求</span>
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
        label="自定义要求"
        onChange={onChange}
        placeholder="可补充其他要求"
      />
      <label className={`profile-field publish-field grid gap-[7px] ${draft.addressId ? "" : "missing"}`}>
        <span>目的地</span>
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
        label="标题"
        onChange={onChange}
        placeholder="请输入兼职标题"
        required
      />
      <TextAreaField
        draft={draft}
        field="description"
        label="描述"
        onChange={onChange}
        placeholder="请输入兼职内容"
      />
      <TextAreaField
        draft={draft}
        field="requirement"
        label="要求"
        onChange={onChange}
        placeholder="请输入报名要求"
      />
      <TextField
        draft={draft}
        field="checkInMode"
        label="签到方式"
        onChange={onChange}
        placeholder="例如二维码签到、定位签到"
      />
      <SegmentedField
        draft={draft}
        field="partTimeWageMode"
        label="计薪方式"
        onChange={onChange}
        options={partTimeWageModeOptions}
      />
      <TextAreaField
        draft={draft}
        field="signupFields"
        label="报名表单"
        onChange={onChange}
        placeholder="请输入需要报名人填写的信息"
      />
    </div>
  );
}

/** 家教发布字段。 */
function TutorPublishFields({
  addressItems,
  childOptions,
  draft,
  onChange
}: {
  addressItems: AddressBookItem[];
  childOptions: ChildProfileOption[];
  draft: PublishInfoDraft;
  onChange: (key: keyof PublishInfoDraft, value: string) => void;
}) {
  return (
    <div className="publish-form-fields grid gap-[10px]">
      <TextField
        draft={draft}
        field="title"
        label="标题"
        onChange={onChange}
        placeholder="请输入家教标题"
        required
      />
      <TextAreaField
        draft={draft}
        field="description"
        label="描述"
        onChange={onChange}
        placeholder="请输入家教需求描述"
      />
      <SegmentedField
        draft={draft}
        field="tutorSubject"
        label="要求学科"
        onChange={onChange}
        options={tutorSubjectOptions}
      />
      <label className={`profile-field publish-field grid gap-[7px] ${draft.addressId ? "" : "missing"}`}>
        <span>授课地址（必填）</span>
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
      <label className="profile-field publish-field grid gap-[7px]">
        <span>选择孩子</span>
        <select onChange={(event) => onChange("childId", event.target.value)} value={draft.childId}>
          <option value="">暂不指定孩子</option>
          {childOptions.map((child) => (
            <option key={child.id} value={child.id}>
              {[child.name, child.grade, child.school].filter(Boolean).join(" · ")}
            </option>
          ))}
        </select>
      </label>
      <div className="tutor-period-fields grid grid-cols-2 gap-[8px]">
        <label className={`profile-field publish-field grid gap-[7px] ${draft.tutorDateStart ? "" : "missing"}`}>
          <span>周期开始</span>
          <input onChange={(event) => onChange("tutorDateStart", event.target.value)} type="date" value={draft.tutorDateStart} />
        </label>
        <label className={`profile-field publish-field grid gap-[7px] ${draft.tutorDateEnd ? "" : "missing"}`}>
          <span>周期结束</span>
          <input onChange={(event) => onChange("tutorDateEnd", event.target.value)} type="date" value={draft.tutorDateEnd} />
        </label>
      </div>
      <SegmentedField
        draft={draft}
        field="trialEnabled"
        label="是否试课"
        onChange={onChange}
        options={["否", "是"]}
      />
      <SegmentedField
        draft={draft}
        field="tutorWageMode"
        label="计薪方式"
        onChange={onChange}
        options={tutorWageModeOptions}
      />
      <TextAreaField
        draft={draft}
        field="requirement"
        label="要求"
        onChange={onChange}
        placeholder="请输入授课要求"
      />
    </div>
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
      <span>完成截止时间</span>
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
  inputMode = "text",
  label,
  onChange,
  placeholder,
  required = false
}: {
  draft: PublishInfoDraft;
  errorText?: string;
  field: PublishInfoStringField;
  inputMode?: "decimal" | "text";
  label: string;
  onChange: PublishInfoFieldChange;
  placeholder: string;
  required?: boolean;
}) {
  const value = String(draft[field] ?? "");

  return (
    <label className={`profile-field publish-field grid gap-[7px] ${required && !value.trim() ? "missing" : ""}`}>
      <span>{label}</span>
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
  label,
  onChange,
  placeholder,
  required = false
}: {
  draft: PublishInfoDraft;
  field: PublishInfoStringField;
  label: string;
  onChange: PublishInfoFieldChange;
  placeholder: string;
  required?: boolean;
}) {
  const value = String(draft[field] ?? "");

  return (
    <label className={`profile-field publish-field grid gap-[7px] ${required && !value.trim() ? "missing" : ""}`}>
      <span>{label}</span>
      <textarea onChange={(event) => onChange(field, event.target.value)} placeholder={placeholder} value={value} />
    </label>
  );
}

/** 标签式单选发布字段。 */
function SegmentedField({
  draft,
  field,
  label,
  onChange,
  options
}: {
  draft: PublishInfoDraft;
  field: PublishInfoStringField;
  label: string;
  onChange: PublishInfoFieldChange;
  options: string[];
}) {
  const value = String(draft[field] ?? "");

  return (
    <label className={`profile-field publish-field grid gap-[7px] ${value ? "" : "missing"}`}>
      <span>{label}</span>
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
