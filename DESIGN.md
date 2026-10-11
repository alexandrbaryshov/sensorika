---
name: Сенсорика
description: Творческая мастерская в Чебоксарах. Вечерняя стена, расписная глина, свет свечей.
colors:
  night: "#1f1424"
  fold-wall: "#261827"
  night-2: "#2b1c30"
  night-3: "#3a2741"
  ink: "#2b1c30"
  ink-soft: "#5d4863"
  on-night-soft: "#c9b5c6"
  clay: "#e9b293"
  clay-deep: "#cf8a68"
  ornament-peach: "#e7a082"
  terra: "#9e4b35"
  terra-deep: "#7f3a28"
  blush: "#f4e6df"
  cream: "#fbf4ef"
  hero-cream: "#f6decf"
  lav: "#b4a6de"
  lav-deep: "#6f5ca8"
  lav-ink: "#33264f"
  turq: "#3fc1c9"
  turq-hi: "#68d6dc"
  turq-deep: "#1f8f97"
typography:
  display:
    fontFamily: "Ledger, Forum, Times New Roman, serif"
    fontSize: "calc(88 * var(--u))"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
  headline:
    fontFamily: "Ledger, Forum, Times New Roman, serif"
    fontSize: "clamp(2.1rem, 4.4vw, 3.7rem)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "0.005em"
  title:
    fontFamily: "Ledger, Forum, Times New Roman, serif"
    fontSize: "clamp(1.4rem, 2.2vw, 1.8rem)"
    fontWeight: 400
    lineHeight: 1.1
  numeral:
    fontFamily: "Ledger, Forum, Times New Roman, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "lnum, tnum"
  hand:
    fontFamily: "Bad Script, Amatic SC, cursive"
    fontSize: "clamp(1.3rem, 1.9vw, 1.65rem)"
    fontWeight: 400
    lineHeight: 1
  body:
    fontFamily: "Golos Text, Segoe UI, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Golos Text, Segoe UI, system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.08em"
  wordmark:
    fontFamily: "Amatic SC, cursive"
    fontSize: "1.9rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.03em"
rounded:
  pill: "999px"
  card: "18px"
  panel: "22px"
  slot: "14px"
  sheet: "10px"
spacing:
  gutter: "clamp(16px, 4vw, 48px)"
  container: "1240px"
  section: "clamp(72px, 9vw, 120px)"
  head: "72px"
  stack: "28px"
components:
  button-glaze:
    backgroundColor: "{colors.turq}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0.8em 1.5em"
    height: "48px"
  button-glaze-hover:
    backgroundColor: "{colors.turq-hi}"
    textColor: "{colors.ink}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    padding: "0.8em 1.5em"
    height: "48px"
  button-ink-hover:
    backgroundColor: "{colors.night-3}"
  button-ghost:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.8em 1.5em"
    height: "48px"
  chip:
    textColor: "{colors.blush}"
    rounded: "{rounded.pill}"
    padding: "0.4em 1.05em"
    height: "38px"
  chip-selected:
    backgroundColor: "{colors.clay}"
    textColor: "{colors.ink}"
  tbd-pill:
    backgroundColor: "{colors.lav}"
    textColor: "{colors.lav-ink}"
    rounded: "{rounded.pill}"
    padding: "0.05em 0.65em"
  game-panel:
    backgroundColor: "{colors.night-2}"
    textColor: "{colors.blush}"
    rounded: "{rounded.panel}"
    padding: "18px 18px 20px"
  stage-tip:
    backgroundColor: "{colors.night}"
    textColor: "{colors.hero-cream}"
    typography: "{typography.hand}"
    rounded: "{rounded.pill}"
    padding: "0.3em 1em 0.4em"
---

# Design System: Сенсорика

## Overview

**Creative North Star: "The Painted Vessel at Dusk"**

The page is a painted pot in an evening workshop. An aubergine wall (fold-wall) holds a peach arch painted with terracotta Chuvash ornament. Unlit candle plates float on either side of the arch. Their flames are drawn in CSS, and a warm screen-blended glow falls on the wall and the arch legs. Inside the arch a real 3D potter's wheel runs. Below the fold the page alternates warm grounds: blush, clay, lavender, terracotta and night. Ornament belts sit at the seams between sections. Directions are introduced by black-figure kylix tondos, and the steps of the craft by painted clay medallions. The page is dense with material but sparse with UI chrome. Craft lives in painted plates, and the interface stays quiet, round and dark.

