import {
  commissionSortOptions,
  getCommissionArea,
  getCommissionDestination,
  getCommissionTimeWeight,
  isCommissionListVisible,
  type CommissionSortMode,
  type CommissionToolbarPanel
} from "@pages/home/commission/model";

/** 委托列表筛选、排序和工具面板状态。 */
export function useCommissionList(tasks: HuntingTask[]) {
  const [keyword, setKeyword] = useState("");
  const [activePanel, setActivePanel] = useState<CommissionToolbarPanel>(null);
  const [selectedArea, setSelectedArea] = useState("");
  const [sortMode, setSortMode] = useState<CommissionSortMode>("default");
  const displayTasks = useMemo(() => tasks, [tasks]);
  const listTasks = useMemo(() => displayTasks.filter(isCommissionListVisible), [displayTasks]);
  const areaOptions = useMemo(
    () => Array.from(new Set(listTasks.map((task) => getCommissionArea(getCommissionDestination(task))))),
    [listTasks]
  );
  const visibleTasks = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const filteredTasks = listTasks.filter((task) => {
      const titleMatched = normalizedKeyword ? task.title.toLowerCase().includes(normalizedKeyword) : true;
      const areaMatched = selectedArea ? getCommissionArea(getCommissionDestination(task)) === selectedArea : true;

      return titleMatched && areaMatched;
    });

    return [...filteredTasks].sort((leftTask, rightTask) => {
      if (sortMode === "time") {
        return getCommissionTimeWeight(leftTask.latestTime) - getCommissionTimeWeight(rightTask.latestTime);
      }
      if (sortMode === "amountDesc") {
        return rightTask.fee - leftTask.fee;
      }
      if (sortMode === "amountAsc") {
        return leftTask.fee - rightTask.fee;
      }

      return 0;
    });
  }, [listTasks, keyword, selectedArea, sortMode]);
  const selectedSortLabel =
    commissionSortOptions.find((option) => option.value === sortMode)?.label ?? "默认排序";

  return {
    activePanel,
    areaOptions,
    displayTasks,
    keyword,
    selectedArea,
    selectedSortLabel,
    setActivePanel,
    setKeyword,
    setSelectedArea,
    setSortMode,
    sortMode,
    visibleTasks
  };
}
