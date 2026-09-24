"use client";

import { useState, type ReactNode } from "react";
import Disclosure from "@/components/ui/Disclosure";
import Reveal from "@/components/ui/Reveal";

export interface DisclosureItem {
  question: string;
  answer: ReactNode;
  /** Reveal stagger in ms. */
  delay: number;
}

// An accordion: at most one item open at a time.
export default function DisclosureGroup({ items }: { items: DisclosureItem[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return items.map((item) => (
    <Reveal key={item.question} delay={item.delay}>
      <Disclosure
        question={item.question}
        isExpanded={open === item.question}
        onToggle={() => setOpen(open === item.question ? null : item.question)}
      >
        {item.answer}
      </Disclosure>
    </Reveal>
  ));
}
