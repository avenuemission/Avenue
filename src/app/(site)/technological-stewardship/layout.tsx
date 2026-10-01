import type { Metadata } from "next";
import { pageMetadata } from "@/lib/domain/pageMeta";

export const metadata: Metadata = pageMetadata("/technological-stewardship");

export default function TechnologicalStewardshipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
