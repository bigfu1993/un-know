import { AddressInfoForm } from "@components/AddressInfoForm";
import { Modal } from "@ui/Modal";
import { tutorCertificationStatusLabels } from "@components/TutorCard/model";
import { tutorSubjectOptions } from "@shared/tutorModel";
import { localAuthCode, localPasswordMinLength } from "@tools/localAuth";
import { hasInvalidRequiredFields, normalizeByKey, validateByKey } from "@tools/validation";

/** 设置页地址编辑弹窗模式。 */
export type AddressEditorMode = "create" | "edit";

/** 设置页变更登录手机号的本地草稿。 */
export interface PhoneChangeDraft {
  code: string;
  phone: string;
}

/** 设置页重置 H5 密码的本地草稿。 */
export interface PasswordResetDraft extends PhoneChangeDraft {
  password: string;
  passwordConfirm: string;
}

/** 家教资格申请信息只读字段，学科在弹窗中单独可编辑。 */
const tutorQualificationInfoFields = [
  { key: "tutorRealName", label: "姓名" },
  { key: "tutorGender", label: "性别" },
  { key: "tutorAge", label: "年龄" },
  { key: "tutorNativePlace", label: "籍贯" },
  { key: "tutorIdCard", label: "身份证" },
  { key: "tutorSchool", label: "学校" },
  { key: "tutorMajor", label: "专业" },
  { key: "tutorXuexinScreenshot", label: "学信网截图" },
  { key: "tutorGpa", label: "绩点" },
  { key: "tutorCertificate", label: "证书" }
];

