import type { Metadata } from "next";
import { pageMetadata } from "@/lib/domain/pageMeta";

export const metadata: Metadata = pageMetadata("/faq");

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
