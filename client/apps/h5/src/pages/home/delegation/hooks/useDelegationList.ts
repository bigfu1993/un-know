import {
  delegationSortOptions,
  getDelegationArea,
  getDelegationDestination,
  getDelegationTimeWeight,
  isDelegationListVisible,
  type DelegationSortMode,
  type DelegationToolbarPanel
} from "@pages/home/delegation/model";

/** 委托列表筛选、排序和工具面板状态。 */
export function useDelegationList(tasks: HuntingTask[]) {
  const [keyword, setKeyword] = useState("");
  const [activePanel, setActivePanel] = useState<DelegationToolbarPanel>(null);
  const [selectedArea, setSelectedArea] = useState("");
  const [sortMode, setSortMode] = useState<DelegationSortMode>("default");
  const displayTasks = useMemo(() => tasks, [tasks]);
  const listTasks = useMemo(() => displayTasks.filter(isDelegationListVisible), [displayTasks]);
  const areaOptions = useMemo(
    () => Array.from(new Set(listTasks.map((task) => getDelegationArea(getDelegationDestination(task))))),
    [listTasks]
  );
  const visibleTasks = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const filteredTasks = listTasks.filter((task) => {
      const titleMatched = normalizedKeyword ? task.title.toLowerCase().includes(normalizedKeyword) : true;
      const areaMatched = selectedArea ? getDelegationArea(getDelegationDestination(task)) === selectedArea : true;

      return titleMatched && areaMatched;
    });

    return [...filteredTasks].sort((leftTask, rightTask) => {
      if (sortMode === "time") {
        return getDelegationTimeWeight(leftTask.latestTime) - getDelegationTimeWeight(rightTask.latestTime);
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
    delegationSortOptions.find((option) => option.value === sortMode)?.label ?? "默认排序";

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
