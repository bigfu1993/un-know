import "./index.less";
import { useGlobalStore, useGlobalUser } from "@h5/store/global";
import { AddressInfoForm } from "@components/AddressInfoForm";
import { tutorCertificationStatusLabels } from "@components/TutorCard/model";
import {
  AddressEditorDialog,
  NicknameEditorDialog,
  PasswordResetDialog,
  PhoneChangeDialog,
  TutorQualificationInfoDialog,
  type AddressEditorMode,
  type PasswordResetDraft,
  type PhoneChangeDraft
} from "@pages/Settings/components/SettingsDialogs";
import {
  campusAreaOptions,
  clientAddressesToAddressBookItems,
  clientAddressToAddressBookItem,
  getFilledProfileDraft,
  getCurrentAddressDraft,
  profileDraftToClientAddressRequest,
  registrationProfileTemplates,
} from "@shared/clientPageModel";
import { formatTutorSubjects, parseTutorSubjects } from "@shared/tutorModel";
import { localAuthCode, localPasswordMinLength, saveLocalPasswordCredential } from "@tools/localAuth";
import { showMessage } from "@tools/messageToast";
import { getFilledFieldCount, hasInvalidRequiredFields, validateByKey } from "@tools/validation";

/** 设置页手机号安全弹窗模式。 */
type SecurityDialogMode = "phone" | "password";

/** 设置页面，负责昵称、手机号安全、地址、协议、版本和反馈入口。 */
/** 地址接口返回前使用的稳定空列表，避免派生地址列表在每次渲染时变更引用。 */
const emptyClientAddresses: ClientAddress[] = [];

export function SettingsView({ onBack }: { onBack: () => void }) {
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
  const resetPasswordMutation = useResetClientPassword();
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
  const completedFieldCount = getFilledFieldCount(addressTemplate.fields, currentAddressDraft);
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
    showMessage(message, { type });
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
    const isInvalid = hasInvalidRequiredFields(addressTemplate.fields, addressDraft);

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

  /** 手机号和验证码校验通过后调用服务端接口重置密码，并同步 H5 本地密码凭据。 */
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
      await resetPasswordMutation.mutateAsync({
        phone: passwordResetDraft.phone,
        verifyMode: "code",
        code: passwordResetDraft.code,
        password: passwordResetDraft.password,
        passwordConfirm: passwordResetDraft.passwordConfirm
      });
      await saveLocalPasswordCredential(passwordResetDraft.phone, passwordResetDraft.password);
      setSecurityDialogMode(null);
      setSecurityFeedback("密码已重置，可在登录页使用密码登录。");
    } catch (error) {
      setSecurityFeedback(getErrorMessage(error, "密码重置失败，请稍后重试。"));
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
              fields={addressTemplate.fields}
              item={item}
              key={item.id}
              mode="preview"
              onDelete={handleDeleteAddress}
              onEdit={handleOpenEditAddress}
              onUse={handleUseAddress}
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
          onChange={setAddressDraft}
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
