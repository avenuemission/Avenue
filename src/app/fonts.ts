import { Newsreader } from "next/font/google";

// The serif for phase titles, big questions and scripture (Avenue at night).
// Only the leader pages and /login use it, so only their layouts apply the
// variable and only those routes download it. Every use is weight 400
// (normal and italic), but next/font only allows the opsz axis on the full
// variable weight range, and dropping opsz would change the letter shapes.
export const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});
