"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LeaderSessionContext, useLeaderSessionState } from "@/hooks/useLeaderSession";
import { newsreader } from "@/app/fonts";

// The one sign-in gate for every /leaders page: a signed-out visitor goes
// to /login, as each page did on its own before. It also checks
// /api/leader-access once per page load and hands both answers to the pages
// through LeaderSessionContext.
//
// It also applies the serif (Newsreader), which only leader pages and /login
// use; display: contents keeps the wrapper out of the layout.
//
// Children always render: each page keeps its own loading screen while the
// user is not yet known (session.user is null), exactly as before. Headers
// stay in the pages because they differ page to page (the dashboard, the
// wizards and the printable plan and profile each look different).
export default function LeadersLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, session } = useLeaderSessionState();

  useEffect(() => {
    if (user === null) router.push("/login");
  }, [user, router]);

  return (
    <div className={`${newsreader.variable} contents`}>
      <LeaderSessionContext.Provider value={session}>{children}</LeaderSessionContext.Provider>
    </div>
  );
}
