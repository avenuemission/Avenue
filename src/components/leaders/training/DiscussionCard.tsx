import { DISCOVERY_QUESTIONS, type ModulePrompt } from "@/lib/domain/trainingContent";

// A static card under a training module or Calling section: a question to
// discuss (with an optional italic hint) and/or a Discovery Bible Reading
// passage, with the five discovery questions behind "How?". No input; the
// text comes from training_module_prompts.
export default function DiscussionCard({ prompt, className = "" }: { prompt: ModulePrompt | null; className?: string }) {
  if (!prompt || (!prompt.discussionQuestion && !prompt.passage)) return null;
  return (
    <aside className={`night-card space-y-4 p-5 ${className}`.trim()}>
      {prompt.discussionQuestion && (
        <div>
          <p className="night-label !text-[var(--lamp)]">Discuss</p>
          <p className="mt-1.5 font-semibold leading-snug text-[var(--ink)]">{prompt.discussionQuestion}</p>
          {prompt.hint && <p className="mt-1.5 text-sm italic leading-relaxed text-[var(--muted)]">{prompt.hint}</p>}
        </div>
      )}
      {prompt.passage && (
        <div className={prompt.discussionQuestion ? "border-t border-[var(--line)] pt-4" : ""}>
          <p className="night-label !text-[var(--lamp)]">Discovery Bible Reading</p>
          <p className="mt-1.5 text-[var(--ink)]">
            Do a Discovery Bible Reading with someone else on <strong className="font-semibold">{prompt.passage}</strong>.
          </p>
          <details className="group mt-2">
            <summary className="inline-flex min-h-[40px] cursor-pointer list-none items-center text-sm text-[var(--muted)] underline underline-offset-4 hover:text-white [&::-webkit-details-marker]:hidden">
              How?
            </summary>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-[var(--ink-2)] marker:text-[var(--lamp)]">
              {DISCOVERY_QUESTIONS.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          </details>
        </div>
      )}
    </aside>
  );
}
