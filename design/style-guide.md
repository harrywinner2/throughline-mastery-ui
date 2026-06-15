# Style Guide — derived from nerdy.com

Captured live from https://nerdy.com/ (see `home.png`, `tokens.json`). The goal is "recognizably *their* look," not a pixel copy: same type system, color logic, shape language, and energy.

## Character (one line)
Premium dark-mode edtech: a deep indigo space-canvas, white type, soft floating rounded cards, and one signature **multicolor gradient** (orange→pink→purple→blue) used sparingly for the "AI" moments. Confident, modern, a little magical — "Live + AI."

## Type
- **Display / headings:** Poppins, weight 500–600. Big and airy (hero ~52px). Occasional *italic* for emphasis ("**The** Live Learning Platform").
- **Body / UI:** Karla, 400–500 (Nerdy pairs Poppins with Karla). Fall back to Poppins, then system sans.
- Load from Google Fonts: `Poppins:400,500,600` + `Karla:400,500,700`.

## Color tokens
```css
:root {
  /* canvas */
  --bg-deep:    #0F0928;  /* near-black indigo, page base */
  --bg-base:    #202344;  /* primary indigo background */
  --bg-panel:   #161C2C;  /* card / panel surface */
  --bg-elevated:#22263C;  /* raised card */
  --line:       rgba(255,255,255,0.12);
  --line-soft:  rgba(255,255,255,0.08);

  /* text */
  --text:       #FFFFFF;
  --text-muted: rgba(255,255,255,0.64);
  --text-dim:   #6C6E87;

  /* brand accents */
  --cyan:       #17E2EA;  /* primary accent / highlight / "verified" */
  --grad-1:     #FF8A3D;  /* orange  */
  --grad-2:     #FF4D9D;  /* pink    */
  --grad-3:     #A24BFF;  /* purple  */
  --grad-4:     #4D9DFF;  /* blue    */

  /* signature gradient — use ONLY for AI / "alive" moments, never as wallpaper */
  --grad-ai: linear-gradient(100deg, var(--grad-1), var(--grad-2), var(--grad-3), var(--grad-4));

  /* semantic (learning states) */
  --ok:    #3DDC97;  /* correct / mastered */
  --warn:  #FFC24B;  /* practicing / caution */
  --info:  var(--cyan);
  --danger:#FF5C7A;  /* trap / misconception */

  /* shape */
  --r-pill: 100px;   /* buttons are full pills */
  --r-card: 18px;    /* cards 14–20px */
  --r-chip: 10px;
  --shadow: 0 10px 40px rgba(0,0,0,0.45);
}
```

## Shape & spacing
- **Buttons = full pills** (`border-radius: 100px`), generous horizontal padding. Primary = solid white text on `--grad-ai`; secondary = ghost with `--line` border.
- **Cards** rounded 14–20px, dark elevated surface, soft shadow, subtle 1px `--line` border. They *float* over the indigo canvas.
- Airy density. Large hero scale, lots of breathing room. Pill-shaped nav bar with a faint border.
- Background is not flat: a subtle radial/diagonal indigo gradient (`--bg-deep` → `--bg-base`) gives depth, like the homepage.

## Usage rules for THIS product (hyperresponsive mastery UI)
- The **manipulable geometry diagram** is the stable hero. Keep it on a calm dark panel; never wrap it in the loud gradient.
- Reserve `--grad-ai` for genuinely AI-driven moments (a spoken hint arriving, the tutor "thinking"), and for the mastery celebration — so "magic" reads as meaningful, not decorative. (The PRD explicitly punishes decorative gradient/animation.)
- `--cyan` is the "verified by the engine" / system-trust color. `--ok/--warn/--danger` encode learner state, not just pass/fail.
- Motion: smooth, physical, purposeful (springy pill hovers, angle arcs that ease into place). Never constant ambient morphing.
