# Gym Session Tracker

## Goal
Build a minimal, black-and-white personal gym tracker that lets you start a live workout, add exercises with sets/reps/weight, and review your session history.

## What it will do
- Start a new workout session with a live timer showing elapsed time.
- Add exercises by name, then add individual sets with reps and weight.
- Exercise name autocomplete / quick-pick: when adding a new exercise, show a dropdown of previously used exercise names from history so you can prefill instead of retyping.
- Mark sets as complete while working out, delete mistakes, and finish the session.
- Save every finished session to a history list with the date, total exercises, total sets, and total volume.
- View past sessions and drill into a single session to see its full details.
- All data stored locally in the browser for personal use (no accounts).


## Design direction
- Minimal black and white only, inspired by a clean notebook / printed log.
- Palette: warm off-white paper background (`#f5f3ee`), rich black text (`#0d0d0d`), soft gray borders (`#e5e2da`), and pure black for primary actions.
- Typography: clean sans-serif, generous whitespace, rounded but subtle corners (`--radius: 0.5rem`).
- Mobile-first, finger-friendly inputs and large tap targets.
- Micro-interactions are the only "decoration": a small, purposeful motion layer that makes the app feel responsive without breaking the minimal aesthetic.
- No unnecessary gradients, illustrations, or color accents — just crisp contrast, clear hierarchy, and subtle motion.

## Micro-interactions & animation design
### Motion language
- **Fast, snappy, 200–300ms** easings (ease-out) so the app feels immediate, like a physical tool.
- **Scale and opacity** as the primary axes; no heavy transforms that would distract during a workout.
- **Reserved for meaningful state changes**: a set being checked off, a new exercise landing, a destructive delete, a view switch.

### Per-element behaviors
- **Live timer pulse:** the running session timer gently pulses once per second to show the session is active without screaming for attention.
- **Primary button press:** buttons scale down to 0.96 on active/tap and spring back to 1, giving tactile feedback.
- **Card entrance:** when an exercise card is added during a workout, it fades in and slides up 12px so the user sees where the new content landed.
- **Set row completion:** tapping the check circle morphs it from empty to filled, then the row briefly darkens slightly to confirm the state change.
- **Prefill dropdown:** exercise suggestions appear with a scale-in fade and stagger in 30ms apart; selecting one collapses the list with a quick fade-out.
- **Delete affordance:** swiping/deleting a set or session slides it out right and fades the space it occupied; undo is not implemented (personal app), so the motion is a clear "this is gone" signal.
- **History tab switch:** active sessions and history panels cross-fade with a 150ms opacity transition so the app never feels like it jumps.
- **Empty state illustration:** a small, abstract barbell/lift icon draws itself with a CSS stroke animation when no history exists.
- **Number changes:** total volume and elapsed time use a subtle `scale-in` / `scale-out` transition when digits update, making progress feel alive.
- **Finish session:** the "Finish" button triggers a celebratory confetti-free micro-interaction — the session card scales in and the timer stops with a single pulse.

### Implementation notes
- Use CSS keyframe animations via Tailwind arbitrary values and a small custom `@keyframes` block in `src/styles.css`.
- Use `prefers-reduced-motion` media query so all animations fall back to instant state changes for users who prefer reduced motion.
- Keep animations in CSS-only where possible; avoid large JS animation libraries to keep the app lightweight.

## Technical approach
- **Framework:** TanStack Start (already in project).

- **Routes:** single page at `/` (`src/routes/index.tsx`) with two main views: active session and history.
- **State:** React state for the live session; `localStorage` for persistence across reloads.
- **Data model:**
  - `Session`: id, startedAt, endedAt, exercises[]
  - `Exercise`: id, name, sets[]
  - `Set`: id, reps, weight, completed
- **Exercise name prefill:** derive a deduplicated list of previously used exercise names from saved history; render it as an autocomplete list when the user focuses the exercise name input.
- **Animations:** add custom `@keyframes` in `src/styles.css` (fade-in, slide-up, scale-in, pulse-soft) and apply Tailwind utility classes such as `animate-fade-in`, `animate-slide-up`, `animate-scale-in`, `hover:scale-[0.96]`, `active:scale-[0.96]`, and `transition-all` across components.
- **History:** computed volume per session, sortable by date, deletable per session.
- **Components:** `SessionHeader`, `ExerciseCard`, `SetRow`, `HistoryList`, `SessionDetail`, `EmptyState`, `ExerciseNameInput`.
- **Head metadata:** title, description, og tags for the app name.

## Out of scope
- User accounts / authentication / cloud sync.

- Charts, analytics, or progress graphs.
- Exercise database / search — free-text exercise names only.
- Timers per set or rest tracking.

## Verification
- Build passes and route renders.
- End-to-end: start a session, add exercises and sets, finish, reload the page, and confirm history is still present.
