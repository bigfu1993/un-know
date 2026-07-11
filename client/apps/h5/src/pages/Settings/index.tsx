import { useGlobalStore, useGlobalUser } from "@h5/store/global";
import { AddressInfoForm } from "../../components/AddressInfoForm";
import {
  campusAreaOptions,
  createAddressBookItem,
  getFilledProfileDraft,
  getStoredAddressBook,
  registrationProfileTemplates,
  setStoredAddressBook
} from "../../shared/clientPageModel";
import { localAuthCode, localPasswordMinLength, saveLocalPasswordCredential } from "../../tools/localAuth";
import { normalizeByKey, validateByKey } from "../../tools/validation";

/** Local state for the settings address editor sheet. */
type AddressEditorMode = "create" | "edit";
type SecurityDialogMode = "phone" | "password";

/** Local draft for changing the login phone in H5 settings. */
interface PhoneChangeDraft {
  code: string;
  phone: string;
}

/** Local draft for resetting the H5 password from settings. */
interface PasswordResetDraft extends PhoneChangeDraft {
  password: string;
  passwordConfirm: string;
}

/** Settings route for nickname, phone security, address, protocol, version, and feedback entries. */
export function SettingsView({ onBack }: { onBack: () => void }) {
  const { phone, profileDraft, profileName, role } = useGlobalUser();
  const setUserDisplayName = useGlobalStore((state) => state.setUserDisplayName);
  const setUserProfileDraft = useGlobalStore((state) => state.setUserProfileDraft);
  const setUserPhone = useGlobalStore((state) => state.setUserPhone);
  const addressTemplate = registrationProfileTemplates[role];
  const [addressItems, setAddressItems] = useState<AddressBookItem[]>(() => getStoredAddressBook(profileDraft));
  const [addressEditorMode, setAddressEditorMode] = useState<AddressEditorMode | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressDraft, setAddressDraft] = useState<ProfileDraftState>({});
  const [isNicknameEditorOpen, setIsNicknameEditorOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(profileName);
  const [nicknameFeedback, setNicknameFeedback] = useState("");
  const [securityDialogMode, setSecurityDialogMode] = useState<SecurityDialogMode | null>(null);
  const [securityFeedback, setSecurityFeedback] = useState("");
  const [phoneChangeDraft, setPhoneChangeDraft] = useState<PhoneChangeDraft>({ phone: "", code: "" });
  const [passwordResetDraft, setPasswordResetDraft] = useState<PasswordResetDraft>({
    phone: "",
    code: "",
    password: "",
    passwordConfirm: ""
  });
  const currentAddress = addressItems.find((item) => item.isCurrent);
  const currentAddressDraft = currentAddress?.draft ?? profileDraft;
  const completedFieldCount = addressTemplate.fields.filter((field) => currentAddressDraft[field.key]?.trim()).length;
  const addressCountText = addressItems.length > 0 ? `${addressItems.length} 个地址` : "未添加";
  const editableCurrentPhone = validateByKey("phone", phone).isValid ? phone : "";

  useEffect(() => {
    setAddressItems(getStoredAddressBook(profileDraft));
  }, [profileDraft]);

  useEffect(() => {
    if (!isNicknameEditorOpen) {
      setNicknameDraft(profileName);
    }
  }, [isNicknameEditorOpen, profileName]);

  /** Opens the nickname editor with the latest global nickname. */
  function handleOpenNicknameChange() {
    setNicknameFeedback("");
    setNicknameDraft(profileName);
    setIsNicknameEditorOpen(true);
  }

  /** Saves the local display nickname used by the H5 shell and profile pages. */
  function handleSaveNickname() {
    const nicknameValidation = validateByKey("nickname", nicknameDraft, { label: "昵称", required: true });

    if (!nicknameValidation.isValid) {
      return;
    }

    setUserDisplayName(nicknameDraft);
    setIsNicknameEditorOpen(false);
    setNicknameFeedback("昵称已更新。");
  }

  /** Persists the address list and syncs the current address back to the global profile draft. */
  function persistAddressItems(nextItems: AddressBookItem[]) {
    const normalizedItems = setStoredAddressBook(nextItems);
    const nextCurrentAddress = normalizedItems.find((item) => item.isCurrent);

    setAddressItems(normalizedItems);
    if (nextCurrentAddress) {
      setUserProfileDraft(nextCurrentAddress.draft);
    }
  }

  /** Opens the add-address sheet with an empty draft. */
  function handleOpenCreateAddress() {
    setAddressEditorMode("create");
    setEditingAddressId(null);
    setAddressDraft({});
  }

  /** Opens the edit-address sheet using the selected card draft. */
  function handleOpenEditAddress(item: AddressBookItem) {
    setAddressEditorMode("edit");
    setEditingAddressId(item.id);
    setAddressDraft(item.draft);
  }

  /** Marks an existing address card as the current address. */
  function handleUseAddress(item: AddressBookItem) {
    persistAddressItems(addressItems.map((addressItem) => ({ ...addressItem, isCurrent: addressItem.id === item.id })));
  }

  /** Saves the editor draft as a new or existing address card. */
  function handleSaveAddress() {
    const isInvalid = addressTemplate.fields.some(
      (field) => !validateByKey(field.key, addressDraft[field.key] ?? "", { label: field.label, required: true }).isValid
    );

    if (isInvalid) {
      return;
    }

    const filledDraft = getFilledProfileDraft(addressDraft);
    const now = new Date().toISOString();
    const nextItems =
      addressEditorMode === "edit" && editingAddressId
        ? addressItems.map((item) =>
            item.id === editingAddressId
              ? {
                  ...item,
                  draft: filledDraft,
                  updatedAt: now
                }
              : item
          )
        : [createAddressBookItem(filledDraft, true), ...addressItems.map((item) => ({ ...item, isCurrent: false }))];

    persistAddressItems(nextItems);
    setAddressEditorMode(null);
    setEditingAddressId(null);
    setAddressDraft({});
  }

  /** Opens the phone-change dialog with an empty code and phone draft. */
  function handleOpenPhoneChange() {
    setSecurityFeedback("");
    setPhoneChangeDraft({ phone: editableCurrentPhone, code: "" });
    setSecurityDialogMode("phone");
  }

  /** Opens the password-reset dialog and carries the current valid phone when possible. */
  function handleOpenPasswordReset() {
    setSecurityFeedback("");
    setPasswordResetDraft({
      phone: editableCurrentPhone,
      code: "",
      password: "",
      passwordConfirm: ""
    });
    setSecurityDialogMode("password");
  }

  /** Changes the local H5 phone after the fixed verification code passes. */
  function handleSavePhoneChange() {
    const phoneValidation = validateByKey("phone", phoneChangeDraft.phone, { label: "手机号", required: true });

    if (!phoneValidation.isValid || phoneChangeDraft.code !== localAuthCode) {
      return;
    }

    setUserPhone(phoneChangeDraft.phone);
    setSecurityDialogMode(null);
    setSecurityFeedback("手机号已更新。密码登录前请确认该手机号已设置本地密码。");
  }

  /** Resets the local H5 password after phone and verification-code checks pass. */
  async function handleSavePasswordReset() {
    const phoneValidation = validateByKey("phone", passwordResetDraft.phone, { label: "手机号", required: true });

    if (
      !phoneValidation.isValid ||
      passwordResetDraft.code !== localAuthCode ||
      passwordResetDraft.password.trim().length < localPasswordMinLength ||
      passwordResetDraft.password !== passwordResetDraft.passwordConfirm
    ) {
      return;
    }

    try {
      await saveLocalPasswordCredential(passwordResetDraft.phone, passwordResetDraft.password);
      setSecurityDialogMode(null);
      setSecurityFeedback("密码已重置，可在登录页使用密码登录。");
    } catch {
      setSecurityFeedback("密码保存失败，请检查浏览器本地存储权限。");
    }
  }

  return (
    <section className="page-view grid gap-[12px]">
      <header className="page-header grid items-center gap-[10px] p-[12px]">
        <button
          className="back-button grid h-[38px] w-[38px] place-items-center text-[#17212b]"
          onClick={onBack}
          type="button"
          aria-label="返回"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <span>账户与安全</span>
          <strong>设置</strong>
        </div>
      </header>

      <SectionHeader countText={roleLabels[role]} eyebrow="个人资料" title="昵称" />
      <article className="flow-card settings-nickname-card p-[14px] compact">
        <div className="card-title flex items-center justify-between gap-[10px] min-w-0">
          <UserRound size={18} />
          <div>
            <strong>{profileName}</strong>
            <span>用于头像弹窗、我的页面和登录后展示。</span>
          </div>
        </div>
        {nicknameFeedback ? <p className="notice mt-[10px] p-[10px] text-[#61420d]">{nicknameFeedback}</p> : null}
        <div className="settings-security-actions mt-[10px] grid gap-[8px]">
          <button
            className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            onClick={handleOpenNicknameChange}
            type="button"
          >
            <UserRound size={15} />
            修改昵称
          </button>
        </div>
      </article>

      <SectionHeader countText="安全" eyebrow="手机号、密码" title="手机号与安全" />
      <article className="flow-card settings-security-card p-[14px] compact">
        <div className="card-title flex items-center justify-between gap-[10px] min-w-0">
          <Smartphone size={18} />
          <div>
            <strong>{phone || "未绑定手机号"}</strong>
            <span>用于登录、验证码校验和本地密码凭据。</span>
          </div>
        </div>
        {securityFeedback ? <p className="notice mt-[10px] p-[10px] text-[#61420d]">{securityFeedback}</p> : null}
        <div className="settings-security-actions mt-[10px] grid gap-[8px]">
          <button
            className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            onClick={handleOpenPhoneChange}
            type="button"
          >
            <Smartphone size={15} />
            变更手机号
          </button>
          <button
            className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            onClick={handleOpenPasswordReset}
            type="button"
          >
            <ShieldCheck size={15} />
            重置密码
          </button>
        </div>
      </article>

      <SectionHeader
        countText={addressCountText}
        eyebrow={`${completedFieldCount}/${addressTemplate.fields.length} 已填`}
        title="地址信息"
      />
      <div className="card-list grid gap-[10px]">
        {addressItems.length > 0 ? (
          addressItems.map((item) => (
            <AddressInfoForm
              actionLabel="编辑"
              areaOptions={campusAreaOptions}
              draft={item.draft}
              fields={addressTemplate.fields}
              isCurrent={item.isCurrent}
              key={item.id}
              mode="preview"
              onEdit={() => handleOpenEditAddress(item)}
              onUse={() => handleUseAddress(item)}
              previewVariant="card"
            />
          ))
        ) : (
          <article className="empty-state p-[14px]">
            <strong>暂无地址</strong>
            <p>添加地址后，购买和资料补充会优先使用当前地址。</p>
          </article>
        )}
        <button className="address-add-button flow-card compact p-[12px] text-left" onClick={handleOpenCreateAddress} type="button">
          <div className="card-title flex items-center justify-between gap-[10px] min-w-0">
            <Plus size={18} />
            <div>
              <strong>新增地址</strong>
              <span>添加新的联系人、区域和收货地址。</span>
            </div>
            <ChevronRight size={16} />
          </div>
        </button>
      </div>

      <SectionHeader countText="设置" eyebrow="协议、版本" title="设置项目" />
      <div className="card-list grid gap-[10px]">
        {[
          ["平台协议", "用户协议、隐私政策、交易规则"],
          ["版本&更新", clientPublishPlatformLabels.h5]
        ].map(([title, detail]) => (
          <article className="flow-card p-[14px] compact" key={title}>
            <div className="card-title flex items-center justify-between gap-[10px] min-w-0">
              <Settings size={18} />
              <div>
                <strong>{title}</strong>
                <span>{detail}</span>
              </div>
              <ChevronRight size={16} />
            </div>
          </article>
        ))}
      </div>

      {addressEditorMode ? (
        <AddressEditorDialog
          areaOptions={campusAreaOptions}
          draft={addressDraft}
          fields={addressTemplate.fields}
          mode={addressEditorMode}
          onChange={(key, value) => setAddressDraft((draft) => ({ ...draft, [key]: value }))}
          onClose={() => {
            setAddressEditorMode(null);
            setEditingAddressId(null);
            setAddressDraft({});
          }}
          onSave={handleSaveAddress}
        />
      ) : null}
      {isNicknameEditorOpen ? (
        <NicknameEditorDialog
          nickname={nicknameDraft}
          onChange={setNicknameDraft}
          onClose={() => setIsNicknameEditorOpen(false)}
          onSave={handleSaveNickname}
        />
      ) : null}
      {securityDialogMode === "phone" ? (
        <PhoneChangeDialog
          draft={phoneChangeDraft}
          onChange={(nextDraft) => setPhoneChangeDraft((draft) => ({ ...draft, ...nextDraft }))}
          onClose={() => setSecurityDialogMode(null)}
          onSave={handleSavePhoneChange}
        />
      ) : null}
      {securityDialogMode === "password" ? (
        <PasswordResetDialog
          draft={passwordResetDraft}
          onChange={(nextDraft) => setPasswordResetDraft((draft) => ({ ...draft, ...nextDraft }))}
          onClose={() => setSecurityDialogMode(null)}
          onSave={handleSavePasswordReset}
        />
      ) : null}
    </section>
  );
}

