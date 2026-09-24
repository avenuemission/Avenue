---
name: The Design System
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1b1b'
  surface-container: '#1f1f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c5c5d3'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#303030'
  outline: '#8f909d'
  outline-variant: '#444651'
  surface-tint: '#b6c4ff'
  primary: '#b6c4ff'
  on-primary: '#05297a'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#4059aa'
  secondary: '#b8c3ff'
  on-secondary: '#002388'
  secondary-container: '#0736ba'
  on-secondary-container: '#a1b1ff'
  tertiary: '#d1bcff'
  on-tertiary: '#3d008f'
  tertiary-container: '#5000b7'
  on-tertiary-container: '#ba9bff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#b8c3ff'
  on-secondary-fixed: '#001355'
  on-secondary-fixed-variant: '#0736ba'
  tertiary-fixed: '#eaddff'
  tertiary-fixed-dim: '#d1bcff'
  on-tertiary-fixed: '#24005b'
  on-tertiary-fixed-variant: '#5800c8'
  background: '#131313'
  on-background: '#e2e2e2'
  surface-variant: '#353535'
typography:
  h1:
    fontFamily: Helvetica
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.1em
  h2:
    fontFamily: Helvetica
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: 0.08em
  h3:
    fontFamily: Helvetica
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Helvetica
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.15em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  xxl: 96px
  gutter: 24px
  margin: 32px
---

## Brand & Style

This design system is built to evoke the vastness of the cosmos, mirroring the expansive mission of global church leadership. The aesthetic is "Cosmic Professional"—a blend of high-tech Glassmorphism and deep, spiritual atmosphere. It positions the platform not just as a tool, but as a command center for a mission-driven life.

The visual style leverages **Glassmorphism** to create a sense of floating layers over the dark void of space. By using translucent surfaces, the interface feels lightweight and ethereal, yet grounded by high-precision typography and structured layouts. The emotional response is one of awe, clarity, and purpose, utilizing the "Earth from space" metaphor to represent a global perspective on local ministry.

## Colors

The palette is anchored in the deep obsidian of the `#000000` background, representing the infinite void. 

- **Primary (Deep Navy):** Used for structural depth and foundational containers.
- **Secondary (Bright Blue):** The color of light and action; used for primary interactions and the "blue shadow pulse" effect.
- **Tertiary (Electric Purple):** Used sparingly for high-level highlights and spiritual "spark" moments, often paired with Bright Blue in gradients.
- **Neutrals:** Gray 800 is used for subtle UI borders, while Gray 400 provides legibility for secondary metadata against the dark background.

Backgrounds should occasionally feature animated gradients transitioning slowly between Deep Navy and Electric Purple to simulate the shifting light of a nebula.

## Typography

This design system utilizes clean, neo-grotesque system fonts to maintain a professional, tech-forward tone. 

Headers are the primary brand expression: always **uppercase** with **increased tracking (letter-spacing)** to create an "expansive" feel that mimics aerospace interfaces. Body copy is set in Inter (or Helvetica fallback) for maximum readability against dark backgrounds, ensuring that complex theological or leadership training content remains accessible.

## Layout & Spacing

The layout philosophy is built on a **Fluid Grid** that allows content to feel breathable and "orbital." 

- **Generous Margins:** Content should never feel cramped; use `xl` and `xxl` spacing for sectional breaks to reinforce the "space" theme.
- **12-Column System:** Standard desktop layouts use a 12-column grid with a 24px gutter.
- **Floating Alignment:** Elements should often be centered or offset to create a sense of floating within the viewport.
- **Rhythm:** Vertical rhythm follows a 4px baseline, but large-scale components should prioritize visual breathing room over density.

## Elevation & Depth

Depth is not achieved through traditional drop shadows, but through **Glassmorphism** and luminosity.

1.  **The Void:** The base layer is `#000000`.
2.  **Translucent Layers:** UI containers use `backdrop-blur-xl` with a `white/10` background and a subtle `white/20` border. This creates the "glass" look.
3.  **Luminous Glow:** High-priority elements use a **Blue Shadow Pulse**. This is an outer glow (`0 0 20px`) using the Bright Blue color, animated to swell and shrink slightly, mimicking a star's pulse.
4.  **Floating Motion:** Interactive cards should have a subtle floating animation (±5px Y-axis) to reinforce the zero-gravity environment.

## Shapes

The shape language is defined by ultra-soft geometry to contrast the "coldness" of space with the "warmth" of the mission.

- **Containers:** All cards and primary modules use **rounded-3xl** (24px - 32px) corners.
- **Interactions:** Buttons and tags must be **rounded-full (pill-shaped)**.
- **Borders:** Borders are thin (1px) and translucent, acting as "light-traps" on the edges of the glass surfaces.

## Components

### Buttons
Primary buttons are pill-shaped with a Bright Blue-to-Electric Purple gradient. They feature the blue shadow pulse on hover. Secondary buttons use the glass style (translucent background, white border) with white text.

### Cards
Cards are the hallmark of this design system. They utilize the `backdrop-blur-xl` and `white/10` fill. Borders are `white/20`. The background of the entire page should feature a subtle "Earth from space" image, which is visible through these cards.

### Input Fields
Inputs are glass-morphic pills with 24px horizontal padding. The focus state replaces the white border with a Bright Blue glow and an Electric Purple cursor.

### Chips & Badges
Small pill-shaped indicators used for status or categories. These use high-contrast Electric Purple backgrounds with white uppercase text to stand out against the glass layers.

### Progress Command (Unique Component)
A custom progress tracker for training modules designed to look like a cockpit instrument or star-map, using circular "orbital" paths rather than linear bars.