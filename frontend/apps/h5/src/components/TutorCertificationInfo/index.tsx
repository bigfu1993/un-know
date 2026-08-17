import "./index.less";
import { CheckCircle2, GraduationCap, Pencil, Plus, RefreshCw, Trash2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { tutorSubjectOptions } from "@shared/tutorModel";
import { normalizeByKey, validateByKey } from "@tools/validation";

/** 家教认证信息弹窗保存模式。 */
export type TutorCertificationInfoSaveMode = "edit" | "recertify";

/** 家教认证信息弹窗属性。 */
export interface TutorCertificationInfoProps {
  onClose: () => void;
  onSave: (profileDraft: ProfileDraftState, mode: TutorCertificationInfoSaveMode) => void;
  profileDraft: ProfileDraftState;
}

/** 家教认证信息展示和重新认证共用字段。 */
interface TutorCertificationInfoField {
  inputMode?: "text" | "numeric";
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
}

/** 弹窗当前操作模式。 */
type TutorCertificationInfoMode = "preview" | TutorCertificationInfoSaveMode;

/** 家教认证基础字段，和认证页面保持字段口径一致。 */
const tutorCertificationInfoFields: TutorCertificationInfoField[] = [
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

/** 重新认证限制提示。 */
const recertificationNoticeItems = ["重新提交认证过程中将无法被查看，也无法接受、联系家教兼职。"];

/** 新增学科能力行的默认值。 */
function createEmptySubjectLevelItem(): TutorSubjectLevelItem {
  return {
    grade: tutorGradeOptions[0],
    level: tutorLevelOptions[0],
    subject: tutorSubjectOptions[0]
  };
}

/** 统一认证字段展示空值。 */
function getDisplayValue(value?: string) {
  return value?.trim() || "未填写";
}

/** 初始化弹窗内可编辑学科等级列表。 */
function getInitialSubjectRows(profileDraft: ProfileDraftState) {
  const subjectRows = parseTutorSubjectLevelItems(profileDraft);

  return subjectRows.length > 0 ? subjectRows : [createEmptySubjectLevelItem()];
}

/** 清洗学科等级列表，避免保存空学科和空等级。 */
function normalizeSubjectRows(subjectRows: TutorSubjectLevelItem[]) {
  const subjectMap = new Map<string, TutorSubjectLevelItem>();

  subjectRows.forEach((item) => {
    const subject = item.subject.trim();

    if (!subject) {
      return;
    }

    subjectMap.set(subject, {
      grade: item.grade.trim() || tutorGradeOptions[0],
      level: item.level.trim() || tutorLevelOptions[0],
      subject
    });
  });

  return Array.from(subjectMap.values());
}

/** 根据学科等级列表生成兼容旧字段和新字段的资料草稿片段。 */
function getSubjectDraft(subjectRows: TutorSubjectLevelItem[]) {
  const normalizedRows = normalizeSubjectRows(subjectRows);

  return {
    tutorGrade: Array.from(new Set(normalizedRows.map((item) => item.grade))).join("、"),
    tutorLevel: Array.from(new Set(normalizedRows.map((item) => item.level))).join("、") || tutorLevelOptions[0],
    tutorSubject: normalizedRows.map((item) => item.subject).join("、"),
    tutorSubjectLevels: stringifyTutorSubjectLevelItems(normalizedRows)
  };
}

/** 家教认证资料预览、学科修改和重新认证弹窗。 */
export function TutorCertificationInfo({
  onClose,
  onSave,
  profileDraft
}: TutorCertificationInfoProps) {
  const [mode, setMode] = useState<TutorCertificationInfoMode>("preview");
  const [draft, setDraft] = useState<ProfileDraftState>(() => ({ ...profileDraft }));
  const [subjectRows, setSubjectRows] = useState<TutorSubjectLevelItem[]>(() => getInitialSubjectRows(profileDraft));
  const isEditing = mode !== "preview";
  const isRecertifying = mode === "recertify";
  const rawCertificationStatus = profileDraft.tutorCertificationStatus;
  const certificationStatus =
    rawCertificationStatus && rawCertificationStatus in tutorCertificationStatusLabels
      ? (rawCertificationStatus as keyof typeof tutorCertificationStatusLabels)
      : "normal";
  const hasValidSubjects = normalizeSubjectRows(subjectRows).length > 0;
  const requiredFieldResults = useMemo(
    () =>
      tutorCertificationInfoFields
        .filter((field) => field.required)
        .map((field) => validateByKey(field.key, draft[field.key] ?? "", { label: field.label, required: true })),
    [draft]
  );
  const genderValidation = validateByKey("tutorGender", draft.tutorGender ?? "", {
    label: "性别",
    required: true
  });
  const isFormValid =
    hasValidSubjects &&
    (!isRecertifying || (genderValidation.isValid && requiredFieldResults.every((result) => result.isValid)));

  /** 更新重新认证字段，并复用统一归一化规则。 */
  function handleDraftChange(key: string, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [key]: normalizeByKey(key, value)
    }));
  }

  /** 更新单个学科能力行。 */
  function handleSubjectRowChange(index: number, key: keyof TutorSubjectLevelItem, value: string) {
    setSubjectRows((currentRows) =>
      currentRows.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    );
  }

  /** 删除单个学科能力行，至少保留一行用于继续编辑。 */
  function handleRemoveSubjectRow(index: number) {
    setSubjectRows((currentRows) => {
      const nextRows = currentRows.filter((_, itemIndex) => itemIndex !== index);

      return nextRows.length > 0 ? nextRows : [createEmptySubjectLevelItem()];
    });
  }

  /** 切换到指定编辑模式时回填最新资料。 */
  function handleEnterMode(nextMode: TutorCertificationInfoSaveMode) {
    setDraft({ ...profileDraft });
    setSubjectRows(getInitialSubjectRows(profileDraft));
    setMode(nextMode);
  }

  /** 保存学科修改或重新提交认证。 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormValid || mode === "preview") {
      return;
    }

    onSave(
      {
        ...profileDraft,
        ...(isRecertifying ? draft : {}),
        ...getSubjectDraft(subjectRows)
      },
      mode
    );
  }

  return (
    <Modal
      ariaLabel="家教认证信息"
      onClose={onClose}
      onSubmit={handleSubmit}
      panelClassName="tutor-certification-info-sheet mx-auto grid max-h-[82vh] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
      panelElement="form"
    >
        <div className="card-title tutor-certification-info-header flex items-center justify-between gap-[10px]">
          <GraduationCap size={18} />
          <div className="tutor-certification-info-title-copy">
            <strong>家教认证信息</strong>
            <span>{tutorCertificationStatusLabels[certificationStatus]}</span>
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

        <div className="tutor-certification-info-body grid gap-[12px]">
          {isEditing ? (
            <SubjectLevelEditor
              onAdd={() => setSubjectRows((currentRows) => [...currentRows, createEmptySubjectLevelItem()])}
              onChange={handleSubjectRowChange}
              onRemove={handleRemoveSubjectRow}
              rows={subjectRows}
            />
          ) : (
            <SubjectLevelPreview rows={subjectRows} />
          )}

          {isRecertifying ? (
            <>
              <label className={`profile-field grid gap-[6px] ${!genderValidation.isValid ? "missing" : ""}`}>
                <span>性别</span>
                <div className="segmented-control tutor-gender-control flex gap-[8px]" aria-label="选择性别">
                  {tutorGenderOptions.map((gender) => (
                    <button
                      className={draft.tutorGender === gender ? "active" : ""}
                      key={gender}
                      onClick={() => handleDraftChange("tutorGender", gender)}
                      type="button"
                    >
                      {gender}
                    </button>
                  ))}
                </div>
                {!genderValidation.isValid ? <em>{genderValidation.message}</em> : null}
              </label>

              <div className="tutor-certification-grid grid gap-[10px]">
                {tutorCertificationInfoFields.map((field) => {
                  const validation = validateByKey(field.key, draft[field.key] ?? "", {
                    label: field.label,
                    required: field.required
                  });

                  return (
                    <label
                      className={`profile-field grid gap-[6px] ${!validation.isValid ? "missing" : ""}`}
                      key={field.key}
                    >
                      <span>
                        {field.label}
                        {!field.required ? <small>选填</small> : null}
                      </span>
                      <input
                        inputMode={field.inputMode ?? "text"}
                        onChange={(event) => handleDraftChange(field.key, event.target.value)}
                        placeholder={field.placeholder}
                        type="text"
                        value={draft[field.key] ?? ""}
                      />
                      {!validation.isValid ? <em>{validation.message}</em> : null}
                    </label>
                  );
                })}
              </div>

              <ScrollingTicker
                ariaLabel="重新认证限制提示"
                className="tutor-recertification-ticker"
                items={recertificationNoticeItems}
              />
            </>
          ) : (
            <CertificationPreview profileDraft={profileDraft} />
          )}
        </div>

        <div className="sheet-actions tutor-certification-info-footer grid gap-[8px]">
          {mode === "preview" ? (
            <>
              <button
                className="ghost-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
                onClick={(event) => {
                  event.preventDefault();
                  handleEnterMode("edit");
                }}
                type="button"
              >
                <Pencil size={16} />
                修改
              </button>
              <button
                className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
                onClick={(event) => {
                  event.preventDefault();
                  handleEnterMode("recertify");
                }}
                type="button"
              >
                <RefreshCw size={16} />
                重新认证
              </button>
            </>
          ) : (
            <>
              <button
                className="ghost-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
                onClick={(event) => {
                  event.preventDefault();
                  setMode("preview");
                }}
                type="button"
              >
                取消
              </button>
              <button
                className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
                disabled={!isFormValid}
                type="submit"
              >
                <CheckCircle2 size={16} />
                {isRecertifying ? "重新提交" : "保存修改"}
              </button>
            </>
          )}
        </div>
    </Modal>
  );
}

/** 学科等级预览列表。 */
function SubjectLevelPreview({ rows }: { rows: TutorSubjectLevelItem[] }) {
  const normalizedRows = normalizeSubjectRows(rows);

  return (
    <section className="tutor-subject-level-preview grid gap-[8px]">
      <strong>可授课学科</strong>
      {normalizedRows.map((item) => (
        <span key={`${item.subject}-${item.grade}-${item.level}`}>
          <em>{item.subject}</em>
          <small>{item.grade}</small>
          <strong>{item.level}</strong>
        </span>
      ))}
    </section>
  );
}

