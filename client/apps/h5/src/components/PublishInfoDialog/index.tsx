import { BriefcaseBusiness, CheckCircle2, GraduationCap, PackageCheck, Plus, XCircle } from "lucide-react";
import type { FormEvent } from "react";
import { tutorSubjectOptions } from "../../shared/tutorModel";
import {
  delegationRequirementTags,
  isNegotiableAmount,
  isPositiveAmount,
  type PublishInfoDraft,
  type PublishInfoType
} from "../../tools/publishInfo";

/** 发布信息弹窗属性。 */
export interface PublishInfoDialogProps {
  addressItems: AddressBookItem[];
  initialType?: PublishInfoType;
  isPublishing?: boolean;
  onClose: () => void;
  onPublish: (draft: PublishInfoDraft) => void;
  onSave: (draft: PublishInfoDraft) => void;
  role: Role;
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
  { icon: GraduationCap, label: "家教", parentOnly: true, value: "tutor" }
];

/** 回收快捷入口使用的独立类型配置。 */
const recycleTypeOption: PublishTypeOption = { icon: PackageCheck, label: "回收", value: "recycle" };

/** 兼职计薪方式。 */
const partTimeWageModeOptions = ["按日结算", "汇总结算"];

/** 家教计薪方式。 */
const tutorWageModeOptions = ["按课时结算", "按次结算", "汇总结算"];

/** 家教报名学校要求标签。 */
const tutorSchoolRequirementTags = ["985", "211", "博士", "硕士", "华5", "C9", "常青藤", "双一流", "师范类"];

/** 发布信息表单初始值。 */
const initialPublishInfoDraft: PublishInfoDraft = {
  addressId: "",
  amount: "",
  amountMode: "input",
  checkInMode: "",
  delegationTime: "",
  description: "",
  partTimeWageMode: "按日结算",
  requirement: "",
  requirementTags: [],
  signupFields: "",
  title: "",
  trialDuration: "",
  trialEnabled: "否",
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

    return hasTitle && hasValidAmount && Boolean(draft.delegationTime.trim());
  }

  if (draft.type === "partTime") {
    return hasTitle;
  }

  return hasTitle && Boolean(draft.tutorTime.trim());
}

