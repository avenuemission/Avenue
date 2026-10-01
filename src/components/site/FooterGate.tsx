"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

// Hides the footer on the home page, which is exactly one screen with no
// scroll. Every other public page shows it.
export default function FooterGate({ children }: { children: ReactNode }) {
  return usePathname() === "/" ? null : children;
}