/** 学科、年级和水平等级编辑器。 */
function SubjectLevelEditor({
  onAdd,
  onChange,
  onRemove,
  rows
}: {
  onAdd: () => void;
  onChange: (index: number, key: keyof TutorSubjectLevelItem, value: string) => void;
  onRemove: (index: number) => void;
  rows: TutorSubjectLevelItem[];
}) {
  return (
    <section className="tutor-subject-level-editor grid gap-[10px]">
      <div className="card-title flex items-center justify-between gap-[10px]">
        <div className="tutor-subject-level-title-copy">
          <strong>学科与等级</strong>
          <span>每一行维护一个学科、可授课年级和水平等级。</span>
        </div>
        <button className="ghost-button inline-flex items-center gap-[5px] px-[9px] py-[7px]" onClick={onAdd} type="button">
          <Plus size={15} />
          新增
        </button>
      </div>
      {rows.map((item, index) => (
        <div className="tutor-subject-level-row grid gap-[8px]" key={`${item.subject}-${index}`}>
          <label className="profile-field grid gap-[6px]">
            <span>学科</span>
            <select onChange={(event) => onChange(index, "subject", event.target.value)} value={item.subject}>
              {tutorSubjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </label>
          <label className="profile-field grid gap-[6px]">
            <span>年级</span>
            <select onChange={(event) => onChange(index, "grade", event.target.value)} value={item.grade}>
              {tutorGradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </label>
          <label className="profile-field grid gap-[6px]">
            <span>等级</span>
            <select onChange={(event) => onChange(index, "level", event.target.value)} value={item.level}>
              {tutorLevelOptions.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <button
            className="icon-only tutor-subject-level-remove grid h-[38px] w-[38px] place-items-center text-[#dc2626]"
            onClick={() => onRemove(index)}
            type="button"
            aria-label="删除学科"
          >
            <Trash2 size={17} />
          </button>
        </div>
      ))}
    </section>
  );
}

/** 认证资料只读预览。 */
function CertificationPreview({ profileDraft }: { profileDraft: ProfileDraftState }) {
  const previewFields = [
    { key: "tutorGender", label: "性别" },
    ...tutorCertificationInfoFields.map((field) => ({ key: field.key, label: field.label }))
  ];

  return (
    <section className="tutor-certification-preview grid gap-[8px]">
      <strong>认证资料</strong>
      <div className="tutor-certification-preview-grid grid gap-[8px]">
        {previewFields.map((field) => (
          <span key={field.key}>
            <em>{field.label}</em>
            <strong>{getDisplayValue(profileDraft[field.key])}</strong>
          </span>
        ))}
      </div>
    </section>
  );
}