/** 发布信息弹窗，采集发布入口和独立回收入口的表单草稿。 */
export function PublishInfoDialog({
  addressItems,
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
      : publishTypeOptions.filter((option) => !option.parentOnly || role === "parent");
  const [draft, setDraft] = useState<PublishInfoDraft>(() => ({
    ...initialPublishInfoDraft,
    addressId: addressItems.find((item) => item.isCurrent)?.id ?? addressItems[0]?.id ?? "",
    type: initialType
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

  /** 切换家教报名学校要求标签。 */
  function handleToggleTutorSchoolTag(tag: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      tutorSchoolTags: currentDraft.tutorSchoolTags.includes(tag)
        ? currentDraft.tutorSchoolTags.filter((item) => item !== tag)
        : [...currentDraft.tutorSchoolTags, tag]
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
              draft={draft}
              onChange={handleFieldChange}
              onToggleSchoolTag={handleToggleTutorSchoolTag}
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
        label="标题"
        onChange={(value) => onChange("title", value)}
        placeholder="请输入发布标题"
        required
        value={draft.title}
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
      <DelegationTimeField onChange={(value) => onChange("delegationTime", value)} value={draft.delegationTime} />
      <TextAreaField
        label="描述"
        onChange={(value) => onChange("description", value)}
        placeholder="请输入服务或物品描述"
        value={draft.description}
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
        label="自定义要求"
        onChange={(value) => onChange("requirement", value)}
        placeholder="可补充其他要求"
        value={draft.requirement}
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
        label="标题"
        onChange={(value) => onChange("title", value)}
        placeholder="请输入兼职标题"
        required
        value={draft.title}
      />
      <TextAreaField
        label="描述"
        onChange={(value) => onChange("description", value)}
        placeholder="请输入兼职内容"
        value={draft.description}
      />
      <TextAreaField
        label="要求"
        onChange={(value) => onChange("requirement", value)}
        placeholder="请输入报名要求"
        value={draft.requirement}
      />
      <TextField
        label="签到方式"
        onChange={(value) => onChange("checkInMode", value)}
        placeholder="例如二维码签到、定位签到"
        value={draft.checkInMode}
      />
      <SegmentedField
        label="计薪方式"
        onChange={(value) => onChange("partTimeWageMode", value)}
        options={partTimeWageModeOptions}
        value={draft.partTimeWageMode}
      />
      <TextAreaField
        label="报名表单"
        onChange={(value) => onChange("signupFields", value)}
        placeholder="请输入需要报名人填写的信息"
        value={draft.signupFields}
      />
    </div>
  );
}

/** 家教发布字段。 */
function TutorPublishFields({
  draft,
  onChange,
  onToggleSchoolTag
}: {
  draft: PublishInfoDraft;
  onChange: (key: keyof PublishInfoDraft, value: string) => void;
  onToggleSchoolTag: (tag: string) => void;
}) {
  return (
    <div className="publish-form-fields grid gap-[10px]">
      <TextField
        label="标题"
        onChange={(value) => onChange("title", value)}
        placeholder="请输入家教标题"
        required
        value={draft.title}
      />
      <TextAreaField
        label="描述"
        onChange={(value) => onChange("description", value)}
        placeholder="请输入家教需求描述"
        value={draft.description}
      />
      <TextAreaField
        label="要求"
        onChange={(value) => onChange("requirement", value)}
        placeholder="请输入授课要求"
        value={draft.requirement}
      />
      <SegmentedField
        label="要求学科"
        onChange={(value) => onChange("tutorSubject", value)}
        options={tutorSubjectOptions}
        value={draft.tutorSubject}
      />
      <TextField
        label="时间"
        onChange={(value) => onChange("tutorTime", value)}
        placeholder="例如周末上午 9:00-11:00"
        required
        value={draft.tutorTime}
      />
      <SegmentedField
        label="是否试课"
        onChange={(value) => onChange("trialEnabled", value)}
        options={["否", "是"]}
        value={draft.trialEnabled}
      />
      {draft.trialEnabled === "是" ? (
        <TextField
          label="试课时长"
          onChange={(value) => onChange("trialDuration", value)}
          placeholder="例如 30 分钟"
          value={draft.trialDuration}
        />
      ) : null}
      <SegmentedField
        label="计薪方式"
        onChange={(value) => onChange("tutorWageMode", value)}
        options={tutorWageModeOptions}
        value={draft.tutorWageMode}
      />
      <label className="profile-field publish-field grid gap-[7px]">
        <span>报名学校要求</span>
        <div className="publish-tag-list flex flex-wrap gap-[8px]" aria-label="选择报名学校要求">
          {tutorSchoolRequirementTags.map((tag) => (
            <button
              className={draft.tutorSchoolTags.includes(tag) ? "active" : ""}
              key={tag}
              onClick={() => onToggleSchoolTag(tag)}
              type="button"
            >
              {tag}
            </button>
          ))}
        </div>
      </label>
    </div>
  );
}

/** 委托时间字段，支持快捷时效和手动截止时间。 */
function DelegationTimeField({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  return (
    <label className={`profile-field publish-field grid gap-[7px] ${value.trim() ? "" : "missing"}`}>
      <span>完成截止时间</span>
      <div className="publish-time-options flex flex-wrap gap-[8px]">
        {delegationTimeQuickOptions.map((timeOption) => (
          <button
            className={value === timeOption ? "active" : ""}
            key={timeOption}
            onClick={() => onChange(timeOption)}
            type="button"
          >
            {timeOption.replace("min", " 分钟内")}
          </button>
        ))}
      </div>
      <input
        aria-label="委托完成截止时间"
        onChange={(event) => onChange(event.target.value)}
        type="time"
        value={getNativeTimeValue(value)}
      />
    </label>
  );
}

/** 单行文本发布字段。 */
function TextField({
  errorText,
  inputMode = "text",
  label,
  onChange,
  placeholder,
  required = false,
  value
}: {
  errorText?: string;
  inputMode?: "decimal" | "text";
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  value: string;
}) {
  return (
    <label className={`profile-field publish-field grid gap-[7px] ${required && !value.trim() ? "missing" : ""}`}>
      <span>{label}</span>
      <input
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
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
  label,
  onChange,
  placeholder,
  required = false,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  value: string;
}) {
  return (
    <label className={`profile-field publish-field grid gap-[7px] ${required && !value.trim() ? "missing" : ""}`}>
      <span>{label}</span>
      <textarea onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
    </label>
  );
}

/** 标签式单选发布字段。 */
function SegmentedField({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className={`profile-field publish-field grid gap-[7px] ${value ? "" : "missing"}`}>
      <span>{label}</span>
      <div className="segmented-control publish-segmented-field wrap flex gap-[8px]">
        {options.map((option) => (
          <button className={value === option ? "active" : ""} key={option} onClick={() => onChange(option)} type="button">
            {option}
          </button>
        ))}
      </div>
    </label>
  );
}
