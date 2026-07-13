import { useGlobalStore, useGlobalUser } from "@h5/store/global";
import { AddressInfoForm } from "../../components/AddressInfoForm";
import { tutorCertificationStatusLabels, type TutorCertificationStatus } from "../../components/TutorCard/model";
import {
  campusAreaOptions,
  clientAddressesToAddressBookItems,
  clientAddressToAddressBookItem,
  getFilledProfileDraft,
  getCurrentAddressDraft,
  profileDraftToClientAddressRequest,
  registrationProfileTemplates,
} from "../../shared/clientPageModel";
import { formatTutorSubjects, parseTutorSubjects, tutorSubjectOptions } from "../../shared/tutorModel";
import { localAuthCode, localPasswordMinLength, saveLocalPasswordCredential } from "../../tools/localAuth";
import { normalizeByKey, validateByKey } from "../../tools/validation";

/** 设置页地址编辑弹窗模式。 */
type AddressEditorMode = "create" | "edit";
type SecurityDialogMode = "phone" | "password";

/** 设置页变更登录手机号的本地草稿。 */
interface PhoneChangeDraft {
  code: string;
  phone: string;
}

/** 设置页重置 H5 密码的本地草稿。 */
interface PasswordResetDraft extends PhoneChangeDraft {
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

/** 设置页面，负责昵称、手机号安全、地址、协议、版本和反馈入口。 */
/** 地址接口返回前使用的稳定空列表，避免派生地址列表在每次渲染时变更引用。 */
const emptyClientAddresses: ClientAddress[] = [];

export function SettingsView({
  onBack,
  onMessage
}: {
  onBack: () => void;
  onMessage?: (message: string, options?: MessageToastOptions) => void;
}) {
  const { phone, profileDraft, profileName, role, session } = useGlobalUser();
  const setUserDisplayName = useGlobalStore((state) => state.setUserDisplayName);
  const setUserProfileDraft = useGlobalStore((state) => state.setUserProfileDraft);
  const setUserPhone = useGlobalStore((state) => state.setUserPhone);
  const addressTemplate = registrationProfileTemplates[role];
  const { data: clientAddresses = emptyClientAddresses, error: addressError, isLoading: isAddressLoading } = useClientAddresses(true, session?.accessToken);
  const createAddressMutation = useCreateClientAddress();
  const updateAddressMutation = useUpdateClientAddress();
  const useAddressMutation = useUseClientAddress();
  const deleteAddressMutation = useDeleteClientAddress();
  const addressItems = useMemo(() => clientAddressesToAddressBookItems(clientAddresses), [clientAddresses]);
  const [addressEditorMode, setAddressEditorMode] = useState<AddressEditorMode | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressDraft, setAddressDraft] = useState<ProfileDraftState>({});
  const [isNicknameEditorOpen, setIsNicknameEditorOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(profileName);
  const [nicknameFeedback, setNicknameFeedback] = useState("");
  const [securityDialogMode, setSecurityDialogMode] = useState<SecurityDialogMode | null>(null);
  const [securityFeedback, setSecurityFeedback] = useState("");
  const [isTutorInfoOpen, setIsTutorInfoOpen] = useState(false);
  const [tutorSubjectDraft, setTutorSubjectDraft] = useState<string[]>(() => parseTutorSubjects(profileDraft.tutorSubject));
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
  const addressCountText = isAddressLoading ? "加载中" : addressItems.length > 0 ? `${addressItems.length} 个地址` : "未添加";
  const editableCurrentPhone = validateByKey("phone", phone).isValid ? phone : "";
  const rawTutorStatus = profileDraft.tutorCertificationStatus as TutorCertificationStatus | undefined;
  const tutorCertificationStatus = rawTutorStatus && rawTutorStatus in tutorCertificationStatusLabels ? rawTutorStatus : "pending";

  const isAddressMutating =
    createAddressMutation.isPending ||
    updateAddressMutation.isPending ||
    useAddressMutation.isPending ||
    deleteAddressMutation.isPending;

  useEffect(() => {
    if (!isNicknameEditorOpen) {
      setNicknameDraft(profileName);
    }
  }, [isNicknameEditorOpen, profileName]);

  /** 使用最新全局昵称打开昵称编辑弹窗。 */
  function handleOpenNicknameChange() {
    setNicknameFeedback("");
    setNicknameDraft(profileName);
    setIsNicknameEditorOpen(true);
  }

  /** 保存 H5 外壳和资料页面使用的本地展示昵称。 */
  function handleSaveNickname() {
    const nicknameValidation = validateByKey("nickname", nicknameDraft, { label: "昵称", required: true });

    if (!nicknameValidation.isValid) {
      return;
    }

    setUserDisplayName(nicknameDraft);
    setIsNicknameEditorOpen(false);
    setNicknameFeedback("昵称已更新。");
  }

  /** 持久化地址列表，并将当前地址同步回全局资料草稿。 */
  function syncCurrentAddressDraft(nextAddressItems: AddressBookItem[]) {
    const addressFieldKeys = new Set(addressTemplate.fields.map((field) => field.key));
    const profileDraftWithoutAddress = Object.fromEntries(
      Object.entries(profileDraft).filter(([key]) => !addressFieldKeys.has(key))
    );
    const nextCurrentAddressDraft = getCurrentAddressDraft(nextAddressItems, {});

    setUserProfileDraft({
      ...profileDraftWithoutAddress,
      ...nextCurrentAddressDraft
    });
  }

  function notifyAddressResult(message: string, type: MessageToastType = "success") {
    onMessage?.(message, { type });
  }

  /** 使用空草稿打开新增地址弹窗。 */
  function handleOpenCreateAddress() {
    setAddressEditorMode("create");
    setEditingAddressId(null);
    setAddressDraft({});
  }

  /** 使用所选地址卡草稿打开编辑地址弹窗。 */
  function handleOpenEditAddress(item: AddressBookItem) {
    setAddressEditorMode("edit");
    setEditingAddressId(item.id);
    setAddressDraft(item.draft);
  }

  /** 将已有地址卡标记为当前使用地址。 */
  function handleUseAddress(item: AddressBookItem) {
    useAddressMutation.mutate(item.id, {
      onSuccess: (addresses) => {
        syncCurrentAddressDraft(clientAddressesToAddressBookItems(addresses));
        notifyAddressResult("已切换当前地址。");
      },
      onError: (error) => notifyAddressResult(getErrorMessage(error, "切换地址失败，请稍后重试。"), "error")
    });
  }

  /** 将编辑草稿保存为新增或已有地址卡。 */
  function handleSaveAddress() {
    const isInvalid = addressTemplate.fields.some(
      (field) => !validateByKey(field.key, addressDraft[field.key] ?? "", { label: field.label, required: true }).isValid
    );

    if (isInvalid) {
      return;
    }

    const editingAddress = editingAddressId ? addressItems.find((item) => item.id === editingAddressId) : null;
    const payload = profileDraftToClientAddressRequest(
      getFilledProfileDraft(addressDraft),
      addressEditorMode === "create" || Boolean(editingAddress?.isCurrent)
    );
    const closeEditor = () => {
      setAddressEditorMode(null);
      setEditingAddressId(null);
      setAddressDraft({});
    };
    const handleSuccess = (address: ClientAddress) => {
      if (address.isCurrent) {
        syncCurrentAddressDraft([clientAddressToAddressBookItem(address)]);
      }
      closeEditor();
      notifyAddressResult(addressEditorMode === "edit" ? "地址已更新。" : "地址已新增。");
    };
    const handleError = (error: unknown) => {
      notifyAddressResult(getErrorMessage(error, "地址保存失败，请稍后重试。"), "error");
    };

    if (addressEditorMode === "edit" && editingAddressId) {
      updateAddressMutation.mutate({ ...payload, addressId: editingAddressId }, {
        onSuccess: handleSuccess,
        onError: handleError
      });
      return;
    }

    createAddressMutation.mutate(payload, {
      onSuccess: handleSuccess,
      onError: handleError
    });
  }

  /** 删除指定地址，并按服务端返回的地址列表刷新当前地址草稿。 */
  function handleDeleteAddress(item: AddressBookItem) {
    if (typeof window !== "undefined" && !window.confirm("确认删除该地址？")) {
      return;
    }

    deleteAddressMutation.mutate(item.id, {
      onSuccess: (addresses) => {
        syncCurrentAddressDraft(clientAddressesToAddressBookItems(addresses));
        notifyAddressResult("地址已删除。");
      },
      onError: (error) => notifyAddressResult(getErrorMessage(error, "地址删除失败，请稍后重试。"), "error")
    });
  }

  /** 使用空验证码和当前手机号草稿打开手机号变更弹窗。 */
  function handleOpenPhoneChange() {
    setSecurityFeedback("");
    setPhoneChangeDraft({ phone: editableCurrentPhone, code: "" });
    setSecurityDialogMode("phone");
  }

  /** 打开重置密码弹窗，并尽量带入当前有效手机号。 */
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

  /** 打开家教资格信息弹窗，并使用最新全局资料初始化学科草稿。 */
  function handleOpenTutorInfo() {
    setTutorSubjectDraft(parseTutorSubjects(profileDraft.tutorSubject));
    setIsTutorInfoOpen(true);
  }

  /** 切换设置页家教学科标签。 */
  function handleToggleTutorSubject(subject: string) {
    setTutorSubjectDraft((currentSubjects) =>
      currentSubjects.includes(subject)
        ? currentSubjects.filter((currentSubject) => currentSubject !== subject)
        : [...currentSubjects, subject]
    );
  }

  /** 保存设置页家教学科，其他资格字段保持只读不变。 */
  function handleSaveTutorSubject() {
    if (tutorSubjectDraft.length === 0) {
      return;
    }

    setUserProfileDraft({
      ...profileDraft,
      tutorSubject: formatTutorSubjects(tutorSubjectDraft)
    });
    setIsTutorInfoOpen(false);
  }

  /** 固定验证码通过后更新 H5 本地手机号。 */
  function handleSavePhoneChange() {
    const phoneValidation = validateByKey("phone", phoneChangeDraft.phone, { label: "手机号", required: true });

    if (!phoneValidation.isValid || phoneChangeDraft.code !== localAuthCode) {
      return;
    }

    setUserPhone(phoneChangeDraft.phone);
    setSecurityDialogMode(null);
    setSecurityFeedback("手机号已更新。密码登录前请确认该手机号已设置本地密码。");
  }

  /** 手机号和验证码校验通过后重置 H5 本地密码。 */
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

      {role === "student" ? (
        <>
          <SectionHeader
            countText={tutorCertificationStatusLabels[tutorCertificationStatus]}
            eyebrow="资格申请信息"
            title="家教卡片"
          />
          <article className="flow-card settings-tutor-card p-[14px] compact">
            <div className="card-title flex items-center justify-between gap-[10px] min-w-0">
              <GraduationCap size={18} />
              <div>
                <strong>家教卡片更多</strong>
                <span>查看资格申请信息，学科可在审批后继续补充。</span>
              </div>
              <button
                className="ghost-button inline-flex min-h-[34px] shrink-0 items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
                onClick={handleOpenTutorInfo}
                type="button"
              >
                查看
              </button>
            </div>
          </article>
        </>
      ) : null}

      <SectionHeader
        countText={addressCountText}
        eyebrow={`${completedFieldCount}/${addressTemplate.fields.length} 已填`}
        title="地址信息"
      />
      <div className="card-list grid gap-[10px]">
        {addressError ? (
          <article className="empty-state p-[14px]">
            <strong>地址加载失败</strong>
            <p>{getErrorMessage(addressError, "请检查后端服务后重试。")}</p>
          </article>
        ) : addressItems.length > 0 ? (
          addressItems.map((item) => (
            <AddressInfoForm
              actionLabel="编辑"
              areaOptions={campusAreaOptions}
              draft={item.draft}
              fields={addressTemplate.fields}
              isCurrent={item.isCurrent}
              key={item.id}
              mode="preview"
              onDelete={() => handleDeleteAddress(item)}
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
        <button
          className="address-add-button flow-card compact p-[12px] text-left"
          disabled={isAddressMutating}
          onClick={handleOpenCreateAddress}
          type="button"
        >
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
          isSubmitting={isAddressMutating}
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
      {isTutorInfoOpen ? (
        <TutorQualificationInfoDialog
          certificationStatus={tutorCertificationStatus}
          onClose={() => setIsTutorInfoOpen(false)}
          onSave={handleSaveTutorSubject}
          onToggleSubject={handleToggleTutorSubject}
          profileDraft={profileDraft}
          selectedSubjects={tutorSubjectDraft}
        />
      ) : null}
    </section>
  );
}

/** 修改 H5 本地展示昵称的弹窗。 */
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

  /** 阻止原生表单跳转，并将保存动作交给 SettingsView。 */
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

/** 家教资格申请信息弹窗，除学科外均为只读展示。 */
function TutorQualificationInfoDialog({
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
    <section className="checkout-sheet" aria-label="家教资格申请信息">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet-panel tutor-qualification-sheet mx-auto grid max-h-[86vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <GraduationCap size={18} />
          <div>
            <strong>家教资格申请信息</strong>
            <span>当前状态：{tutorCertificationStatusLabels[certificationStatus]}</span>
          </div>
          <button className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]" onClick={onClose} type="button" aria-label="关闭">
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
      </div>
    </section>
  );
}

/** 设置页新增和编辑地址流程使用的地址编辑弹窗。 */
function AddressEditorDialog({
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
  onChange: (key: string, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const hasInvalidFields = fields.some(
    (field) => !validateByKey(field.key, draft[field.key] ?? "", { label: field.label, required: true }).isValid
  );

  /** 阻止原生表单跳转，并将保存动作交给 SettingsView。 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasInvalidFields && !isSubmitting) {
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
            disabled={hasInvalidFields || isSubmitting}
            type="submit"
          >
            <CheckCircle2 size={16} />
            {isSubmitting ? "保存中" : "保存地址"}
          </button>
        </div>
      </form>
    </section>
  );
}

/** 修改 H5 本地登录手机号的弹窗。 */
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

  /** 阻止原生表单跳转，并将保存动作交给 SettingsView。 */
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

/** 手机号校验后重置 H5 本地密码的弹窗。 */
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

  /** 阻止原生表单跳转，并将保存动作交给 SettingsView。 */
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
