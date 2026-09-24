import StewardshipSurvey from "./_components/StewardshipSurvey";

export const revalidate = 300;

// The whole page is the survey (its thank-you screen replaces the hero too),
// so it is one client island.
export default function TechnologicalStewardshipPage() {
  return <StewardshipSurvey />;
}
