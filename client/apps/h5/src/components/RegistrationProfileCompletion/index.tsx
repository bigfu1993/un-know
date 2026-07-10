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
    <form
      className="login-card registration-profile-card grid w-full min-w-0 gap-[12px] p-[16px]"
      onSubmit={handleSubmit}
    >
      <div className="card-title flex min-w-0 items-center justify-start gap-[10px]">
        <BadgeCheck size={18} />
        <div className="min-w-0 flex-1">
          <strong>{template.title}</strong>
          <span>{roleLabel} · 注册成功后的信息补充中转页</span>
        </div>
      </div>

      <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">{template.description}</p>

      <div className="registration-profile-fields grid gap-[10px]">
        {template.fields.map((field) => {
          const value = draft[field.key] ?? "";
          const isMissing = !value.trim();
          const areaListId = `registration-area-${field.key}`;

          return (
            <label
              className={`registration-profile-field grid gap-[7px] w-full min-w-0 font-bold ${isMissing ? "missing" : ""}`}
              key={field.key}
            >
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

      <div className="registration-profile-actions grid gap-[8px]">
        <button
          className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
          onClick={onSkip}
          type="button"
        >
          跳过，直接进入
        </button>
        <button
          className="primary-button inline-flex min-h-[34px] w-full items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
          disabled={hasMissingFields}
          type="submit"
        >
          <CheckCircle2 size={16} />
          提交并进入
        </button>
      </div>
      <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
        也可以先跳过，后续购买、发布或报名时会按场景再次提示补充。
      </p>
    </form>
  );
}
