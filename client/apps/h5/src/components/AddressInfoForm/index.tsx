import "./index.less";
import { normalizeByKey, validateByKey } from "@tools/validation";

/** 未传入地址草稿时使用的稳定空对象，避免 effect 因默认对象反复触发。 */
const emptyAddressDraft: ProfileDraftState = {};

/** 注册、资料补充和设置预览共用的地址信息表单。 */
export function AddressInfoForm({
  actionLabel = "编辑",
  areaOptions = [],
  draft,
  emptyText = "未填写",
  fields,
  item,
  isCurrent,
  mode = "edit",
  onChange,
  onDelete,
  onEdit,
  onUse,
  previewVariant = "list"
}: AddressInfoFormProps) {
  const sourceDraft = item?.draft ?? draft ?? emptyAddressDraft;
  const resolvedIsCurrent = item?.isCurrent ?? isCurrent ?? false;
  const sourceDraftKey = fields.map((field) => `${field.key}:${sourceDraft[field.key] ?? ""}`).join("|");
  const [formDraft, setFormDraft] = useState<ProfileDraftState>(() => ({ ...sourceDraft }));

  useEffect(() => {
    setFormDraft({ ...sourceDraft });
  }, [sourceDraft, sourceDraftKey]);

  /** 编辑态内部维护输入草稿，并将完整草稿回传给父级保存或校验。 */
  function handleFieldChange(key: string, value: string) {
    setFormDraft((currentDraft) => {
      const nextDraft = { ...currentDraft, [key]: value };

      onChange?.(key, value, nextDraft);
      return nextDraft;
    });
  }

  /** 预览卡片动作统一在组件内绑定当前条目，再通知父级执行真实业务。 */
  function handleItemAction(action?: (nextItem: AddressBookItem) => void) {
    if (item && action) {
      action(item);
    }
  }

  if (mode === "preview") {
    if (previewVariant === "card") {
      const getValue = (key: string) => sourceDraft[key]?.trim() || emptyText;

      return (
        <article className={`address-info-card flow-card compact p-[12px] ${resolvedIsCurrent ? "current" : ""}`}>
          <div className="address-card-head flex items-start justify-between gap-[10px]">
            <div className="min-w-0">
              <strong>{getValue("contactName")}</strong>
              <span>{getValue("contactPhone")}</span>
            </div>
            <em className={resolvedIsCurrent ? "active" : ""}>{resolvedIsCurrent ? "当前使用" : "未使用"}</em>
          </div>
          <p>{getValue("deliveryAddress")}</p>
          <div className="address-card-meta flex flex-wrap gap-[6px]">
            <span>{getValue("campusArea")}</span>
            <span>{getValue("buildingFloor")}</span>
          </div>
          <div className="address-card-actions flex items-center justify-end gap-[8px]">
            {!resolvedIsCurrent && item && onUse ? (
              <button
                className="ghost-button inline-flex min-h-[30px] items-center justify-center px-[9px] py-[6px]"
                onClick={() => handleItemAction(onUse)}
                type="button"
              >
                设为当前
              </button>
            ) : null}
            {item && onEdit ? (
              <button
                className="ghost-button inline-flex min-h-[30px] items-center justify-center px-[9px] py-[6px]"
                onClick={() => handleItemAction(onEdit)}
                type="button"
              >
                {actionLabel}
              </button>
            ) : null}
            {item && onDelete ? (
              <button
                className="ghost-button danger inline-flex min-h-[30px] items-center justify-center px-[9px] py-[6px]"
                onClick={() => handleItemAction(onDelete)}
                type="button"
              >
                删除
              </button>
            ) : null}
          </div>
        </article>
      );
    }

    return (
      <div className="address-info-preview settings-profile-list mt-[10px] grid gap-[8px]">
        {fields.map((field) => {
          const value = sourceDraft[field.key]?.trim();

          return (
            <div className={`settings-row p-[10px] ${value ? "" : "missing"}`} key={field.key}>
              <span>{field.label}</span>
              <strong>{value || emptyText}</strong>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="address-info-fields grid gap-[10px]">
      {fields.map((field) => {
        const value = formDraft[field.key] ?? "";
        const validationResult = validateByKey(field.key, value, { label: field.label });
        const isInvalid = Boolean(value.trim()) && !validationResult.isValid;
        const areaListId = `address-area-${field.key}`;

        return (
          <label
            className={`profile-field address-info-field grid gap-[7px] ${!value.trim() || isInvalid ? "missing" : ""}`}
            key={field.key}
          >
            <span>{field.label}</span>
            <input
              inputMode={field.inputMode ?? "text"}
              list={field.kind === "area" ? areaListId : undefined}
              maxLength={field.inputMode === "tel" ? 11 : undefined}
              onChange={(event) => handleFieldChange(field.key, normalizeByKey(field.key, event.target.value))}
              placeholder={field.placeholder}
              value={value}
            />
            {isInvalid ? <em>{validationResult.message}</em> : null}
            {field.kind === "area" ? (
              <datalist id={areaListId}>
                {areaOptions.map((area) => (
                  <option key={area} value={area} />
                ))}
              </datalist>
            ) : null}
          </label>
        );
      })}
    </div>
  );
}
