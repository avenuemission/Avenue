import type { Metadata } from "next";
import { pageMetadata } from "@/lib/domain/pageMeta";

export const metadata: Metadata = pageMetadata("/vision");

export default function VisionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
