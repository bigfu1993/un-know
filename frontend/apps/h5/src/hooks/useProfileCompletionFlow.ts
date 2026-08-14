import {
  clientAddressToAddressBookItem,
  getCurrentAddressDraft,
  getFilledProfileDraft,
  getProfileRequirement,
  getProfileRequirementTemplate,
  getStoredProfileDraft,
  profileDraftToClientAddressRequest
} from "@shared/clientPageModel";

/** 地址保存 mutation 的回调参数。 */
interface AddressMutationCallbacks {
  onError: (error: unknown) => void;
  onSuccess: (address: ClientAddress) => void;
}

/** 资料补充流程入参。 */
interface UseProfileCompletionFlowOptions {
  activeTab: ClientModuleKey;
  addressItems: AddressBookItem[];
  createAddress: (payload: ClientAddressRequest, callbacks: AddressMutationCallbacks) => void;
  isSaving: boolean;
  refetchHome: () => void;
  role: Role;
  setUserProfileDraft: (draft: ProfileDraftState) => void;
  showMessage: (content: string, options?: MessageToastOptions) => void;
  updateAddress: (payload: ClientAddressRequest & { addressId: string }, callbacks: AddressMutationCallbacks) => void;
  userProfileDraft: ProfileDraftState;
  userPhone: string;
}

/** 资料补充流程，统一处理地址草稿、场景必填校验和保存接口。 */
export function useProfileCompletionFlow({
  activeTab,
  addressItems,
  createAddress,
  isSaving,
  refetchHome,
  role,
  setUserProfileDraft,
  showMessage,
  updateAddress,
  userProfileDraft,
  userPhone
}: UseProfileCompletionFlowOptions) {
  const [savedProfileDraft, setSavedProfileDraft] = useState<ProfileDraftState>(() => getStoredProfileDraft(userPhone));
  const [profileDraft, setProfileDraft] = useState<ProfileDraftState>(() => getStoredProfileDraft(userPhone));
  const [isProfileCompletionOpen, setIsProfileCompletionOpen] = useState(false);
  const currentAddressDraft = useMemo(() => getCurrentAddressDraft(addressItems, {}), [addressItems]);
  const profileRequirement = getProfileRequirement(role, activeTab, currentAddressDraft);
  const profileCompletionTemplate = getProfileRequirementTemplate(role, activeTab);

  useEffect(() => {
    const nextAddressDraft = getCurrentAddressDraft(addressItems, {});

    setSavedProfileDraft(nextAddressDraft);
    if (!isProfileCompletionOpen) {
      setProfileDraft(nextAddressDraft);
    }
  }, [addressItems, isProfileCompletionOpen]);

  /** 重置当前登录账号对应的本地资料草稿。 */
  function resetProfileDraftForPhone(phone: string) {
    const storedProfileDraft = getStoredProfileDraft(phone);

    setSavedProfileDraft(storedProfileDraft);
    setProfileDraft(storedProfileDraft);
  }

  /** 同步更新全局资料、已保存草稿和当前编辑草稿。 */
  function syncProfileDraft(nextProfileDraft: ProfileDraftState) {
    setUserProfileDraft(nextProfileDraft);
    setSavedProfileDraft(nextProfileDraft);
    setProfileDraft(nextProfileDraft);
  }

  /** 修改资料补充弹窗内的单个字段。 */
  function changeProfileDraft(key: string, value: string) {
    setProfileDraft((draft) => ({
      ...draft,
      [key]: value
    }));
  }

  /** 保存资料补充弹窗内容到当前使用地址。 */
  function saveProfileDraft() {
    const nextProfileDraft = {
      ...savedProfileDraft,
      ...getFilledProfileDraft(profileDraft)
    };
    const payload = profileDraftToClientAddressRequest(nextProfileDraft, true);
    const currentAddressId = addressItems.find((item) => item.isCurrent)?.id;
    const handleSuccess = (address: ClientAddress) => {
      const nextAddressDraft = clientAddressToAddressBookItem(address).draft;

      setSavedProfileDraft(nextAddressDraft);
      setProfileDraft(nextAddressDraft);
      setUserProfileDraft({
        ...userProfileDraft,
        ...nextAddressDraft
      });
      setIsProfileCompletionOpen(false);
      showMessage("资料已保存，当前模块可以继续操作。", { type: "success" });
      refetchHome();
    };
    const handleError = (error: unknown) => {
      showMessage(getErrorMessage(error, "资料保存失败，请稍后重试。"), { type: "error" });
    };

    if (currentAddressId) {
      updateAddress({ ...payload, addressId: currentAddressId }, {
        onSuccess: handleSuccess,
        onError: handleError
      });
      return;
    }

    createAddress(payload, {
      onSuccess: handleSuccess,
      onError: handleError
    });
  }

  /** 打开资料补充弹窗，并回填最近一次保存的资料。 */
  function openProfileCompletion() {
    setProfileDraft(savedProfileDraft);
    setIsProfileCompletionOpen(true);
  }

  return {
    changeProfileDraft,
    currentAddressDraft,
    isProfileCompletionOpen,
    isSaving,
    openProfileCompletion,
    profileCompletionTemplate,
    profileDraft,
    profileRequirement,
    resetProfileDraftForPhone,
    saveProfileDraft,
    savedProfileDraft,
    setIsProfileCompletionOpen,
    syncProfileDraft
  };
}
