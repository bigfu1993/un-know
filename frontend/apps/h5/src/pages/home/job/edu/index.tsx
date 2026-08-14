import "./index.less";
import { DemandCard } from "./components/DemandCard";
import { ListFilters } from "./components/ListFilters";
import { parseTutorSubjects } from "@shared/tutorModel";

/** 家教卡片可能匹配的学校来源。 */
function getTutorDemandSchools(demand: TutorDemand) {
  return Array.from(
    new Set(
      [demand.school, ...demand.applicants.map((applicant) => applicant.school)]
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

/** 根据可用时间文本粗略折算可兼职时长，优先使用真实日期和时间段数量。 */
function getAvailabilityScore(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return 0;
  }

  const dateCount = normalizedValue.match(/\d{4}-\d{2}-\d{2}/g)?.length ?? 0;
  const timeRangeCount = normalizedValue.match(/\d{1,2}:\d{2}\s*(?:-|~|至)\s*\d{1,2}:\d{2}/g)?.length ?? 0;

  if (dateCount || timeRangeCount) {
    return dateCount * 3 + timeRangeCount;
  }

  if (/长期|全周|每天|随时/.test(normalizedValue)) {
    return 10;
  }
  if (/周末|工作日|上午|下午|晚上/.test(normalizedValue)) {
    return 4;
  }

  return 1;
}

/** 家教需求的最高受聘次数，来自真实申请人字段。 */
function getTutorDemandHiredScore(demand: TutorDemand) {
  return Math.max(0, ...demand.applicants.map((applicant) => applicant.hiredTimes));
}

/** 家教需求的可兼职时长分值，来自真实申请人可用时间字段。 */
function getTutorDemandDurationScore(demand: TutorDemand) {
  const applicantScore = demand.applicants.reduce((sum, applicant) => sum + getAvailabilityScore(applicant.availability), 0);

  return demand.availableDuration ?? (applicantScore || getAvailabilityScore(demand.period ?? ""));
}

/** 存在真实排序分值时按分值降序，否则保持服务端稳定顺序。 */
function sortTutorDemandsByScore(
  tutorDemands: TutorDemand[],
  getScore: (demand: TutorDemand) => number,
  getStableOrder: (demand: TutorDemand) => number
) {
  if (!tutorDemands.some((demand) => getScore(demand) > 0)) {
    return tutorDemands;
  }

  return [...tutorDemands].sort(
    (left, right) => getScore(right) - getScore(left) || getStableOrder(left) - getStableOrder(right)
  );
}

/** 按筛选条件和排序条件生成家教可见列表。 */
function getVisibleTutorDemands(
  tutorDemands: TutorDemand[],
  selectedSchool: string,
  selectedSubject: string,
  tutorSort: TutorSort
) {
  const filteredDemands = tutorDemands.filter((demand) => {
    const schoolMatched = selectedSchool ? getTutorDemandSchools(demand).includes(selectedSchool) : true;
    const subjectMatched = selectedSubject ? parseTutorSubjects(demand.subject).includes(selectedSubject) : true;

    return schoolMatched && subjectMatched;
  });
  const originalIndexes = new Map(filteredDemands.map((demand, index) => [demand.id, index]));
  const getStableOrder = (demand: TutorDemand) => originalIndexes.get(demand.id) ?? 0;

  if (tutorSort === "recommended") {
    return sortTutorDemandsByScore(filteredDemands, (demand) => demand.recommendationScore ?? 0, getStableOrder);
  }
  if (tutorSort === "favorite") {
    return sortTutorDemandsByScore(filteredDemands, (demand) => demand.favoriteCount ?? 0, getStableOrder);
  }
  if (tutorSort === "goodReview") {
    return sortTutorDemandsByScore(filteredDemands, (demand) => demand.goodReviewCount ?? 0, getStableOrder);
  }
  if (tutorSort === "hired") {
    return sortTutorDemandsByScore(filteredDemands, getTutorDemandHiredScore, getStableOrder);
  }
  if (tutorSort === "duration") {
    return sortTutorDemandsByScore(filteredDemands, getTutorDemandDurationScore, getStableOrder);
  }

  return filteredDemands;
}

/** 家长家教招募页面，维护家教需求卡片的排序状态。 */
export function Tutor({ tutorDemands }: { tutorDemands: TutorDemand[] }) {
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [tutorSort, setTutorSort] = useState<TutorSort>("recommended");
  const tutorStudentDemands = useMemo(
    () => tutorDemands.filter((demand) => demand.sourceType !== "tutorDemand"),
    [tutorDemands]
  );
  const visibleTutorStudents = useMemo(
    () => getVisibleTutorDemands(tutorStudentDemands, selectedSchool, selectedSubject, tutorSort),
    [selectedSchool, selectedSubject, tutorSort, tutorStudentDemands]
  );
  return (
    <section className="module-stack tutor-list-page grid gap-[10px]">
      <SectionHeader countText={`${visibleTutorStudents.length} 个学生`} title="家教招募" />

      <ListFilters
        demands={tutorStudentDemands}
        onSchoolChange={setSelectedSchool}
        onSortChange={setTutorSort}
        onSubjectChange={setSelectedSubject}
        selectedSchool={selectedSchool}
        selectedSort={tutorSort}
        selectedSubject={selectedSubject}
      />

      {visibleTutorStudents.map((demand) => (
        <DemandCard demand={demand} key={demand.id} />
      ))}
      {visibleTutorStudents.length === 0 ? (
        <article className="empty-state p-[16px] text-center">
          <strong>暂无匹配学生</strong>
          <span>换个学校、学科或排序方式再试试。</span>
        </article>
      ) : null}
    </section>
  );
}
