/** 全局弹层状态机的稳定初始状态。 */
export const initialOverlayState: OverlayState = {
  confirm: null,
  primary: null,
  secondary: null
};

/** 根据弹层命令生成下一份状态。 */
export function overlayReducer(state: OverlayState, action: OverlayAction): OverlayState {
  if (action.type === "open") {
    return {
      ...state,
      [action.entry.lane]: action.entry
    };
  }

  if (action.type === "closeAll") {
    return initialOverlayState;
  }

  const overlayTypes = action.type === "close" ? [action.overlayType] : action.overlayTypes;
  const nextState: OverlayState = {
    confirm: state.confirm && overlayTypes.includes(state.confirm.type) ? null : state.confirm,
    primary: state.primary && overlayTypes.includes(state.primary.type) ? null : state.primary,
    secondary: state.secondary && overlayTypes.includes(state.secondary.type) ? null : state.secondary
  };

  return nextState.confirm === state.confirm &&
    nextState.primary === state.primary &&
    nextState.secondary === state.secondary
    ? state
    : nextState;
}
