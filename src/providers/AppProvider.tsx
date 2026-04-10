"use client";

import { ThemeProvider } from "./ThemeProvider";
import { SourceProvider } from "./SourceProvider";
import type { ReactNode } from "react";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SourceProvider>{children}</SourceProvider>
    </ThemeProvider>
  );
}
