import { getTutorSubjectLabel, parseTutorSubjects } from "@shared/tutorModel";

/** 获取家教日历使用的日期字符串。 */
export function getTutorDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/** 获取家教日历使用的月份字符串。 */
export function getTutorMonthKey(date: Date) {
  return getTutorDateKey(date).slice(0, 7);
}

/** 日程/日历每次打开时统一查看当天，业务日期集合只负责回显，不改变初始焦点。 */
export function getDefaultTutorScheduleDate() {
  return getTutorDateKey(new Date());
}

/** 生成指定月份的家教日历网格。 */
export function getTutorCalendarCells(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const totalDays = new Date(year, month, 0).getDate();
  const leadingEmptyCells = firstDay.getDay();
  const emptyCells = Array.from({ length: leadingEmptyCells }, () => null);
  const dayCells = Array.from({ length: totalDays }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");

    return `${monthKey}-${day}`;
  });

  return [...emptyCells, ...dayCells];
}

/** 根据当前家教学科生成课程日历展示任务，后续可替换为后端课程接口。 */
export function getTutorCalendarTasks(profileDraft: ProfileDraftState): TutorCalendarTask[] {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const thirdDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);
  const subjectKey = parseTutorSubjects(profileDraft.tutorSubject)[0] ?? TutorSubject.Math;
  const subject = getTutorSubjectLabel(subjectKey);

  return [
    {
      date: getTutorDateKey(today),
      duration: "2小时",
      id: "today-am",
      location: "常用区域附近",
      period: "am",
      subject,
      time: "09:00-11:00",
      title: "一对一家教"
    },
    {
      date: getTutorDateKey(tomorrow),
      duration: "1.5小时",
      id: "tomorrow-pm",
      location: "学生家中",
      period: "pm",
      subject,
      time: "15:00-16:30",
      title: "课后辅导"
    },
    {
      date: getTutorDateKey(thirdDay),
      duration: "2小时",
      id: "third-day-pm",
      location: "线上课程",
      period: "pm",
      subject,
      time: "19:00-21:00",
      title: "阶段复习"
    }
  ];
}
