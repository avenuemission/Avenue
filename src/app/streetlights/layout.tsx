import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Streetlights - Avenue Mission",
  description: "Streetlights are Avenue's mission and creative initiatives. Discover our worship music, community projects, and ways to get involved in serving others.",
};

export default function StreetlightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
