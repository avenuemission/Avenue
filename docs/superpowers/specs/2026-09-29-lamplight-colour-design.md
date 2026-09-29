# Lamplight colour and Streetlights rows

Date: 29 Sep 2026. Status: approved design (mockup draft 2, version B1 with Vision rows).
Mockup: https://claude.ai/artifact/EXC9yHEg51zhzAmnLn1JMU

## Goal

Make the main public pages match the night scenes (navy houses, amber light) and remove the purple.
Replace the big solid pill buttons on Streetlights with the row panels used on the Vision page.

## Decisions (Henry, 29 Sep)

| Question | Choice |
|---|---|
| Colour direction | B1: night + lamp. Blue stays for section labels and hovers. Amber for countdown digits and one main action per section. |
| Streetlights buttons | Vision rows: dark panel, thin border, bold uppercase title, muted subtitle, arrow on the right, two columns |
| Purple-tinted background photos | Leave as they are |

## Palette roles

| Role | Colour | Where |
|---|---|---|
| Section labels (`.eyebrow`) | `--accent` #4f7cff, unchanged | All main pages |
| Hover accent on rows and navy buttons | `--accent` border, arrow turns blue | Rows, navy pills |
| Main action, one per section | `--lamp` #ffc56b fill, dark text | Landing "Explore", Tithe, Submit (event updates), Connect (pathway form), Become a Pathway Leader, form submits inside Streetlights popups, error page button |
| Secondary buttons | New `--house` #141b2a fill, `--border-strong` border, white text | Social buttons, Google Calendar, Local offering, Show map |
| Countdown digits (Intersection) | `--lamp` | CountdownTimer page variant |
| Pathways map "coming soon" | Dim amber (lamp at reduced opacity) instead of purple | Map markers, list label, info panel |

## Components

Three shared classes in `globals.css`, so pages stop repeating long class strings:

- `.btn-lamp`: amber pill, dark text, uppercase, hover brightens, visible focus ring.
- `.btn-night`: navy pill with border; hover border turns `--accent`.
- `.row-link`: the Vision row. Panel `--surface`, border `--border`, radius 12px, title uppercase bold, subtitle `--muted`, chevron right. Hover: border `--accent` at ~55%, panel `--surface-hover`, chevron nudges right and turns blue.

Streetlights Mission (4) and Creative (4) initiatives render as `.row-link` in a two-column grid (one column under ~420px), max width about 560px, centred. Buttons that open popups (Mission initiatives, Homebound) keep their popup behaviour; only the trigger's look changes.

## Scope

In: landing, Vision, Pathways, Intersection, Streetlights, the shared site components they use (StayConnected, EventUpdatesForm, CountdownTimer page variant, PathwayMap, CalendarPopup, MissionInitiatives, HomeboundAlbum), site error page.

Out this round: APEST quiz and Technological Stewardship survey pages (their own blue theme), leader pages, login, navbar countdown pill, background photos, night scenes.

## Behaviour

No behaviour changes. Same links, same popups, same forms, same text. Only colour and button shape.

## Testing

- New test: public site files (`src/app/(site)`, `src/components/site`) contain no `purple` classes and no solid `bg-[var(--accent)]` pill fills.
- All existing gates: vitest, tsc, lint, knip, build, guard clean.
- Browser check at 375 px and 1440 px: Streetlights rows, hover states, Intersection countdown and buttons, Pathways form and map list, landing CTA. Contrast of dark text on amber checked.