Brand colours are kept and laid over the antique-Chuvash world. Lavender, peach/blush and warm cream are the grounds. Turquoise is the glaze, and it marks only what the visitor can do. Facts the studio has not yet confirmed appear openly as the «уточняется» pill. They are never left blank and never invented.

Build status: the desktop hero was built from comp B (`.impeccable/mocks/comp-b.png`) and carries user-accepted deviations. The niche and candles are larger than in the comp, the fold is full height, the subline is set in Bad Script, the candles float, a tip appears over the clay, and a postcard can be exported at «Готово». The hero build-phase comp-match gate is still open at 68%. The user accepted the viewport in chat («Принимаю»). The remaining drift comes from the user's own edits, and the capture tool is not a reliable WebGL renderer. Finish review: round 1 returned fix, round 2 confirmed the fixes, and the last open item (an ad on the map) was closed by replacing the map iframe with a static Yandex map image link.

**Key Characteristics:**
- Evening aubergine wall, a peach ornamented arch and candlelight as the signature world.
- Painted raster plates with embedded provenance carry every figurative image: arch, candles, stage, ornament belt, kylix tondos and step medallions.
- Turquoise glaze is reserved for actions and always carries dark ink text.
- Three typefaces have three jobs: Ledger carves, Bad Script writes, Golos Text speaks.
- Section seams are ornament belts, not hairlines.
- Unknown facts appear as the dashed lavender «уточняется» pill.

## Colors

The palette is a warm-dusk set: aubergine nights, fired-clay peaches and terracottas, the brand's lavender and cream, and one turquoise glaze.

### Primary
- **Turquoise Glaze** (turq): the fill of every booking and next-step button, the focus outline, the cursor ring over the wheel and the selected-swatch ring. It always marks something the visitor can act on.
- **Wet Glaze** (turq-hi): the hover state of glaze buttons.
- **Deep Glaze** (turq-deep): the start of the press-and-hold progress gradient, plus the caret and accent colour.

### Secondary
- **Fired Clay** (clay): a section ground (Contacts), the meander belt ground, selected chips, the frame around the date photo and the certificate sheet.
- **Kiln Peach** (clay-deep): the map frame ring, the scrollbar thumb and the ornament on night belts.
- **Belt Peach** (ornament-peach): the ground under the painted Chuvash ornament belt. The postcard band uses it too.
- **Terracotta** (terra): handwritten lines on light grounds, the Prices section ground and the hover underline on direction rows.
- **Burnt Terracotta** (terra-deep): contact labels on clay.

### Tertiary
- **Brand Lavender** (lav): Process and Gift section grounds, text selection and the «уточняется» pill tint.
- **Lavender Stroke** (lav-deep): the dashed border of the «уточняется» pill.
- **Lavender Ink** (lav-ink): text on lavender grounds and inside the pill.

### Neutral
- **Night** (night): night sections (Date, Reviews, Footer), the theme colour and the ground of the scrollbar track.
- **Evening Wall** (fold-wall): the hero wall only.
- **Ink** (ink, the same value as night-2): body text on light grounds, ink buttons and the game panel family.
- **Raised Night** (night-3): the hover state of ink buttons and the frame ring around the reviews.
- **Soft Ink** (ink-soft): secondary copy on light grounds.
- **Blush** (blush): the page ground and text on night.
- **Cream** (cream): the package table, the map pill and text on terracotta.
- **Candle Cream** (hero-cream): the hero headline, the stage tip and the postcard title.
- **Night Mist** (on-night-soft): secondary text and labels on night.

### Named Rules
**The Glaze-Is-Action Rule.** Turquoise appears only on actions and interaction feedback (buttons, focus, cursor ring, hold progress, selected swatch). Text on turquoise is always Ink, never light. Turquoise is never used for headings, ornament or decoration.

**The Honest Pill Rule.** A fact the studio has not confirmed renders as the «уточняется» pill. It is never an empty cell, a dash or an invented value. On dark and terracotta grounds the pill keeps its dashed form and changes only its tint.

## Typography

**Display Font:** Ledger (with Forum, Times New Roman)
**Hand Font:** Bad Script (with Amatic SC)
**Body Font:** Golos Text (with Segoe UI, system-ui)
**Wordmark:** Amatic SC (brand lockup and certificate name only)

**Character:** Ledger has the carved feel of Roman capitals. Bad Script is the potter's handwriting on the base of a pot. Golos Text is a plain, friendly Cyrillic sans that carries the reading.

