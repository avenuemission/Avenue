import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Intersection - Avenue Mission",
  description: "Intersection is where Avenue pathway groups come together for worship, prayer, and community events. Join us for Prayer & Praise and other gatherings.",
};

export default function IntersectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
