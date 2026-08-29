---
name: Communitator
description: A broadcast control log for reviewable community relay policy.
colors:
  signal-orange: "#f26b38"
  signal-orange-hover: "#ff8755"
  signal-green: "#69b49b"
  signal-gold: "#ddbc4f"
  signal-red: "#c64a38"
  console: "#171b19"
  console-raised: "#222824"
  paper: "#f1ead8"
  paper-raised: "#faf6e9"
  paper-alt: "#e8dfcb"
  ink: "#1d2421"
  ink-muted: "#5e665f"
  console-dark: "#0d100e"
  console-raised-dark: "#191e1b"
  paper-dark: "#171b19"
  paper-raised-dark: "#202622"
  ink-dark: "#eee8d7"
  ink-muted-dark: "#b7bdaf"
typography:
  display:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(3.4rem, 5.2vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 0.91
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(2.4rem, 5vw, 4.8rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2.35rem)"
    fontWeight: 700
    lineHeight: 1.08
  body:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.72
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1.55
    letterSpacing: "0.08em"
rounded:
  square: "0"
  lamp: "50%"
spacing:
  xs: "0.4rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
  section: "clamp(4.5rem, 9vw, 8rem)"
components:
  button-primary:
    backgroundColor: "{colors.signal-orange}"
    textColor: "{colors.console}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.75rem 1.1rem"
    height: "3rem"
  button-primary-hover:
    backgroundColor: "{colors.signal-orange-hover}"
    textColor: "{colors.console}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.75rem 1.1rem"
    height: "3rem"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.75rem 1.1rem"
    height: "3rem"
  routing-console:
    backgroundColor: "{colors.console}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "clamp(1.1rem, 2vw, 2rem)"
  channel-strip:
    backgroundColor: "{colors.console-raised}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.square}"
    padding: "1rem"
---

# Design System: Communitator

## Overview

**Creative North Star: "Broadcast Control Log"**

Communitator looks like a community-radio control room recorded on a warm paper station log. Dense protocol facts become channels, routing lines, status lamps, and ruled tables; these devices always explain real product structure rather than acting as decoration. The result is technical without being cryptic and expressive without disguising consent or relay behavior.

The system alternates generous paper fields with console-black operational bands. Oversized geometric headings establish the transmission, plain body copy explains it, and compact monospaced labels identify controls and protocol states. Most surfaces remain flat; one routing console earns physical lift because it is the page's live explanatory instrument.

**Key Characteristics:**

- Warm paper and console-black fields with orange, green, and gold signal accents.
- Square-edged controls, hard rules, compact log labels, and tabular numerals.
- Oversized Syne headlines paired with readable Space Grotesk prose.
- Operational imagery made from real event kinds, signing steps, and relay destinations.
- One restrained signal pulse, with a still alternative for reduced motion and narrow screens.

## Colors

The palette pairs warm archival paper with near-black console surfaces; signal colors are sparse functional markers, not general decoration.

### Primary

- **Transmit Orange** (`signal-orange`): primary actions, active navigation, event-kind emphasis, and the moving signal route. Its brighter hover partner is reserved for pointer feedback.

### Secondary

- **Review Green** (`signal-green`): review-ready states, media channels, and safe destination cues.

### Tertiary

- **Publish Gold** (`signal-gold`): publish state, selection, and the global keyboard focus outline.
- **Fault Red** (`signal-red`): the reserved danger family for destructive or failed states.

### Neutral

- **Console Black** (`console`) and **Raised Console** (`console-raised`): operational bands, the routing instrument, and its inset channel strips.
- **Station Paper** (`paper`), **Raised Paper** (`paper-raised`), and **Ledger Paper** (`paper-alt`): the reading canvas, elevated light surfaces, and side-navigation fields.
- **Control Ink** (`ink`) and **Muted Ink** (`ink-muted`): primary reading text and secondary explanation.
- The `*-dark` counterparts are the implemented dark-theme values; they preserve the same semantic roles rather than creating a second palette.

### Named Rules

**The Signal Rarity Rule.** Orange, green, gold, and red identify an action, channel, focus, or state; never flood a surface with them when a label or lamp will do.

**The Two Materials Rule.** Reading happens on paper and operation happens on console black. Introduce another large surface color only when it communicates a distinct product state, as the consent-green trust band does.

## Typography

**Display Font:** Syne (with sans-serif fallback)

**Body Font:** Space Grotesk (with sans-serif fallback)
**Label/Mono Font:** JetBrains Mono (with monospace fallback)

**Character:** Syne gives transmissions a broad, unmistakable voice; Space Grotesk keeps explanations humane; JetBrains Mono turns protocol identifiers and controls into precise station-log notation.

### Hierarchy

- **Display** (800, responsive display scale, 0.91 line-height): the home-page proposition, balanced into a compact block.
- **Headline** (800, responsive section scale, 0.98 line-height): major section and documentation headings.
- **Title** (700, responsive title scale, 1.08 line-height): workflow steps and subordinate calls to action.
- **Body** (400, 1rem, 1.72 line-height): explanations and guide prose, normally capped near 58–72 characters.
- **Label** (600, 0.72rem, 0.08em letter spacing, uppercase): navigation, channel names, states, table heads, and console readouts.

### Named Rules

**The Three Voices Rule.** Syne broadcasts, Space Grotesk explains, and JetBrains Mono labels. Do not exchange their jobs.

**The Short Transmission Rule.** Large display lines stay short and balanced; long technical explanation belongs in body copy below or beside them.

## Layout

The main canvas expands to 1440px, while dense instructional sections cap their internal content at 1320px. Desktop compositions use purposeful asymmetry: the hero is a roughly 45/55 split, process headings pair a wider statement with a narrower explanation, and event details pair narrative with a minimum 32rem ledger. Section padding follows a fluid rhythm from 4.5rem to 8rem; smaller internal gaps use the documented spacing scale.

At 1100px, two-column hero, event, and trust layouts become single columns. At 760px, the page moves to 1.1rem side gutters, actions become full-width stacks, process rows collapse, and data tables may scroll. The routing diagram is not shrunk: its SVG gives way to a vertically labeled source → NIP-07 signer → destination chain.

**The Composition Change Rule.** Responsive behavior may change the information diagram, but it must preserve every source, signing point, and destination.

## Elevation & Depth

The system is flat by default and separates regions with tonal changes and one-pixel ledger rules. The routing console is the exception: it uses a broad ambient shadow to read as a physical explanatory instrument. Signal lamps add narrow colored glows inside that console; navigation uses a translucent paper background with 14px backdrop blur.

### Shadow Vocabulary

- **Console Lift** (`0 2.2rem 5rem rgba(32, 35, 30, 0.24)`): only for the principal routing console.
- **Signal Lamp Glow** (`0 0 1.1rem color-mix(in srgb, var(--strip-tone) 45%, transparent)`): only around an active channel lamp.

### Named Rules

**The One Instrument Rule.** Keep ordinary cards and content regions flat; reserve ambient elevation for the routing console or an equally central operational instrument.

## Shapes

The form language is square, ruled, and mechanical. Buttons, tables, custom blocks, social controls, and large surfaces use hard corners. Thin horizontal rules organize logs and transitions; a heavy three-pixel table cap marks the start of a ledger. Circles appear only where their meaning is literal: indicator lamps, connection nodes, and console fasteners.

**The Literal Circle Rule.** Rounded geometry denotes a light, node, or fastener—not softness or friendliness.

## Components

### Buttons

- **Shape:** square-edged, minimum 3rem high, with compact horizontal padding.
- **Primary:** Transmit Orange fill with Console Black text and an orange border; monospaced uppercase label.
- **Hover / Focus:** rises 2px and brightens on hover; every keyboard focus receives the global 3px Publish Gold outline with a 4px offset.
- **Quiet:** transparent with a strong ink rule; hover inverts to Control Ink with Raised Paper text.

### Cards / Containers

- **Corner Style:** hard corners throughout.
- **Routing Console:** Console Black shell, Raised Console channel strips, one-pixel dividers, screw details, and compact monospaced metadata.
- **Channel Strip:** a narrow colored lamp precedes event kind, channel name, and plain-language note. The tone maps to the real event channel.
- **Shadow Strategy:** only the routing console uses Console Lift; section containers remain flat.
- **Internal Padding:** 1rem per channel strip and a fluid 1.1–2rem console body inset.

### Navigation

Navigation stays slim and administrative: paper translucency, a bottom rule, uppercase monospaced links, and orange active state. The Dyne mark and wordmark precede the Communitator title; on narrow screens the Dyne wordmark hides while the mark and product name remain.

### Event Ledger

The event reference table begins with a heavy ink cap, uses compact uppercase column labels, and separates each 5rem row with a strong rule. Event kinds take the primary accent, names remain bold neutral text, and status aligns right in Review Green.

### Consent Sequence

Review, Connect, Sign, and Publish form a ruled horizontal signal chain on wide screens. On narrow screens it becomes a vertical log with short connector strokes; ordering never changes.

## Do's and Don'ts

### Do:

- **Do** use Transmit Orange for the primary action or active route and preserve its rarity.
- **Do** make protocol structure visible through real kinds, signing points, destinations, and states.
- **Do** preserve square controls, hard rules, tabular numerals, and the three-font role system.
- **Do** replace the route drawing with the implemented labeled vertical chain below 760px.
- **Do** respect reduced motion by collapsing the signal pulse to a still route.

### Don't:

- **Don't** add decorative knobs, meters, waveform art, or radio jargon that carries no product information.
- **Don't** round cards and buttons into generic friendly pills.
- **Don't** use ambient shadows on ordinary content containers.
- **Don't** use signal colors as broad decorative backgrounds.
- **Don't** hide review and consent behind an action-first presentation.
