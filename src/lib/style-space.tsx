import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type StyleSpace = "her" | "him";

type StyleSpaceContextValue = {
  space: StyleSpace;
  setSpace: (space: StyleSpace) => void;
};

const StyleSpaceContext = createContext<StyleSpaceContextValue | null>(null);

export function StyleSpaceProvider({ children }: { children: ReactNode }) {
  const [space, setSpaceState] = useState<StyleSpace>("her");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("offfeed-style-space");
    if (saved === "her" || saved === "him") setSpaceState(saved);
    setHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset["styleSpace"] = space;
    if (hydrated) window.localStorage.setItem("offfeed-style-space", space);
  }, [space, hydrated]);

  const setSpace = (nextSpace: StyleSpace) => setSpaceState(nextSpace);
  return <StyleSpaceContext.Provider value={{ space, setSpace }}>{children}</StyleSpaceContext.Provider>;
}

export function useStyleSpace() {
  const value = useContext(StyleSpaceContext);
  if (!value) throw new Error("useStyleSpace must be used within StyleSpaceProvider");
  return value;
}