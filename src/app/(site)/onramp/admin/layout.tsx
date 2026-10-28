import type { Metadata } from "next";

// The On-Ramp admin page sits behind the admin passcode; keep it out of
// search results too.
export const metadata: Metadata = {
  title: "On-Ramp sign-ups - Avenue Mission",
  robots: { index: false, follow: false },
};

export default function OnrampAdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
