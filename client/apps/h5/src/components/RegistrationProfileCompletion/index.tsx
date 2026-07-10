export function RegistrationProfileCompletion({
  areaOptions,
  draft,
  onChange,
  onSkip,
  onSubmit,
  roleLabel,
  template
}: RegistrationProfileCompletionProps) {
  const hasMissingFields = template.fields.some((field) => !draft[field.key]?.trim());

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasMissingFields) {
      onSubmit();
    }
  }

  return (
    <form className="login-card registration-profile-card" onSubmit={handleSubmit}>
      <div className="card-title">
        <BadgeCheck size={18} />
        <div>
          <strong>{template.title}</strong>
          <span>{roleLabel} · 注册成功后的信息补充中转页</span>
        </div>
      </div>

      <p className="login-tip">{template.description}</p>

      <div className="registration-profile-fields">
        {template.fields.map((field) => {
          const value = draft[field.key] ?? "";
          const isMissing = !value.trim();
          const areaListId = `registration-area-${field.key}`;

          return (
            <label className={`registration-profile-field ${isMissing ? "missing" : ""}`} key={field.key}>
              <span>{field.label}</span>
              <input
                inputMode={field.inputMode ?? "text"}
                list={field.kind === "area" ? areaListId : undefined}
                onChange={(event) => onChange(field.key, event.target.value)}
                placeholder={field.placeholder}
                value={value}
              />
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

      <div className="registration-profile-actions">
        <button className="ghost-button" onClick={onSkip} type="button">
          跳过，直接进入
        </button>
        <button className="primary-button" disabled={hasMissingFields} type="submit">
          <CheckCircle2 size={16} />
          提交并进入
        </button>
      </div>
      <p className="login-tip">也可以先跳过，后续购买、发布或报名时会按场景再次提示补充。</p>
    </form>
  );
}
