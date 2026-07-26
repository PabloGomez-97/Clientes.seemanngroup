import { createContext, useContext } from "react";

/** Cuando un stack cliente va embebido bajo un header externo (portal ejecutivo). */
const EmbeddedChromeContext = createContext(false);

export function EmbeddedChromeProvider({
  children,
  embedded = true,
}: {
  children: React.ReactNode;
  embedded?: boolean;
}) {
  return (
    <EmbeddedChromeContext.Provider value={embedded}>
      {children}
    </EmbeddedChromeContext.Provider>
  );
}

export function useEmbeddedChrome(): boolean {
  return useContext(EmbeddedChromeContext);
}
