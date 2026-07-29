# 🌿 Sprout — Habit Tracker

A minimal, glassmorphism-style habit tracker website — built with plain HTML, CSS, and vanilla JavaScript. No backend, no sign-up — just open it and start tracking.

## Files

| File         | Purpose |
|--------------|---------|
| `index.html` | Page structure |
| `style.css`  | Glassmorphism theme + responsive layout |
| `app.js`     | All the logic — habits, streaks, heatmap, localStorage |
| `README.md`  | This file |
| `icon.svg`   | Scalable glassmorphism app icon (used as the primary favicon) |
| `favicon.ico`, `favicon-16.png`, `favicon-32.png` | Raster favicon fallbacks |
| `apple-touch-icon.png` | 180×180 icon for iOS home-screen shortcuts |
| `icon-192.png`, `icon-512.png` | Larger PNGs for PWA manifests / app store style listings |

## Running it

Just open `index.html` in any browser — double-clicking it works fine. If you want a proper local server (some browser features behave better with one):

```bash
cd habit-tracker
python3 -m http.server 8000
# then open: http://localhost:8000
```

## Hosting it (for free)

Drop the three files onto any of these:
- **Netlify Drop** — drag the folder onto netlify.com/drop
- **GitHub Pages** — push them to a repo, enable Pages under Settings
- **Vercel / Cloudflare Pages** — import the folder the same way

## Features

- **Month grid** — a toggle for every day of the month, per habit, just like your original spreadsheet
- **Growth ring** — this month's overall completion % as a tree-ring style progress arc
- **Streaks** — a 🔥 next to each habit showing its current streak (consecutive days)
- **Activity heatmap** — a daily heatmap for the whole month (darker green = more habits completed)
- **Today's status** — how many habits you've completed today, at a glance
- **Journaling** — a tick calendar to see which days already have an entry, and a text box below it to write or edit the selected day's entry
- **📚 Reads** — tap the ⋮ menu for a curated shelf of popular titles (Human Psychology, Money Psychology, Self-Improvement); upload your own PDF copy of any title to read it in-browser, plus a slider to track how much you've read
- **🌱 Growth & Challenges** — the second tab in that same ⋮ menu: reflection questions you can send straight to your journal, and physical/mental challenges you can turn into a tracked habit with one tap
- **Add / delete** habits, each with a chosen emoji icon
- Future dates are automatically locked (you can't mark habit days or journal entries that haven't happened yet)
- **Fully responsive** — full month-grid on desktop; on mobile the stats stack into a compact layout, the grid scrolls horizontally (habit names stay pinned to the left), and the ⋮ menu becomes a bottom sheet
- Respects reduced-motion and is keyboard-focus friendly

## Page layout, top to bottom

1. Header — brand, month switcher, and the ⋮ menu (Reads / Growth & Challenges)
2. Stats (growth ring, totals, streak, today)
3. Activity heatmap
4. **Habit grid** (the tick boxes) — kept high up since it's what you'll use most
5. **Journaling** — tick calendar on top, entry box at the bottom of that section
6. **Add a new habit** — kept at the very bottom, since it's a once-in-a-while action

## Reads (⋮ menu → 📚 Reads)

20 popular titles across three shelves — Human Psychology, Money Psychology, Self-Improvement. For each one you can:
- **Upload a PDF** — drag-and-drop onto the dashed dropzone, or tap it to choose a file. Your own copy is stored locally in the browser's **IndexedDB** (not localStorage — PDFs are too big for that), so it's still there next time you open the app.
- **Read** — opens your uploaded PDF in a new tab using the browser's built-in PDF viewer.
- **Replace / remove** it any time.
- Track **how much you've read** with the slider (0–100%, steps of 5) — the little colored ribbon on the left edge of each card fills in to match.

We don't ship any book text ourselves (that'd be copyrighted) — this just gives you a tidy, on-theme place to keep and read *your own* PDF copies. Want to change the list of titles/shelves? Edit the `BOOKS` object near the top of `app.js`.

## Growth & Challenges (⋮ menu → 🌱 Growth & Challenges)

Four shelves of prompts:
- 🧭 **Self-Improvement Questions** and 🌱 **Growth-Relatable Questions** — tap 📝 on any question to send it straight into today's journal entry as a `Q:` prompt, ready for you to answer.
- 💪 **Challenges for a Better Physique** and 🧘 **Peaceful & Powerful Mind** — tap ➕ on any challenge to drop it into the "Add a new habit" box at the bottom, so you can start tracking it like any other habit.

Edit the `PROMPTS` object near the top of `app.js` to change any of the questions/challenges.

## Where's the data stored?

Everything except your PDFs lives in your browser's **localStorage** — key: `sprout-habit-tracker-v1` (habits + daily logs, book progress percentages, journal entries). Uploaded **PDFs live in IndexedDB** instead (database: `sprout-pdfs`), since browsers don't allow big binary files in localStorage. Either way:
- No server, no internet needed (once the page has loaded)
- Data stays on that browser + device only — it won't show up on another device or browser
- Clearing your browser's cache/site data will erase everything, PDFs included — keep your own copies of anything important

## Customizing

- **Colors/theme**: all the color variables (`--sage`, `--amber`, the background gradient, etc.) live at the top of `style.css` inside `:root { }`
- **Fonts**: `Fraunces` (headings), `Manrope` (body), `JetBrains Mono` (numbers) — the Google Fonts link is in `index.html`'s `<head>`
- **Emoji options**: add new `<button class="emoji-opt" data-emoji="...">` entries inside `#emojiPick` in `index.html`

## The icon

`icon.svg` is a hand-built glassmorphism mark: a frosted glass panel over a blurred forest-green gradient, with a single tilted sage-green leaf and one amber "dew drop" accent — echoing the 🌿 brand mark and the site's own background orbs. It's already wired up as the favicon and apple-touch-icon in `index.html`; regenerate the PNGs from it (or from `make_icon.py`) if you ever want to restyle it.

## License

MIT — see [LICENSE](./LICENSE). Do whatever you like with it.
