import { useGlobalStore, useGlobalUser } from "@h5/store/global";
import { getFilledProfileDraft } from "../../shared/clientPageModel";
import { normalizeByKey, validateByKey } from "../../tools/validation";

/** 狩猎认证字段配置。 */
interface HuntingCertificationField {
  inputMode?: "text" | "numeric";
  key: string;
  label: string;
  placeholder: string;
}

/** 狩猎认证表单草稿。 */
type HuntingCertificationDraft = Record<string, string>;

/** 狩猎认证必填字段，后续接后端接口时可保持同一字段口径。 */
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

/** 根据全局资料草稿初始化狩猎认证表单。 */
function getInitialHuntingCertificationDraft(profileDraft: ProfileDraftState): HuntingCertificationDraft {
  return {
    huntingGender: profileDraft.huntingGender ?? "",
    ...Object.fromEntries(huntingCertificationFields.map((field) => [field.key, profileDraft[field.key] ?? ""]))
  };
}

/** 学生狩猎资格认证页面，当前阶段提交后进入“认证中”状态。 */
export function HuntingCertification({ onBack, onSubmitted }: { onBack: () => void; onSubmitted: () => void }) {
  const { profileDraft } = useGlobalUser();
  const setUserProfileDraft = useGlobalStore((state) => state.setUserProfileDraft);
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

  /** 更新认证字段并复用统一输入归一化。 */
  function handleFieldChange(key: string, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [key]: normalizeByKey(key, value)
    }));
  }

  /** 提交本地认证草稿，等待后端认证接口上线后替换为真实提交。 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormValid) {
      return;
    }

    const filledDraft = getFilledProfileDraft({
      ...draft,
      huntingCertificationStatus: "reviewing"
    });

    setUserProfileDraft({
      ...profileDraft,
      ...filledDraft
    });
    onSubmitted();
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
            onClick={onBack}
            type="button"
          >
            返回
          </button>
          <button
            className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={!isFormValid}
            type="submit"
          >
            提交认证
          </button>
        </div>
      </form>
    </section>
  );
}
