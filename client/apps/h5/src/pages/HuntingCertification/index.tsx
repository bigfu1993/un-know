import "./index.less";
import { useGlobalUser } from "@h5/store/global";
import { useSubmitHuntingCertification } from "@unknown/hooks";
import { getFilledProfileDraft } from "@shared/clientPageModel";
import { normalizeByKey, validateByKey } from "@tools/validation";

/** 狩猎认证字段配置，字段 key 同本地资料草稿保持一致，便于提交后回填表单。 */
interface HuntingCertificationField {
  inputMode?: "text" | "numeric";
  key: string;
  label: string;
  placeholder: string;
}

/** 狩猎认证表单草稿。 */
type HuntingCertificationDraft = Record<string, string>;

/** 狩猎认证必填字段，提交时会映射为服务端接口字段。 */
const huntingCertificationFields: HuntingCertificationField[] = [
  { key: "huntingRealName", label: "姓名", placeholder: "请输入真实姓名" },
  { key: "huntingAge", label: "年龄", placeholder: "请输入年龄", inputMode: "numeric" },
  { key: "huntingNativePlace", label: "籍贯", placeholder: "请输入籍贯" },
  { key: "huntingIdCard", label: "身份证", placeholder: "请输入身份证号" },
  { key: "huntingSchool", label: "学校", placeholder: "请输入学校" },
  { key: "huntingMajor", label: "专业", placeholder: "请输入专业" }
];

/** 狩猎认证性别选项。 */
const huntingGenderOptions = ["男", "女", "其他"];

interface HuntingCertificationProps {
  onBack: () => void;
  onSubmitError: (error: unknown) => void;
  onSubmitted: (certificationStatus: HuntingCertificationStatus, profileDraft: ProfileDraftState) => void;
}

/** 根据全局资料草稿初始化狩猎认证表单。 */
function getInitialHuntingCertificationDraft(profileDraft: ProfileDraftState): HuntingCertificationDraft {
  return {
    huntingGender: profileDraft.huntingGender ?? "",
    ...Object.fromEntries(huntingCertificationFields.map((field) => [field.key, profileDraft[field.key] ?? ""]))
  };
}

/** 学生狩猎资格认证页面，提交后由服务端持久化审核状态并返回最新状态。 */
export function HuntingCertification({ onBack, onSubmitError, onSubmitted }: HuntingCertificationProps) {
  const { profileDraft } = useGlobalUser();
  const submitHuntingCertificationMutation = useSubmitHuntingCertification();
  const [draft, setDraft] = useState<HuntingCertificationDraft>(() =>
    getInitialHuntingCertificationDraft(profileDraft)
  );
  const requiredFieldResults = huntingCertificationFields.map((field) =>
    validateByKey(field.key, draft[field.key] ?? "", { label: field.label, required: true })
  );
  const genderValidation = validateByKey("huntingGender", draft.huntingGender ?? "", {
    label: "性别",
    required: true
  });
  const isFormValid = genderValidation.isValid && requiredFieldResults.every((result) => result.isValid);
  const isSubmitting = submitHuntingCertificationMutation.isPending;

  /** 更新认证字段并复用统一输入归一化。 */
  function handleFieldChange(key: string, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [key]: normalizeByKey(key, value)
    }));
  }

  /** 提交狩猎认证资料，认证状态以服务端返回为准。 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormValid || isSubmitting) {
      return;
    }

    submitHuntingCertificationMutation.mutate(
      {
        realName: draft.huntingRealName ?? "",
        gender: draft.huntingGender ?? "",
        age: draft.huntingAge ?? "",
        nativePlace: draft.huntingNativePlace ?? "",
        idCard: draft.huntingIdCard ?? "",
        school: draft.huntingSchool ?? "",
        major: draft.huntingMajor ?? ""
      },
      {
        onSuccess: (response) => {
          onSubmitted(response.huntingCertificationStatus, getFilledProfileDraft(draft));
        },
        onError: onSubmitError
      }
    );
  }

  return (
    <section className="module-stack grid gap-[10px]">
      <SectionHeader countText="待提交" eyebrow="认证通过后可承接狩猎任务" title="狩猎认证" />
      <form className="tutor-certification-form flow-card grid gap-[12px] p-[14px]" onSubmit={handleSubmit}>
        <label className={`profile-field grid gap-[6px] ${!genderValidation.isValid ? "missing" : ""}`}>
          <span>性别</span>
          <div className="segmented-control tutor-gender-control flex gap-[8px]" aria-label="选择性别">
            {huntingGenderOptions.map((gender) => (
              <button
                className={draft.huntingGender === gender ? "active" : ""}
                key={gender}
                onClick={() => handleFieldChange("huntingGender", gender)}
                type="button"
              >
                {gender}
              </button>
            ))}
          </div>
          {!genderValidation.isValid ? <em>{genderValidation.message}</em> : null}
        </label>

        <div className="tutor-certification-grid grid gap-[10px]">
          {huntingCertificationFields.map((field) => {
            const validation = validateByKey(field.key, draft[field.key] ?? "", {
              label: field.label,
              required: true
            });
            return (
              <label className={`profile-field grid gap-[6px] ${!validation.isValid ? "missing" : ""}`} key={field.key}>
                <span>{field.label}</span>
                <input
                  inputMode={field.inputMode ?? "text"}
                  onChange={(event) => handleFieldChange(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  type="text"
                  value={draft[field.key] ?? ""}
                />
                {!validation.isValid ? <em>{validation.message}</em> : null}
              </label>
            );
          })}
        </div>
        <div className="sheet-actions grid gap-[8px]">
          <button
            className="ghost-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            disabled={isSubmitting}
            onClick={onBack}
            type="button"
          >
            返回
          </button>
          <button
            className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={!isFormValid || isSubmitting}
            type="submit"
          >
            {isSubmitting ? "提交中..." : "提交认证"}
          </button>
        </div>
      </form>
    </section>
  );
}
