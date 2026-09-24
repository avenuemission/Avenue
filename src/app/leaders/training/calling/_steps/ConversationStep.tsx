"use client";

import type { StepProps } from "@/components/leaders/journey/WizardShell";
import { OutcomeButton } from "@/components/leaders/journey/WizardShell";
import { isIsoDate, type CallingData } from "@/lib/domain/journey";
import { CONVERSATION_CONTENT } from "@/content/calling";

type Conversation = NonNullable<CallingData["conversation"]>;

// Section 6: book the theology and character conversation with a pastor.
// A checkbox and an optional date. The button is always enabled: the
// Calling Profile shows what is still to do.
export default function ConversationStep({ value, save, finish }: StepProps<Conversation>) {
  const booked = value?.booked === true;
  const date = isIsoDate(value?.date) ? value.date : "";

  const onDate = (next: string) => {
    if (next === "") {
      // Empty clears the date rather than saving an empty string.
      const rest: Conversation = { ...value };
      delete rest.date;
      save(rest);
    } else {
      save({ ...value, date: next });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">{CONVERSATION_CONTENT.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{CONVERSATION_CONTENT.body}</p>
      </div>

      <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] px-4 py-2">
        <input
          type="checkbox"
          checked={booked}
          onChange={(e) => save({ ...value, booked: e.target.checked })}
          className="h-5 w-5 accent-[var(--accent)]"
        />
        <span className="text-sm font-semibold text-white">{CONVERSATION_CONTENT.checkbox}</span>
      </label>

      <div>
        <label htmlFor="conversation-date" className="block text-sm font-semibold text-white">
          {CONVERSATION_CONTENT.dateLabel}
        </label>
        <input
          id="conversation-date"
          type="date"
          value={date}
          onChange={(e) => onDate(e.target.value)}
          className="mt-2 w-full sm:w-auto min-h-[44px] rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-base text-white"
        />
      </div>

      <OutcomeButton label="Show my Calling Profile" onClick={finish} />
    </div>
  );
}