/** 修改用户昵称的弹窗，保存后由服务端写入 app_user.nickname。 */
export function NicknameEditor({
  isSubmitting = false,
  nickname,
  onChange,
  onClose,
  onSave
}: {
  isSubmitting?: boolean;
  nickname: string;
  onChange: (nickname: string) => void;
  onClose: () => void;
  onSave: () => void | Promise<void>;
}) {
  const nicknameValidation = validateByKey("nickname", nickname, { label: "昵称", required: true });
  const isNicknameInvalid = !nicknameValidation.isValid;

  /** 阻止原生表单跳转，并将保存动作交给 SettingsView。 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isNicknameInvalid && !isSubmitting) {
      void onSave();
    }
  }

  return (
    <Modal
      ariaLabel="修改昵称"
      onClose={onClose}
      onSubmit={handleSubmit}
      panelClassName="security-editor-sheet mx-auto grid max-h-[86vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]"
      panelElement="form"
    >
        <div className="card-title flex items-center justify-between gap-[10px]">
          <UserRound size={18} />
          <div className="nickname-editor-title">
            <strong>修改昵称</strong>
            <span>昵称会同步到头像弹窗和我的页面。</span>
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

        <label className={`login-field grid min-w-0 gap-[7px] ${isNicknameInvalid ? "missing" : ""}`}>
          <span>昵称</span>
          <div className="nickname-editor-input">
            <UserRound size={18} />
            <input
              maxLength={20}
              onChange={(event) => onChange(event.target.value)}
              placeholder="请输入昵称"
              value={nickname}
            />
          </div>
          {isNicknameInvalid ? <em>{nicknameValidation.message}</em> : null}
        </label>

        <div className="sheet-actions grid gap-[8px]">
          <button
            className="ghost-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={isNicknameInvalid || isSubmitting}
            type="submit"
          >
            <CheckCircle2 size={16} />
            {isSubmitting ? "保存中" : "保存昵称"}
          </button>
        </div>
    </Modal>
  );
}

/** 家教资格申请信息弹窗，除学科外均为只读展示。 */
export function TutorQualificationInfo({
  certificationStatus,
  onClose,
  onSave,
  onToggleSubject,
  profileDraft,
  selectedSubjects
}: {
  certificationStatus: TutorCertificationStatus;
  onClose: () => void;
  onSave: () => void;
  onToggleSubject: (subject: string) => void;
  profileDraft: ProfileDraftState;
  selectedSubjects: string[];
}) {
  const isSaveDisabled = selectedSubjects.length === 0;

  /** 获取资格申请字段的安全展示值。 */
  function getDisplayValue(value?: string) {
    return value?.trim() || "未填写";
  }

  return (
    <Modal
      ariaLabel="家教资格申请信息"
      onClose={onClose}
      panelClassName="tutor-qualification-sheet mx-auto grid max-h-[86vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]"
      panelElement="div"
    >
        <div className="card-title flex items-center justify-between gap-[10px]">
          <GraduationCap size={18} />
          <div className="tutor-qualification-title">
            <strong>家教资格申请信息</strong>
            <span>当前状态：{tutorCertificationStatusLabels[certificationStatus]}</span>
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

        <div className="tutor-subject-section grid gap-[8px]">
          <strong>可授课学科</strong>
          <div className="tutor-subject-tags flex flex-wrap gap-[8px]" aria-label="编辑可授课学科">
            {tutorSubjectOptions.map((subject) => (
              <button
                className={selectedSubjects.includes(subject) ? "active" : ""}
                key={subject}
                onClick={() => onToggleSubject(subject)}
                type="button"
              >
                {subject}
              </button>
            ))}
          </div>
        </div>

        <div className="tutor-qualification-grid grid gap-[8px]">
          {tutorQualificationInfoFields.map((field) => (
            <span key={field.key}>
              <em>{field.label}</em>
              <strong>{getDisplayValue(profileDraft[field.key])}</strong>
            </span>
          ))}
        </div>

        <div className="sheet-actions grid gap-[8px]">
          <button
            className="ghost-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={isSaveDisabled}
            onClick={onSave}
            type="button"
          >
            <CheckCircle2 size={16} />
            保存学科
          </button>
        </div>
    </Modal>
  );
}

/** 设置页新增和编辑地址流程使用的地址编辑弹窗。 */
export function AddressEditor({
  areaOptions,
  draft,
  fields,
  isSubmitting = false,
  mode,
  onChange,
  onClose,
  onSave
}: {
  areaOptions: string[];
  draft: ProfileDraftState;
  fields: ProfileRequirementField[];
  isSubmitting?: boolean;
  mode: AddressEditorMode;
  onChange: (draft: ProfileDraftState) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const hasInvalidFields = hasInvalidRequiredFields(fields, draft);

  /** 阻止原生表单跳转，并将保存动作交给 SettingsView。 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasInvalidFields && !isSubmitting) {
      onSave();
    }
  }

  /** 地址表单内部按字段维护输入，这里只接收完整草稿交给设置页状态。 */
  function handleAddressChange(_changedKey: string, _value: string, nextDraft: ProfileDraftState) {
    onChange(nextDraft);
  }

  return (
    <Modal
      ariaLabel={mode === "create" ? "新增地址" : "编辑地址"}
      onClose={onClose}
      onSubmit={handleSubmit}
      panelClassName="address-editor-sheet mx-auto grid max-h-[86vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]"
      panelElement="form"
    >
        <div className="card-title flex items-center justify-between gap-[10px]">
          <BadgeCheck size={18} />
          <div className="address-editor-title">
            <strong>{mode === "create" ? "新增地址" : "编辑地址"}</strong>
            <span>保存后可作为当前使用地址。</span>
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

        <AddressInfoForm areaOptions={areaOptions} draft={draft} fields={fields} onChange={handleAddressChange} />

        <div className="sheet-actions grid gap-[8px]">
          <button
            className="ghost-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={hasInvalidFields || isSubmitting}
            type="submit"
          >
            <CheckCircle2 size={16} />
            {isSubmitting ? "保存中" : "保存地址"}
          </button>
        </div>
    </Modal>
  );
}

/** 修改 H5 本地登录手机号的弹窗。 */
export function PhoneChange({
  draft,
  onChange,
  onClose,
  onSave
}: {
  draft: PhoneChangeDraft;
  onChange: (draft: PhoneChangeDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const phoneValidation = validateByKey("phone", draft.phone, { label: "手机号", required: true });
  const isCodeInvalid = draft.code !== localAuthCode;
  const isSaveDisabled = !phoneValidation.isValid || isCodeInvalid;

  /** 阻止原生表单跳转，并将保存动作交给 SettingsView。 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isSaveDisabled) {
      onSave();
    }
  }

  /** 合并手机号表单局部字段，调用方只接收完整草稿。 */
  function handleChange(nextDraft: Partial<PhoneChangeDraft>) {
    onChange({ ...draft, ...nextDraft });
  }

  return (
    <Modal
      ariaLabel="变更手机号"
      onClose={onClose}
      onSubmit={handleSubmit}
      panelClassName="security-editor-sheet mx-auto grid max-h-[86vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]"
      panelElement="form"
    >
        <div className="card-title flex items-center justify-between gap-[10px]">
          <Smartphone size={18} />
          <div className="phone-change-title">
            <strong>变更手机号</strong>
            <span>验证码校验通过后更新本地登录手机号。</span>
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

        <label className={`login-field grid min-w-0 gap-[7px] ${draft.phone && !phoneValidation.isValid ? "missing" : ""}`}>
          <span>新手机号</span>
          <div className="phone-change-phone-input">
            <Smartphone size={18} />
            <input
              inputMode="numeric"
              maxLength={11}
              onChange={(event) => handleChange({ phone: normalizeByKey("phone", event.target.value) })}
              placeholder="请输入新手机号"
              value={draft.phone}
            />
          </div>
          {draft.phone && !phoneValidation.isValid ? <em>{phoneValidation.message}</em> : null}
        </label>

        <label className={`login-field grid min-w-0 gap-[7px] ${draft.code && isCodeInvalid ? "missing" : ""}`}>
          <span>验证码</span>
          <div className="phone-change-code-input">
            <KeyRound size={18} />
            <input
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => handleChange({ code: event.target.value.replace(/\D/g, "") })}
              placeholder={`本地验证码 ${localAuthCode}`}
              value={draft.code}
            />
            <button onClick={() => handleChange({ code: localAuthCode })} type="button">
              填入
            </button>
          </div>
        </label>

        <div className="sheet-actions grid gap-[8px]">
          <button
            className="ghost-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={isSaveDisabled}
            type="submit"
          >
            <CheckCircle2 size={16} />
            保存手机号
          </button>
        </div>
    </Modal>
  );
}

/** 手机号校验后重置 H5 本地密码的弹窗。 */
export function PasswordReset({
  draft,
  onChange,
  onClose,
  onSave
}: {
  draft: PasswordResetDraft;
  onChange: (draft: PasswordResetDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const phoneValidation = validateByKey("phone", draft.phone, { label: "手机号", required: true });
  const isCodeInvalid = draft.code !== localAuthCode;
  const isPasswordInvalid = draft.password.trim().length < localPasswordMinLength;
  const isPasswordConfirmInvalid = draft.passwordConfirm.length > 0 && draft.password !== draft.passwordConfirm;
  const isSaveDisabled =
    !phoneValidation.isValid || isCodeInvalid || isPasswordInvalid || draft.password !== draft.passwordConfirm;

  /** 阻止原生表单跳转，并将保存动作交给 SettingsView。 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isSaveDisabled) {
      onSave();
    }
  }

  /** 合并密码重置表单局部字段，调用方只接收完整草稿。 */
  function handleChange(nextDraft: Partial<PasswordResetDraft>) {
    onChange({ ...draft, ...nextDraft });
  }

  return (
    <Modal
      ariaLabel="重置密码"
      onClose={onClose}
      onSubmit={handleSubmit}
      panelClassName="security-editor-sheet mx-auto grid max-h-[86vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]"
      panelElement="form"
    >
        <div className="card-title flex items-center justify-between gap-[10px]">
          <ShieldCheck size={18} />
          <div className="settings-password-reset-title">
            <strong>重置密码</strong>
            <span>通过手机号验证码校验后设置新密码。</span>
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

        <label className={`login-field grid min-w-0 gap-[7px] ${draft.phone && !phoneValidation.isValid ? "missing" : ""}`}>
          <span>手机号</span>
          <div className="settings-password-reset-phone-input">
            <Smartphone size={18} />
            <input
              inputMode="numeric"
              maxLength={11}
              onChange={(event) => handleChange({ phone: normalizeByKey("phone", event.target.value) })}
              placeholder="请输入手机号"
              value={draft.phone}
            />
          </div>
          {draft.phone && !phoneValidation.isValid ? <em>{phoneValidation.message}</em> : null}
        </label>

        <label className={`login-field grid min-w-0 gap-[7px] ${draft.code && isCodeInvalid ? "missing" : ""}`}>
          <span>验证码</span>
          <div className="settings-password-reset-code-input">
            <KeyRound size={18} />
            <input
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => handleChange({ code: event.target.value.replace(/\D/g, "") })}
              placeholder={`本地验证码 ${localAuthCode}`}
              value={draft.code}
            />
            <button onClick={() => handleChange({ code: localAuthCode })} type="button">
              填入
            </button>
          </div>
        </label>

        <label className={`login-field grid min-w-0 gap-[7px] ${draft.password && isPasswordInvalid ? "missing" : ""}`}>
          <span>新密码</span>
          <div className="settings-password-reset-new-password-input">
            <ShieldCheck size={18} />
            <input
              autoComplete="new-password"
              onChange={(event) => handleChange({ password: event.target.value })}
              placeholder={`至少 ${localPasswordMinLength} 位`}
              type="password"
              value={draft.password}
            />
          </div>
        </label>

        <label className={`login-field grid min-w-0 gap-[7px] ${isPasswordConfirmInvalid ? "missing" : ""}`}>
          <span>确认密码</span>
          <div className="settings-password-reset-confirm-password-input">
            <ShieldCheck size={18} />
            <input
              autoComplete="new-password"
              onChange={(event) => handleChange({ passwordConfirm: event.target.value })}
              placeholder="再次输入新密码"
              type="password"
              value={draft.passwordConfirm}
            />
          </div>
          {isPasswordConfirmInvalid ? <em>两次输入的新密码不一致。</em> : null}
        </label>

        <div className="sheet-actions grid gap-[8px]">
          <button
            className="ghost-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={isSaveDisabled}
            type="submit"
          >
            <CheckCircle2 size={16} />
            保存新密码
          </button>
        </div>
    </Modal>
  );
}
