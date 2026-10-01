import type { Metadata } from "next";
import { pageMetadata } from "@/lib/domain/pageMeta";

export const metadata: Metadata = pageMetadata("/pathways");

export default function PathwaysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
