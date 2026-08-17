/**
 * 对外入口：实现已迁移到 ./CalendarPanel，这里只保留引用，
 * 保持 @components/ScheduleCalendar 这个导入路径和既有导出名不变。
 */
export {
  CalendarPanel as ScheduleCalendar,
  type CalendarPanelMode as ScheduleCalendarMode,
  type CalendarPanelProps as ScheduleCalendarProps
} from "./CalendarPanel";
