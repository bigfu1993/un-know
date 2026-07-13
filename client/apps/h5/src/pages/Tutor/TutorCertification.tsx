import { useGlobalStore, useGlobalUser } from "@h5/store/global";
import { getFilledProfileDraft } from "@shared/clientPageModel";
import { parseTutorSubjects, tutorSubjectOptions } from "@shared/tutorModel";
import { normalizeByKey, validateByKey } from "@tools/validation";

/** 家教认证字段配置。 */
interface TutorCertificationField {
  inputMode?: "text" | "numeric";
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
}

/** 家教认证表单草稿。 */
type TutorCertificationDraft = Record<string, string>;

/** 家教认证必填与选填字段，后续接后端接口时可保持同一字段口径。 */
const tutorCertificationFields: TutorCertificationField[] = [
  { key: "tutorRealName", label: "姓名", placeholder: "请输入真实姓名", required: true },
  { key: "tutorAge", label: "年龄", placeholder: "请输入年龄", required: true, inputMode: "numeric" },
  { key: "tutorNativePlace", label: "籍贯", placeholder: "请输入籍贯", required: true },
  { key: "tutorIdCard", label: "身份证", placeholder: "请输入身份证号", required: true },
  { key: "tutorSchool", label: "学校", placeholder: "请输入学校", required: true },
  { key: "tutorMajor", label: "专业", placeholder: "请输入专业", required: true },
  { key: "tutorXuexinScreenshot", label: "学信网截图", placeholder: "可填写截图文件名或链接", required: false },
  { key: "tutorGpa", label: "绩点", placeholder: "可填写 GPA / 绩点", required: false },
  { key: "tutorCertificate", label: "证书", placeholder: "可填写证书名称、编号或链接", required: false }
];

/** 认证性别选项。 */
const tutorGenderOptions = ["男", "女", "其他"];

/** 根据全局资料草稿初始化认证表单。 */
function getInitialTutorCertificationDraft(profileDraft: ProfileDraftState): TutorCertificationDraft {
  return {
    tutorGender: profileDraft.tutorGender ?? "",
    tutorSubject: profileDraft.tutorSubject ?? "",
    ...Object.fromEntries(tutorCertificationFields.map((field) => [field.key, profileDraft[field.key] ?? ""]))
  };
}

/** 学生家教资格认证页面，当前阶段提交后进入“认证中”状态。 */
export function TutorCertification({ onBack, onSubmitted }: { onBack: () => void; onSubmitted: () => void }) {
  const { profileDraft } = useGlobalUser();
  const setUserProfileDraft = useGlobalStore((state) => state.setUserProfileDraft);
  const [draft, setDraft] = useState<TutorCertificationDraft>(() => getInitialTutorCertificationDraft(profileDraft));
  const selectedSubjects = parseTutorSubjects(draft.tutorSubject);
  const requiredFieldResults = tutorCertificationFields
    .filter((field) => field.required)
    .map((field) => validateByKey(field.key, draft[field.key] ?? "", { label: field.label, required: true }));
  const genderValidation = validateByKey("tutorGender", draft.tutorGender ?? "", { label: "性别", required: true });
  const subjectValidation = validateByKey("tutorSubject", draft.tutorSubject ?? "", { label: "学科", required: true });
  const isFormValid =
    genderValidation.isValid && subjectValidation.isValid && requiredFieldResults.every((result) => result.isValid);

  /** 更新认证字段并复用统一输入归一化。 */
  function handleFieldChange(key: string, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [key]: normalizeByKey(key, value)
    }));
  }

  /** 切换多选学科标签并以中文顿号持久化到家教卡片学科字段。 */
  function handleSubjectToggle(subject: string) {
    const nextSubjects = selectedSubjects.includes(subject)
      ? selectedSubjects.filter((item) => item !== subject)
      : [...selectedSubjects, subject];

    handleFieldChange("tutorSubject", nextSubjects.join("、"));
  }

  /** 提交本地认证草稿，等待后端认证接口上线后替换为真实提交。 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormValid) {
      return;
    }

    const filledDraft = getFilledProfileDraft({
      ...draft,
      tutorCertificationStatus: "reviewing",
      tutorLevel: profileDraft.tutorLevel || "L1"
    });

    setUserProfileDraft({
      ...profileDraft,
      ...filledDraft
    });
    onSubmitted();
  }

  return (
    <section className="module-stack grid gap-[10px]">
      <SectionHeader countText="待提交" eyebrow="认证通过后展示家教卡片" title="家教认证" />
      <form className="tutor-certification-form flow-card grid gap-[12px] p-[14px]" onSubmit={handleSubmit}>
        <label className={`profile-field grid gap-[6px] ${!genderValidation.isValid ? "missing" : ""}`}>
          <span>性别</span>
          <div className="segmented-control tutor-gender-control flex gap-[8px]" aria-label="选择性别">
            {tutorGenderOptions.map((gender) => (
              <button
                className={draft.tutorGender === gender ? "active" : ""}
                key={gender}
                onClick={() => handleFieldChange("tutorGender", gender)}
                type="button"
              >
                {gender}
              </button>
            ))}
          </div>
          {!genderValidation.isValid ? <em>{genderValidation.message}</em> : null}
        </label>

        <label className={`profile-field grid gap-[6px] ${!subjectValidation.isValid ? "missing" : ""}`}>
          <span>学科</span>
          <div className="tutor-subject-tags flex flex-wrap gap-[8px]" aria-label="选择可授课学科">
            {tutorSubjectOptions.map((subject) => (
              <button
                className={selectedSubjects.includes(subject) ? "active" : ""}
                key={subject}
                onClick={() => handleSubjectToggle(subject)}
                type="button"
              >
                {subject}
              </button>
            ))}
          </div>
          {!subjectValidation.isValid ? <em>{subjectValidation.message}</em> : null}
        </label>

        <div className="tutor-certification-grid grid gap-[10px]">
          {tutorCertificationFields.map((field) => {
            const validation = validateByKey(field.key, draft[field.key] ?? "", {
              label: field.label,
              required: field.required
            });
            return (
              <label className={`profile-field grid gap-[6px] ${!validation.isValid ? "missing" : ""}`} key={field.key}>
                <span>
                  {field.label}
                  {!field.required ? <small>选填</small> : null}
                </span>
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