### Hierarchy
- **Display** (Ledger 400, 88 comp units, line-height 1, uppercase, set on an arc): the hero headline only.
- **Headline** (Ledger 400, clamp(2.1rem, 4.4vw, 3.7rem), line-height 1.02, uppercase): section titles.
- **Title** (Ledger 400, clamp(1.4rem, 2.2vw, 1.8rem), line-height 1.1): row titles, process steps and FAQ questions (1.45rem).
- **Numeral** (Ledger 400, 1.5–2.3rem, lining tabular figures): prices, durations and fact values.
- **Hand** (Bad Script 400, clamp(1.3rem, 1.9vw, 1.65rem), rotated −2deg): one handwritten line under a heading, direction tags, step names, the stage tip, package subtitles and photo-slot captions.
- **Body** (Golos Text 400, 1.0625rem, line-height 1.6): reading copy, kept to 44–62ch.
- **Label** (Golos Text, 0.78rem, letter-spacing 0.08em, uppercase): data labels in fact lists and control groups only.

### Named Rules
**The Three Hands Rule.** Ledger carves (headings, prices, numerals). Bad Script writes (the human aside, always after or beside the thing it annotates). Golos speaks (copy, buttons, labels). Amatic SC belongs to the brand wordmark and is not a fourth voice.

**The Aside-After Rule.** The handwritten line follows its heading. Small text never sits above a section title as a kicker.

## Layout

On desktop (1100px and wider) the hero is laid out in comp units. `--u` is one pixel of the 2752×1536 comp. `main.js` sets it to `documentElement.clientWidth / 2752`, and `100vw / 2752` is the CSS fallback. Every hero box (headline, subline, steps rail, arch, stage, candles, glow, game panel, CTA) is placed by measured `calc(N * var(--u))` offsets. `--dy` is the full-height fold offset, `max(0px, (100svh − 1427u) / 2)`. Free viewport height is split above and below so the Chuvash ornament belt lands exactly on the bottom edge of the screen. The masthead is measured in comp units too.

Below 1100px the hero switches to a flow grid. Order: headline, subline, steps rail as a horizontal row of medallions, the niche (aspect 798/863, at most 440px), the game panel (at most 520px), then the actions. Candles hang outside the arch edges.

Below the fold, content sits in a centred container (1240px) with fluid gutters (clamp(16px, 4vw, 48px)). Sections use generous vertical padding (clamp(72px, 9vw, 120px)) and full-bleed colour grounds. Two-column splits (copy and object) collapse to one column at 900px. Directions are a ruled list, not a card grid. Each row holds a tondo, a title, the lead text and a price, and rows are separated by rules with a 2px ink top rule. Breakpoints: 1100, 900, 600 and 380px.

### Named Rules
**The Comp-Unit Rule.** Desktop hero geometry is expressed in `--u` and offset by `--dy`. Never mix px positions into the measured hero.

**The Belt Rule.** Seams between sections are ornament belts: the painted Chuvash plate (74 / 48 / 56px tall, 140u on the desktop hero) or a masked meander or Chuvash band (36px). A section boundary is never a bare hairline.

## Elevation & Depth

Depth is warm light plus soft ambient drops. Candle glows are radial gradients with `mix-blend-mode: screen`, and they flicker with the flame. The wall glow is a radial terracotta pool behind the arch. The arch plate carries stacked drop-shadow filters. Raised objects (the game panel, the certificate, the map, the package table, tondos) use long, soft, negative-spread shadows tinted with the ground's own dark. Glaze buttons combine a soft drop with an inset top highlight and bottom bevel, so they read like fired glaze.

### Shadow Vocabulary
- **Glaze bead** (`0 10px 22px -12px rgb(20 10 20 / .55), inset 0 -3px 0 rgb(0 0 0 / .12), inset 0 2px 0 rgb(255 255 255 / .35)`): glaze buttons at rest.
- **Panel drop** (`0 30px 60px -30px rgb(0 0 0 / .7), inset 0 1px 0 rgb(255 255 255 / .04)`): the dark game panel.
- **Clay drop** (`0 30px 60px -36px rgb(127 58 40 / .7)`): objects on clay and blush grounds.
- **Active medallion ring** (`0 0 0 3px #261827, 0 0 0 5px #ea9f7d, 0 10px 26px -6px rgb(234 159 125 / .5)`): the current game step.

### Named Rules
**The Candlelight Rule.** Light comes from the candles and the kiln. Glows are warm (orange-peach) and blended, and shadows are soft and tinted. No hard offset shadows.

## Shapes

