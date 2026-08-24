import "./index.less";
import { BookOpen, MessageCircle, School, Tags } from "lucide-react";
import { TutorCard } from "./components/TutorCard";
import { ListFilters } from "./components/ListFilters";
import { formatTutorSubjectLabels, parseTutorSubjects } from "@shared/tutorModel";

/** 按学校、学科筛选认证学生列表；列表顺序沿用服务端信用分排序，不做前端二次排序。 */
function getVisibleTutorStudents(students: TutorCertifiedStudent[], selectedSchool: string, selectedSubject: string) {
  return students.filter((student) => {
    const schoolMatched = selectedSchool ? student.tutor_certification.school === selectedSchool : true;
    const subjectMatched = selectedSubject
      ? parseTutorSubjects(student.tutor_certification.subject).includes(selectedSubject)
      : true;

    return schoolMatched && subjectMatched;
  });
}

/** 性别对应的图标颜色，男生蓝色、女生粉色，其余性别沿用 .card-title svg 的默认色。
 *  用内联 style 而不是 Tailwind 类名，因为全局 `.card-title svg { color: #1d6f55 }`
 *  比单个 class 选择器优先级更高，className 会被它覆盖，必须用内联样式才能真正生效。 */
function getGenderIconColor(gender: string) {
  if (gender === "男") {
    return "#2563eb";
  }
  if (gender === "女") {
    return "#db2777";
  }
  return undefined;
}

/** 认证学生详情弹窗展示的全部字段，不含信用分。 */
function getTutorStudentDetailItems(student: TutorCertifiedStudent) {
  const certification = student.tutor_certification;

  return [
    { label: "昵称", value: student.nickname || "未设置昵称" },
    { label: "手机号", value: student.phone || "待补充" },
    { label: "真实姓名", value: certification.real_name || "待补充" },
    { label: "性别", value: certification.gender || "待补充" },
    { label: "年龄", value: certification.age || "待补充" },
    { label: "籍贯", value: certification.native_place || "待补充" },
    { label: "学校", value: certification.school || "待补充" },
    { label: "专业", value: certification.major || "待补充" },
    { label: "学科", value: formatTutorSubjectLabels(certification.subject) || "待补充" },
    { label: "绩点", value: certification.gpa || "待补充" },
    { label: "证书", value: certification.certificate || "待补充" },
    { label: "身份证号", value: certification.id_card || "待补充" },
    { label: "学信网", value: certification.xuexin_screenshot || "待补充" }
  ];
}

/** 家长家教招募页面，浏览已认证并开启家教开关的学生档案。 */
export function Tutor({ students }: { students: TutorCertifiedStudent[] }) {
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const visibleTutorStudents = useMemo(
    () => getVisibleTutorStudents(students, selectedSchool, selectedSubject),
    [selectedSchool, selectedSubject, students]
  );
  return (
    <section className="module-stack tutor-list-page grid gap-[10px]">
      <SectionHeader countText={`${visibleTutorStudents.length} 个学生`} title="家教招募" />

      <ListFilters
        onSchoolChange={setSelectedSchool}
        onSubjectChange={setSelectedSubject}
        selectedSchool={selectedSchool}
        selectedSubject={selectedSubject}
        students={students}
      />

      {visibleTutorStudents.map((student) => (
        <TutorCard
          detail={
            <div className="tutor-applicant-detail-list grid gap-[8px]">
              {getTutorStudentDetailItems(student).map((item) => (
                <div
                  className="tutor-applicant-detail-item flex items-start justify-between gap-[12px]"
                  key={item.label}
                >
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          }
          detailTitle={student.tutor_certification.real_name}
          footer={
            <>
              <button
                className="secondary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
                onClick={() => showMessage(`${student.tutor_certification.real_name} 的消息能力后续接入。`, { type: "warning" })}
                type="button"
              >
                <MessageCircle size={15} /> 消息
              </button>
              <button
                className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[var(--h5-muted)]"
                type="button"
              >
                <Heart size={15} /> 收藏学生
              </button>
            </>
          }
          icon={<GraduationCap size={18} style={{ color: getGenderIconColor(student.tutor_certification.gender) }} />}
          key={student.id}
          title={student.tutor_certification.real_name}
        >
          <div className="job-task-fields grid gap-[4px]">
            <div className="grid grid-cols-2 gap-[4px]">
              <span>
                <School size={14} />
                学校：{student.tutor_certification.school}
              </span>
              <span>
                <BookOpen size={14} />
                专业：{student.tutor_certification.major}
              </span>
            </div>
            <span>
              <Tags size={14} />
              学科：{formatTutorSubjectLabels(student.tutor_certification.subject)}
            </span>
          </div>
        </TutorCard>
      ))}
      {visibleTutorStudents.length === 0 ? (
        <article className="empty-state p-[16px] text-center">
          <strong>暂无匹配学生</strong>
          <span>换个学校或学科再试试。</span>
        </article>
      ) : null}
    </section>
  );
}
