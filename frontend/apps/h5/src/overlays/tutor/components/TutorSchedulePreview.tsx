/** 家教时间只读预览弹窗属性。 */
interface TutorSchedulePreviewProps extends TutorSchedulePreviewState {
  onClose: () => void;
}

/** 合并同一申请子任务下的多阶段日程，供只读日历统一展示。 */
function getTutorSchedulePreviewCalendarItems(sections: TutorSchedulePreviewSection[]): TrialScheduleCalendarItem[] {
  const itemMap = new Map<
    string,
    {
      date: string;
      periodLabels: Partial<Record<TrialScheduleCalendarPeriod, string>>;
      periods: Set<TrialScheduleCalendarPeriod>;
    }
  >();

  sections.forEach((section) => {
    const scheduleValue = getTrialScheduleValueFromSummary(section.summary);
    if (!scheduleValue) {
      return;
    }

    getTrialScheduleCalendarItems(scheduleValue.selectedDates, scheduleValue.scheduleDraft, {
      scheduleLabel: section.label,
      showPeriodLabel: section.showScheduleLabel
    }).forEach((scheduleItem) => {
      const item = itemMap.get(scheduleItem.date) ?? {
        date: scheduleItem.date,
        periodLabels: {},
        periods: new Set<TrialScheduleCalendarPeriod>()
      };

      scheduleItem.periods.forEach((period) => item.periods.add(period as TrialScheduleCalendarPeriod));
      item.periodLabels = {
        ...item.periodLabels,
        ...scheduleItem.periodLabels
      };
      itemMap.set(scheduleItem.date, item);
    });
  });

  return [...itemMap.values()]
    .map((item) => ({
      date: item.date,
      periodLabels: item.periodLabels,
      periods: [...item.periods]
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

/** 获取当前日期下各阶段的具体时间。 */
function getTutorSchedulePreviewActiveSections(
  sections: TutorSchedulePreviewSection[],
  activeDate: string | undefined
) {
  if (!activeDate) {
    return [];
  }

  return sections
    .map((section) => {
      const scheduleValue = getTrialScheduleValueFromSummary(section.summary);
      const times = scheduleValue ? getEnabledPeriodSummaries(scheduleValue.scheduleDraft[activeDate]) : [];

      return {
        ...section,
        times
      };
    })
    .filter((section) => section.times.length > 0);
}

/** 家教时间只读弹窗，卡片只保留入口按钮，具体时间在日历内查看。 */
export function TutorSchedulePreview({ emptyLabel, onClose, sections, subtitle, summary, title }: TutorSchedulePreviewProps) {
  const scheduleItems = useMemo(() => getTutorSchedulePreviewCalendarItems(sections), [sections]);
  const selectedDates = useMemo(() => scheduleItems.map((scheduleItem) => scheduleItem.date), [scheduleItems]);
  const defaultActiveDate = getDefaultTutorScheduleDate(selectedDates) || undefined;
  const [activeDate, setActiveDate] = useState<string | undefined>(() => defaultActiveDate);
  const activeDateSections = getTutorSchedulePreviewActiveSections(sections, activeDate);

  /** 切换预览对象时同步默认查看日期。 */
  useEffect(() => {
    setActiveDate(defaultActiveDate);
  }, [defaultActiveDate, summary]);

  return (
    <Modal
      ariaLabel={title}
      icon={<CalendarClock size={18} />}
      onClose={onClose}
      panelClassName="tutor-schedule-preview-panel mx-auto grid max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
      title={
        <>
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </>
      }
    >
      {scheduleItems.length > 0 ? (
        <div className="tutor-schedule-preview-body grid gap-[12px] overflow-auto pr-[2px]">
          <TrialScheduleCalendar
            activeDate={activeDate}
            initialDate={selectedDates[0]}
            maxSelectedDates={null}
            mode="view"
            onActiveDateChange={setActiveDate}
            scheduleItems={scheduleItems}
            selectedDates={selectedDates}
          />
          <div className="tutor-schedule-preview-detail grid gap-[6px]">
            <strong>{activeDate ? formatTrialScheduleDate(activeDate) : "请选择日期"}</strong>
            {activeDateSections.length > 0 ? (
              activeDateSections.map((section) => (
                <span key={section.title}>
                  {section.title}：{section.times.join(" ")}
                </span>
              ))
            ) : (
              <span>当日暂无安排</span>
            )}
          </div>
        </div>
      ) : (
        <article className="empty-state p-[14px] text-center">
          <strong>{emptyLabel}</strong>
          <span>当前记录未返回可查看的时间数据。</span>
        </article>
      )}

      <button className="primary-button min-h-[38px] px-[10px] py-[8px] text-white" onClick={onClose} type="button">
        关闭
      </button>
    </Modal>
  );
}
