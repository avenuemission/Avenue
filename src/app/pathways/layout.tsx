import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pathways - Avenue Mission",
  description: "Join or start a Pathway group. Pathway groups are house church communities growing together, empowered by the Spirit of God. Find a group near you in Melbourne.",
};

export default function PathwaysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
