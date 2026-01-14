import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vision - Avenue Mission",
  description: "Discover Avenue's vision, mission, values, and beliefs. We are a decentralised movement of people following Jesus, growing disciples through house church communities.",
};

export default function VisionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
