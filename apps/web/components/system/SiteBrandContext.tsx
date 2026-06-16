"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SiteBrandKey } from "../../lib/site-brand";

const SiteBrandContext = createContext<SiteBrandKey>("public");

export function SiteBrandProvider({
  brandKey,
  children,
}: {
  brandKey: SiteBrandKey;
  children: ReactNode;
}) {
  return (
    <SiteBrandContext.Provider value={brandKey}>
      {children}
    </SiteBrandContext.Provider>
  );
}

export function useSiteBrandKey() {
  return useContext(SiteBrandContext);
}
