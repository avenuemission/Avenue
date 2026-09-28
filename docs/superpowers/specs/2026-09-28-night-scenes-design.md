# Night scenes for the four public pages: design and build plan

**Date:** 2026-09-28 (Melbourne) · **Branch:** `feat/night-scenes` (from `main`) · **Approved by Henry:** draft 3
**Mockup (source of truth for geometry, timing and copy):** `docs/design/night-scenes-mockup.html` (published at https://claude.ai/artifact/VwCDFigk4PAWb8FkKyuBDC)

## Goal

The section below the photo carousel on Vision, Pathways, Intersection and Streetlights gets a small animated night scene in the same style as the leader journey (dark ground, lamp amber `#ffc56b`, soft glows), next to short explainer copy. All four are views of one "Avenue at night" world.

## Decisions (Henry)

| Question | Answer |
|---|---|
| World | One connected Avenue world; Vision is the overview, the others zoom in |
| Centre on Vision | A light only, no word or cross |
| Motion | Builds once when scrolled into view, then gently breathes |
| Pathways placement | New section right after the carousel, before the three stats |
| Vision | Bird's-eye suburb: street grid, rooftops, a park, the light at the main crossroads; homes light, lamps spread, light meets at crossings then flows back to the centre |
| Pathways | People stroll to one home, windows light, then two people are sent out and the houses either side light up |
| Intersection | Crossroads from above; light from four homes at the street ends meets and blooms in the middle |
| Streetlights | Side view; from a lit home, four lamps switch on one by one, revealing people beneath |
| Copy | As in the mockup (light edits allowed later) |

## Design

- **Components:** `src/components/site/scenes/` with one server component per scene (`VisionScene`, `PathwaysScene`, `IntersectionScene`, `StreetlightsScene`) that renders the finished SVG markup on the server, plus one small client wrapper `SceneStage` that adds the `play` class when 35% of the scene is in view (IntersectionObserver), starts any SMIL `animateMotion` (Vision's light following the streets), and shows the finished picture with no motion for `prefers-reduced-motion`. No Replay button on the site.
- **Pure geometry:** `src/lib/domain/scenes/` builds the Vision suburb (street lines, rooftops from a fixed seed, homes, lamps, meeting points, pulse paths) and star fields as plain data, unit tested (deterministic output, nothing overlaps a street, every pulse path starts at a home or meeting point and ends at a meeting point or the centre).
- **Styles:** scene animation classes (`fade`, `glow`, `lit`, `walk`, `travel`, `grow`, `breathe`) in `globals.css` under a `.scene` scope, exactly as in the mockup, including the reduced-motion end state.
- **Pages:** Vision replaces the orbit image and its text with the scene and the new copy, keeping the three pill links. Pathways gains a new section after the carousel. Intersection replaces the diagram image and its text. Streetlights replaces the text-only description section. Layout: scene left, copy right on desktop; stacked on phones (scene first). Uses the existing `Section`/`Reveal` patterns and heading classes.
- **Accessibility:** each SVG has `role="img"` and an `aria-label` describing the scene; copy is real text.
- **Cleanup:** delete `public/images/vision_avenue_orbit.png` and `public/images/intersection_diagram.png` once unused (no absolute-URL references exist).
- **Performance:** SVG is server-rendered (no image download, visible at first paint); the client wrapper is tiny; CSP needs no change.

## Build plan (one implementer, one review, controller browser check)

1. Pure geometry module plus tests (TDD).
2. `SceneStage` client wrapper plus a test for the reduced-motion and play logic where testable.
3. The four scene components, porting the mockup's SVG exactly (same coordinates, delays and durations).
4. Wire into the four pages with the mockup copy; delete the two old images.
5. Gates: tsc, tests, lint 0, knip 0, build; no em dashes.
6. Controller: screenshots of all four pages at 375 px and desktop, mid-animation and at rest, sent to Henry before any push.
