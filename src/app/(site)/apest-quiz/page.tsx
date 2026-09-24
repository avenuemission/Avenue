import ApestQuiz from "./_components/ApestQuiz";

export const revalidate = 300;

// The quiz is interactive from start to finish, so it is one client island.
export default function ApestQuizPage() {
  return <ApestQuiz />;
}
