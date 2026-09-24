"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

// Renders a modal at the end of <body>, clear of any transformed or
// stacked ancestor (Reveal's transform, a section's z-index), so `fixed`
// really covers the viewport. Mount it only once the modal opens, in the
// browser.
export default function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
