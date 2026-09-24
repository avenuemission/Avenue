// Not guarded with server-only: pure.
// Which emails each public form sends. The visitor copy (if any) goes only
// to the parsed address, or for leader support to the session address;
// the route decides that, this only builds the content.
import type { FormSubmission } from "@/lib/domain/forms";
import { isCustomSupportRequest } from "@/lib/domain/forms";
import { adminNotificationEmail } from "./admin";
import {
  eventUpdatesEmail,
  joinPathwayEmail,
  leaderSupportCustomEmail,
  leaderSupportEmail,
  startPathwayEmail,
} from "./confirmations";
import type { PublicEmail } from "./layout";

export interface FormEmails {
  admin: PublicEmail;
  confirmation: PublicEmail | null;
}

export function formEmails(form: FormSubmission, now: Date = new Date()): FormEmails {
  const { name, data } = form;
  const email = form.email ?? "Not provided";
  switch (form.type) {
    case "join-pathway":
      return {
        admin: adminNotificationEmail("Join Pathway Group", { name, phone: data.phone, group: data.group, email }, now),
        confirmation: form.email ? joinPathwayEmail(name, data.group) : null,
      };
    case "start-pathway":
      return {
        admin: adminNotificationEmail(
          "Start Pathway Group",
          { name, email, phone: data.phone ?? "", suburb: data.suburb ?? "" },
          now
        ),
        confirmation: form.email ? startPathwayEmail(name, data.suburb ?? "") : null,
      };
    case "event-updates":
      return {
        admin: adminNotificationEmail("Event Updates Signup", { name, email }, now),
        confirmation: form.email ? eventUpdatesEmail() : null,
      };
    case "idea-submission":
      return {
        admin: adminNotificationEmail("Idea Submission", { name, email, idea: data.idea }, now),
        confirmation: null,
      };
    case "mission-support":
      return {
        admin: adminNotificationEmail(
          "Philippines Mission Trip - Support Interest",
          {
            name,
            email,
            "Support Type": data.supportType === "time" ? "Volunteering Time" : "Contributing Resources",
            message: data.message?.trim() || "No additional message",
          },
          now
        ),
        confirmation: null,
      };
    case "leader-support":
      if (isCustomSupportRequest(data)) {
        return {
          admin: adminNotificationEmail(
            "Leader Support - Custom Time Request",
            { leader: name, email, "Requested Date": data.requestedDate, "Requested Time": data.requestedTime },
            now
          ),
          confirmation: form.email ? leaderSupportCustomEmail(name, data.requestedDate, data.requestedTime) : null,
        };
      }
      return {
        admin: adminNotificationEmail(
          "Leader Support Call Booking",
          { leader: name, email, "Scheduled Time": data.formattedDate },
          now
        ),
        confirmation: form.email ? leaderSupportEmail(name, data.formattedDate) : null,
      };
  }
}
