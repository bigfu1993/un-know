import { createGlobalStore, GlobalStoreContext } from "@h5/store/global";
import { useState } from "react";

export function GlobalStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createGlobalStore());

  return <GlobalStoreContext.Provider value={store}>{children}</GlobalStoreContext.Provider>;
}