Shapes are round and fired. Actions, chips, pills and the stage tip are full pills (999px). Containers have soft corners: cards 18px, the game panel 22px, photo slots 14px, the certificate sheet 10px. Medallions and tondos are perfect circles. The date photo is cut as an arch (`50% 50% 14px 14px / 42% 42% 14px 14px`) inside a 10px clay frame, echoing the hero niche. The arch is the recurring silhouette. Placeholders use a dashed inner border over a faint dense Chuvash rhombus pattern.

## Components

### Buttons
Tactile and glazed, like a dipped pot.
- **Shape:** full pill (999px), at least 48px tall (40px small).
- **Glaze (primary):** turquoise with Ink text, weight 600, padding 0.8em 1.5em, glaze-bead shadow. Used for every booking and next-step action.
- **Hover / Active / Focus:** lifts 2px and brightens to Wet Glaze. Pressed returns to rest with scale .98. Focus uses a 3px turquoise outline at 3px offset.
- **Ink:** night fill with cream text on light grounds for secondary actions (schedule, VK gallery). Hover changes it to Raised Night.
- **Ghost:** transparent with an inset 1.5px currentColor ring, for external links (all reviews, write in VK).
- **Press-and-hold:** a dark pill with a turquoise inset ring. A turquoise gradient fills it left to right while the button is held, and the fill turns kiln orange during firing.

### Chips
- **Style:** transparent pill with a 1.5px pale border and pale text on the night panel.
- **State:** selected chips fill with Fired Clay and Ink text. Used for shape presets and the «Скачать фото» and «Слепить ещё» actions at the end of the game.

### Cards / Containers
- **Game panel:** dark night card (22px radius, panel drop). The step counter («Этап N из 5») sits above a Golos title, then the hint (emphasis in peach), then the controls.
- **Package table:** a cream sheet (18px radius, clay drop) with the first column sticky, Ledger package names and prices, and a Bad Script subtitle.
- **Photo slot:** a clay or lavender tile with a dense Chuvash pattern, a dashed inner border and a Bad Script caption. Slots honestly mark photos still to come.

### Navigation
- **Masthead:** fixed, night (#221726), with the logo lockup at left and the Amatic SC wordmark. Golos links are pill-highlighted on hover, and a small glaze CTA sits at right. Below 1100px it becomes a hamburger `details` menu that opens a night-2 sheet.

### Steps Rail (signature)
Five painted clay medallions (Ком, Круг, Печь, Роспись, Готово) joined by a thin peach line, each with a Bad Script name. The active medallion scales 1.08, warms through a sepia/saturate filter and gains the ring. Completed medallions dim. The same plates reappear in the lavender process frieze.

### Niche Stage (signature)
The peach arch plate frames the Three.js wheel over a masked stage wall. Floating candle plates flank it, with CSS flames (sway, 3.4s) and screen-blended glows. The stage tip is a translucent night pill in Bad Script that bobs over the clay and hides between actions. At «Готово» the visitor can export a 1080×1350 postcard: the vase on a night radial ground, a Ledger title, the peach diamond belt and a Bad Script signature.

### «уточняется» Pill (signature)
Golos 600 at 0.78em, Lavender Ink on a translucent lavender tint, with a 1px dashed Lavender Stroke border and a full pill shape. Re-tinted on night and terracotta grounds.

## Do's and Don'ts

### Do:
- **Do** set every booking or next-step action as a glaze pill with Ink text.
- **Do** place hero geometry in `--u` comp units offset by `--dy` on desktop, and switch to the flow grid below 1100px.
- **Do** mark every unconfirmed fact with the «уточняется» pill.
- **Do** carry figurative imagery as painted plates with embedded provenance: arch, candles, kylix tondos, clay medallions.
- **Do** draw icons as mask silhouettes in currentColor.
- **Do** separate sections with an ornament belt, either the painted Chuvash plate or the masked meander/Chuvash band.
- **Do** add one Bad Script aside after a heading, rotated slightly (−1.5 to −2deg).
- **Do** let candle and kiln light make depth: radial warm glows, screen blend, soft tinted drops.

### Don't:
- **Don't** put light text on turquoise or use turquoise for headings, ornament or decoration.
- **Don't** leave an unknown fact blank or invent a value, and don't pass stock photos off as the studio's.
- **Don't** use emoji or Unicode glyph arrows as icons.
- **Don't** put small uppercase kicker or eyebrow text above section headings.
- **Don't** use hard offset (zero-blur) shadows.
- **Don't** redraw or restyle the logo, or use Amatic SC outside the wordmark and the certificate name.
- **Don't** lay out the desktop hero in px or percentages. It is measured in comp units.
