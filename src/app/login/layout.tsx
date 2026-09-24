import { newsreader } from "@/app/fonts";

// Applies the serif (Newsreader) to the sign-in page only. display: contents
// keeps the wrapper out of the layout.
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${newsreader.variable} contents`}>{children}</div>;
}
