# Design & Philosophy

How Jar should look, feel, and behave — and why. Companion to `idea.md`
(what it is) and `current-stage.md` (where we are).

## Feel

- App-like: a centered, app-width column even on desktop. Calm, not a dashboard.
- Plain and quiet — lowercase text, native elements, no decoration that
  doesn't carry meaning.
- Playful, a little childish — and that's the point. "Jar" sounds like
  envelope-stuffing pocket money, not finance. The UI should sound and look
  like that too: little jars holding little money.
- Hand-made dev-craft vibe (à la SpeedRun Ethereum / Damn Vulnerable DeFi),
  not corporate SaaS polish.

## Color

- Accent: `#DE006F` (vivid magenta-pink). Everything else stays
  near-monochrome so the accent does the talking.
- White + dark themes planned. Tailwind v4: define tokens in `@theme` /
  CSS custom properties so themes are a variable swap, not a rewrite.

## Typography

Playful chunky font for the personality, quieter ones for the work:

- Display: **Modak** — fat, blobby, pure piggy-bank energy. Display-only:
  its strokes nearly close up below ~24px, so it's for jar names, headings,
  and hero numbers — never body text. (Runners-up if it ever wears thin:
  Chango, Chewy.)
- Everything else (body, numbers, addresses, buttons): **Space Mono** —
  quirky enough to belong to the same playful world as the display font,
  but a real workhorse (bold, italics, clean-aligning digits).

Pairing: chunky display + mono for all the rest. The contrast is the point —
playful name on top, honest typewriter numbers underneath.

## Inspiration

- https://speedrunethereum.com — pixel/comic playfulness, hand-drawn warmth
- https://www.damnvulnerabledefi.xyz — dark, monospace, focused, zero fluff
- https://juicebox.money — playful crypto fundraising; closest cousin to
  "money in a jar with a goal"
- https://www.party.app — PartyDAO; pixel-playful but shipping-product clean
- https://nouns.wtf — pixel art, bold flat color, instantly recognizable
- https://rainbow.me — the friendliest wallet; proof playful ≠ unserious
- https://poolsuite.net — retro leisure-club aesthetic, strong theming
- https://neal.fun — peak childish-delight web; interactions as toys
- https://berachain.com — cartoon mascot crypto, chunky type in the wild
- https://teenage.engineering — playful restraint; minimal but warm

## Motion

Chunky and physical, never floaty. No soft-blur shadows, no gentle scale.

- Buttons are solid blocks: black outline (`border-2 border-black`) on a
  hard, un-blurred offset shadow (`shadow-[4px_4px_0_0_#000]`).
- Hover lifts the block (nudge up-left, shadow grows).
- Press slams it flat into its own shadow (translate down-right by the shadow
  offset, shadow → none). Snappy (`duration-100`), not smooth.

## Principles

- The name is the toy: copy can play with jar-isms (fill it, shake it,
  break it open) as long as actions stay unambiguous.

## Ideas (unsorted)

-

## Decided

- Phone-ish centered column (`max-w-lg`), jars as square cards, actions in
  small modals.
- Accent color `#DE006F`.
- Light + dark themes (later).
- Two-font system: **Modak** (display) + **Space Mono** (everything else).

## Open questions

- How literal do jar visuals get — fill level as the card's main visual?
  (Parked for now — do the basic design first, revisit after.)
