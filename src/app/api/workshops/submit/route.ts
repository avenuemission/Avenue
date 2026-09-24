import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { allow, RATE } from "@/lib/server/rateLimit";
import { clientIp } from "@/lib/server/clientIp";
import { jsonError, serverError, tooMany } from "@/lib/server/http";
import { parseSurveySubmission } from "@/lib/domain/workshops/survey";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid request");
  }

  const parsed = parseSurveySubmission(body);
  if (!parsed.ok) return jsonError(400, parsed.error);
  const { sessionCode, answers: surveyData } = parsed.value;

  // allow() throws if the limiter itself is down: a JSON 500, never a
  // bodyless one and never an unlimited submit.
  try {
    if (!(await allow(RATE.workshopSubmit, clientIp(request)))) return tooMany();
  } catch (error) {
    return serverError("workshops/submit rate limit", error);
  }

  const { error } = await getSupabaseAdmin().from("survey_responses").insert({
    session_code: sessionCode,
    age_range: surveyData.ageRange,
    is_christian: surveyData.isChristian,
    denomination: surveyData.denomination,
    role: surveyData.role,
    tech_comfort: surveyData.techComfort,
    ai_tools: Array.isArray(surveyData.aiTools) ? surveyData.aiTools.join(", ") : surveyData.aiTools,
    personal_spiritual_use: surveyData.personalSpiritualUse,
    faith_impact: surveyData.faithImpact,
    decision_dependency: surveyData.decisionDependency,
    personal_off_limits: surveyData.personalOffLimits,
    off_limits_uses: Array.isArray(surveyData.offLimitsUses) ? surveyData.offLimitsUses.join(", ") : surveyData.offLimitsUses,
    idolatry_potential: surveyData.idolatryPotential,
    neighbour_principle: surveyData.neighbourPrinciple,
    church_sermon_prep: surveyData.churchSermonPrep,
    church_social_media: surveyData.churchSocialMedia,
    church_website: surveyData.churchWebsite,
    church_operations: surveyData.churchOperations,
    church_disclosure: surveyData.churchDisclosure,
    church_has_position: surveyData.churchHasPosition,
    who_should_lead: Array.isArray(surveyData.whoShouldLead) ? surveyData.whoShouldLead.join(", ") : surveyData.whoShouldLead,
    formal_policy: surveyData.formalPolicy,
    unemployment_concern: surveyData.unemploymentConcern,
    surveillance_resistance: surveyData.surveillanceResistance,
    eschatological_significance: surveyData.eschatologicalSignificance,
    tegmark_rank_dictatorship: surveyData.tegmarkRankDictatorship,
    tegmark_rank_enslaved: surveyData.tegmarkRankEnslaved,
    tegmark_rank_gatekeeper: surveyData.tegmarkRankGatekeeper,
    tegmark_rank_zookeeper: surveyData.tegmarkRankZookeeper,
    tegmark_rank_libertarian: surveyData.tegmarkRankLibertarian,
    tegmark_rank_egalitarian: surveyData.tegmarkRankEgalitarian,
    tegmark_rank_protector: surveyData.tegmarkRankProtector,
    final_vision: surveyData.finalVision,
  });

  if (error) {
    return serverError("workshops/submit", error);
  }

  return NextResponse.json({ success: true });
}
