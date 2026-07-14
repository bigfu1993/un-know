import "./index.less";
import { normalizeByKey, validateByKey } from "@tools/validation";

/** 注册、资料补充和设置预览共用的地址信息表单。 */
export function AddressInfoForm({
  actionLabel = "编辑",
  areaOptions,
  draft,
  emptyText = "未填写",
  fields,
  isCurrent = false,
  mode,
  onChange,
  onDelete,
  onEdit,
  onUse,
  previewVariant = "list"
}: AddressInfoFormProps) {
  if (mode === "preview") {
    if (previewVariant === "card") {
      const getValue = (key: string) => draft[key]?.trim() || emptyText;

      return (
        <article className={`address-info-card flow-card compact p-[12px] ${isCurrent ? "current" : ""}`}>
          <div className="address-card-head flex items-start justify-between gap-[10px]">
            <div className="min-w-0">
              <strong>{getValue("contactName")}</strong>
              <span>{getValue("contactPhone")}</span>
            </div>
            <em className={isCurrent ? "active" : ""}>{isCurrent ? "当前使用" : "未使用"}</em>
          </div>
          <p>{getValue("deliveryAddress")}</p>
          <div className="address-card-meta flex flex-wrap gap-[6px]">
            <span>{getValue("campusArea")}</span>
            <span>{getValue("buildingFloor")}</span>
          </div>
          <div className="address-card-actions flex items-center justify-end gap-[8px]">
            {!isCurrent && onUse ? (
              <button className="ghost-button inline-flex min-h-[30px] items-center justify-center px-[9px] py-[6px]" onClick={onUse} type="button">
                设为当前
              </button>
            ) : null}
            {onEdit ? (
              <button className="ghost-button inline-flex min-h-[30px] items-center justify-center px-[9px] py-[6px]" onClick={onEdit} type="button">
                {actionLabel}
              </button>
            ) : null}
            {onDelete ? (
              <button className="ghost-button danger inline-flex min-h-[30px] items-center justify-center px-[9px] py-[6px]" onClick={onDelete} type="button">
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
          const value = draft[field.key]?.trim();

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
        const value = draft[field.key] ?? "";
        const isMissing = !value.trim();
        const validationResult = validateByKey(field.key, value, { label: field.label });
        const isInvalid = Boolean(value.trim()) && !validationResult.isValid;
        const areaListId = `address-area-${field.key}`;

        return (
          <label
            className={`profile-field address-info-field grid gap-[7px] ${isMissing || isInvalid ? "missing" : ""}`}
            key={field.key}
          >
            <span>{field.label}</span>
            <input
              inputMode={field.inputMode ?? "text"}
              list={field.kind === "area" ? areaListId : undefined}
              maxLength={field.inputMode === "tel" ? 11 : undefined}
              onChange={(event) => onChange?.(field.key, normalizeByKey(field.key, event.target.value))}
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
