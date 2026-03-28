"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const AnnounceContext = createContext<(msg: string) => void>(() => {});

export function useAnnounce() {
  return useContext(AnnounceContext);
}

export function AnnounceProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");

  const announce = useCallback((msg: string) => {
    setMessage("");
    requestAnimationFrame(() => setMessage(msg));
  }, []);

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}