/** Dialog for changing the locally stored H5 display nickname. */
function NicknameEditorDialog({
  nickname,
  onChange,
  onClose,
  onSave
}: {
  nickname: string;
  onChange: (nickname: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const nicknameValidation = validateByKey("nickname", nickname, { label: "昵称", required: true });
  const isNicknameInvalid = !nicknameValidation.isValid;

  /** Prevents native form navigation and delegates saving to SettingsView. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isNicknameInvalid) {
      onSave();
    }
  }

  return (
    <section className="checkout-sheet" aria-label="修改昵称">
      <div className="sheet-backdrop" onClick={onClose} />
      <form
        className="sheet-panel security-editor-sheet mx-auto grid max-h-[86vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]"
        onSubmit={handleSubmit}
      >
        <div className="card-title flex items-center justify-between gap-[10px]">
          <UserRound size={18} />
          <div>
            <strong>修改昵称</strong>
            <span>昵称会同步到头像弹窗和我的页面。</span>
          </div>
          <button className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]" onClick={onClose} type="button" aria-label="关闭">
            <XCircle size={20} />
          </button>
        </div>

        <label className={`login-field grid min-w-0 gap-[7px] ${isNicknameInvalid ? "missing" : ""}`}>
          <span>昵称</span>
          <div>
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
            disabled={isNicknameInvalid}
            type="submit"
          >
            <CheckCircle2 size={16} />
            保存昵称
          </button>
        </div>
      </form>
    </section>
  );
}

/** Address editor sheet used by settings add and edit flows. */
function AddressEditorDialog({
  areaOptions,
  draft,
  fields,
  mode,
  onChange,
  onClose,
  onSave
}: {
  areaOptions: string[];
  draft: ProfileDraftState;
  fields: ProfileRequirementField[];
  mode: AddressEditorMode;
  onChange: (key: string, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const hasInvalidFields = fields.some(
    (field) => !validateByKey(field.key, draft[field.key] ?? "", { label: field.label, required: true }).isValid
  );

  /** Prevents native form navigation and delegates saving to SettingsView. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasInvalidFields) {
      onSave();
    }
  }

  return (
    <section className="checkout-sheet" aria-label={mode === "create" ? "新增地址" : "编辑地址"}>
      <div className="sheet-backdrop" onClick={onClose} />
      <form
        className="sheet-panel address-editor-sheet mx-auto grid max-h-[86vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]"
        onSubmit={handleSubmit}
      >
        <div className="card-title flex items-center justify-between gap-[10px]">
          <BadgeCheck size={18} />
          <div>
            <strong>{mode === "create" ? "新增地址" : "编辑地址"}</strong>
            <span>保存后可作为当前使用地址。</span>
          </div>
          <button className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]" onClick={onClose} type="button" aria-label="关闭">
            <XCircle size={20} />
          </button>
        </div>

        <AddressInfoForm areaOptions={areaOptions} draft={draft} fields={fields} mode="edit" onChange={onChange} />

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
            disabled={hasInvalidFields}
            type="submit"
          >
            <CheckCircle2 size={16} />
            保存地址
          </button>
        </div>
      </form>
    </section>
  );
}

/** Dialog for changing the locally stored H5 login phone. */
function PhoneChangeDialog({
  draft,
  onChange,
  onClose,
  onSave
}: {
  draft: PhoneChangeDraft;
  onChange: (draft: Partial<PhoneChangeDraft>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const phoneValidation = validateByKey("phone", draft.phone, { label: "手机号", required: true });
  const isCodeInvalid = draft.code !== localAuthCode;
  const isSaveDisabled = !phoneValidation.isValid || isCodeInvalid;

  /** Prevents native form navigation and delegates saving to SettingsView. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isSaveDisabled) {
      onSave();
    }
  }

  return (
    <section className="checkout-sheet" aria-label="变更手机号">
      <div className="sheet-backdrop" onClick={onClose} />
      <form
        className="sheet-panel security-editor-sheet mx-auto grid max-h-[86vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]"
        onSubmit={handleSubmit}
      >
        <div className="card-title flex items-center justify-between gap-[10px]">
          <Smartphone size={18} />
          <div>
            <strong>变更手机号</strong>
            <span>验证码校验通过后更新本地登录手机号。</span>
          </div>
          <button className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]" onClick={onClose} type="button" aria-label="关闭">
            <XCircle size={20} />
          </button>
        </div>

        <label className={`login-field grid min-w-0 gap-[7px] ${draft.phone && !phoneValidation.isValid ? "missing" : ""}`}>
          <span>新手机号</span>
          <div>
            <Smartphone size={18} />
            <input
              inputMode="numeric"
              maxLength={11}
              onChange={(event) => onChange({ phone: normalizeByKey("phone", event.target.value) })}
              placeholder="请输入新手机号"
              value={draft.phone}
            />
          </div>
          {draft.phone && !phoneValidation.isValid ? <em>{phoneValidation.message}</em> : null}
        </label>

        <label className={`login-field grid min-w-0 gap-[7px] ${draft.code && isCodeInvalid ? "missing" : ""}`}>
          <span>验证码</span>
          <div>
            <KeyRound size={18} />
            <input
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => onChange({ code: event.target.value.replace(/\D/g, "") })}
              placeholder={`本地验证码 ${localAuthCode}`}
              value={draft.code}
            />
            <button onClick={() => onChange({ code: localAuthCode })} type="button">
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
      </form>
    </section>
  );
}

/** Dialog for resetting the local H5 password after phone verification. */
function PasswordResetDialog({
  draft,
  onChange,
  onClose,
  onSave
}: {
  draft: PasswordResetDraft;
  onChange: (draft: Partial<PasswordResetDraft>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const phoneValidation = validateByKey("phone", draft.phone, { label: "手机号", required: true });
  const isCodeInvalid = draft.code !== localAuthCode;
  const isPasswordInvalid = draft.password.trim().length < localPasswordMinLength;
  const isPasswordConfirmInvalid = draft.passwordConfirm.length > 0 && draft.password !== draft.passwordConfirm;
  const isSaveDisabled = !phoneValidation.isValid || isCodeInvalid || isPasswordInvalid || draft.password !== draft.passwordConfirm;

  /** Prevents native form navigation and delegates saving to SettingsView. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isSaveDisabled) {
      onSave();
    }
  }

  return (
    <section className="checkout-sheet" aria-label="重置密码">
      <div className="sheet-backdrop" onClick={onClose} />
      <form
        className="sheet-panel security-editor-sheet mx-auto grid max-h-[86vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]"
        onSubmit={handleSubmit}
      >
        <div className="card-title flex items-center justify-between gap-[10px]">
          <ShieldCheck size={18} />
          <div>
            <strong>重置密码</strong>
            <span>通过手机号验证码校验后设置新密码。</span>
          </div>
          <button className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]" onClick={onClose} type="button" aria-label="关闭">
            <XCircle size={20} />
          </button>
        </div>

        <label className={`login-field grid min-w-0 gap-[7px] ${draft.phone && !phoneValidation.isValid ? "missing" : ""}`}>
          <span>手机号</span>
          <div>
            <Smartphone size={18} />
            <input
              inputMode="numeric"
              maxLength={11}
              onChange={(event) => onChange({ phone: normalizeByKey("phone", event.target.value) })}
              placeholder="请输入手机号"
              value={draft.phone}
            />
          </div>
          {draft.phone && !phoneValidation.isValid ? <em>{phoneValidation.message}</em> : null}
        </label>

        <label className={`login-field grid min-w-0 gap-[7px] ${draft.code && isCodeInvalid ? "missing" : ""}`}>
          <span>验证码</span>
          <div>
            <KeyRound size={18} />
            <input
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => onChange({ code: event.target.value.replace(/\D/g, "") })}
              placeholder={`本地验证码 ${localAuthCode}`}
              value={draft.code}
            />
            <button onClick={() => onChange({ code: localAuthCode })} type="button">
              填入
            </button>
          </div>
        </label>

        <label className={`login-field grid min-w-0 gap-[7px] ${draft.password && isPasswordInvalid ? "missing" : ""}`}>
          <span>新密码</span>
          <div>
            <ShieldCheck size={18} />
            <input
              autoComplete="new-password"
              onChange={(event) => onChange({ password: event.target.value })}
              placeholder={`至少 ${localPasswordMinLength} 位`}
              type="password"
              value={draft.password}
            />
          </div>
        </label>

        <label className={`login-field grid min-w-0 gap-[7px] ${isPasswordConfirmInvalid ? "missing" : ""}`}>
          <span>确认密码</span>
          <div>
            <ShieldCheck size={18} />
            <input
              autoComplete="new-password"
              onChange={(event) => onChange({ passwordConfirm: event.target.value })}
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
      </form>
    </section>
  );
}
