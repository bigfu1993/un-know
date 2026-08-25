import "./index.less";
import { MessageCircle } from "lucide-react";
import { TutorCard } from "./components/TutorCard";
import { ListFilters } from "./components/ListFilters";
import { parseTutorSubjects } from "@shared/tutorModel";

/** 按学校、学科筛选认证学生列表；列表顺序沿用服务端信用分排序，不做前端二次排序。 */
function getVisibleTutors(students: TutorCertifiedStudent[], selectedSchool: string, selectedSubject: string) {
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

/** 家长家教招募页面，浏览已认证并开启家教开关的学生档案。 */
export function Tutor({ students }: { students: TutorCertifiedStudent[] }) {
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const visibleTutors = useMemo(
    () => getVisibleTutors(students, selectedSchool, selectedSubject),
    [selectedSchool, selectedSubject, students]
  );
  return (
    <section className="module-stack tutor-list-page grid gap-[10px]">
      <SectionHeader countText={`${visibleTutors.length} 个学生`} title="家教招募" />

      <ListFilters
        onSchoolChange={setSelectedSchool}
        onSubjectChange={setSelectedSubject}
        selectedSchool={selectedSchool}
        selectedSubject={selectedSubject}
        students={students}
      />

      {visibleTutors.map((tutor) => (
        <TutorCard
          footer={
            <>
              <button
                className="secondary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
                onClick={() => showMessage(`${tutor.tutor_certification.real_name} 的消息能力后续接入。`, { type: "warning" })}
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
          icon={<GraduationCap size={18} style={{ color: getGenderIconColor(tutor.tutor_certification.gender) }} />}
          key={tutor.id}
          title={tutor.tutor_certification.real_name}
          tutor={{
            age: tutor.tutor_certification.age,
            certificate: tutor.tutor_certification.certificate,
            education: tutor.tutor_certification.education,
            gender: tutor.tutor_certification.gender,
            gpa: tutor.tutor_certification.gpa,
            idCard: tutor.tutor_certification.id_card,
            major: tutor.tutor_certification.major,
            nativePlace: tutor.tutor_certification.native_place,
            nickname: tutor.nickname,
            phone: tutor.phone,
            realName: tutor.tutor_certification.real_name,
            school: tutor.tutor_certification.school,
            subject: tutor.tutor_certification.subject,
            xuexinScreenshot: tutor.tutor_certification.xuexin_screenshot
          }}
        />
      ))}
      {visibleTutors.length === 0 ? (
        <article className="empty-state p-[16px] text-center">
          <strong>暂无匹配学生</strong>
          <span>换个学校或学科再试试。</span>
        </article>
      ) : null}
    </section>
  );
}
