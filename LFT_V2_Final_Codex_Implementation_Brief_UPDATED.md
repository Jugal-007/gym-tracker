# LFT V2 — Final Codex Implementation Brief

## End-to-end redesign and implementation, with preservation of existing functionality

**Project:** LFT (Lift) — workout tracker  
**Task:** Transform the existing application into a polished, premium, Apple Fitness-inspired product while preserving working functionality and user data.  
**Execution mode:** Complete the implementation end-to-end in this task. Do not stop after analysis, planning, a few redesigned screens, or a proposal.

---

# 1. Your mission

You have already been given:

- The existing LFT project folder/codebase.
- The LFT V2 design reference image.
- This implementation brief.

Use the project and image already available in your working context. **Do not ask the user to upload them again.**

You are responsible for both **UI/UX design and engineering implementation**. The design reference is an actual visual target, not optional inspiration. Redesign the application comprehensively and implement the redesign in the existing project.

The required result is one cohesive, working product:

- A substantial visual redesign across all important screens.
- Clearer, faster workout UX.
- A premium dark theme and a genuinely designed light theme.
- A coherent Athlete Journey/gamification experience.
- Existing functionality, user data, offline behavior, and synchronization preserved.
- Tests/build checks run and major user flows verified.

A functional app with its old UI is not done. A beautiful mockup with broken interactions is not done. A handful of polished screens surrounded by unfinished legacy screens is not done.

## Completion rule

Inspect first, then implement. You may create a short internal plan, but **do not end the task at the plan**. Continue through implementation, verification, and fixes. Make reasonable product/design decisions yourself when a minor detail is unspecified. Do not pause for avoidable clarification.

---

# 2. Source-of-truth hierarchy

Use these sources in this order:

1. **Existing codebase and stored data:** authoritative for current behavior, integrations, and compatibility.
2. **Design reference image:** authoritative for visual direction and aesthetic.
3. **This brief:** authoritative for required UX, preservation rules, quality bar, and acceptance criteria.
4. **Existing project documentation/tests:** use to understand intended behavior and constraints.

Where the image does not show every screen or state, extend the same design language consistently. Do not copy a reference screen mechanically if doing so would make the real app unusable; preserve its visual language while making the interaction functional.

---

# 3. Existing technical context to verify

The current application has been described as using:

- React 19.2
- Vite 8.2
- Nitro
- TanStack Start/Router
- Tailwind CSS v4
- OKLCH design tokens
- Radix UI
- Lucide icons
- dnd-kit
- Recharts
- Zod
- Web Vibration API
- Supabase/PostgreSQL with Row Level Security (RLS)
- Local-first persistence using localStorage and background Supabase sync

Verify the actual repository before relying on this list. Preserve its real package manager, framework conventions, routing, state management, and existing patterns. **Do not migrate frameworks or replace the architecture just for preference.**

Existing capabilities that must be located and preserved include:

- Email/password and Google authentication where currently implemented
- Guest mode where currently implemented
- Workout creation and active session management
- Quick-start exercise and start-from-template flows
- Exercise addition, removal, and reordering
- Set logging, editing, completion, and supported set types (normal, warm-up, drop set)
- Workout cancel confirmation and completion flow
- Session duration and volume calculations
- Warm-up and rest timers, including exercise-transition rest where implemented
- Haptic feedback where supported
- Personal record detection and estimated 1RM calculation
- Templates/routines and saving a completed session as a template
- Session history, details, metrics, and deletion
- Analytics and progression charts
- Lifetime-volume RPG level system
- Profile/preferences, kg/lb conversion, timer preferences
- Local persistence, offline usage, backup/export, and Supabase synchronization
- PWA/standalone behavior and user isolation/RLS

If a listed feature is not present in the actual code, do not invent that it is. Preserve what exists and implement the requirements below where feasible without damaging current behavior.

---

# 4. Non-negotiable safety rules

## 4.1 Preserve data

Never reset or wipe user data to make the new UI easier to implement.

Do not:

- Drop or recreate production tables.
- Reset Supabase.
- Delete user sessions, templates, exercises, PRs, or profile settings.
- Replace real user data with demo/mock records.
- Clear localStorage on startup or as part of a migration.
- Assume an empty local store means the cloud should be overwritten.
- Change identifiers in a way that disconnects historical data.
- Silently discard unknown fields or older record formats.

For schema changes, prefer additive migrations and safe defaults. If data conversion is necessary, make it versioned, idempotent, and backward-compatible where possible. Keep a backup/export path available. Never run destructive database operations against a connected environment.

## 4.2 Preserve behavior while redesigning presentation

Separate presentation changes from business-logic changes. Reuse and wrap existing working hooks, calculations, services, and models when sensible. Do not rewrite core workout/sync logic just to achieve a new look.

For every feature you touch:

1. Identify the existing implementation and its callers.
2. Understand its persistence and edge cases.
3. Change the smallest appropriate surface.
4. Test the feature after the change.

## 4.3 Preserve security

- Maintain Supabase RLS and per-user data isolation.
- Never expose service-role secrets to the client.
- Do not weaken authentication or authorization checks.
- Do not log tokens, passwords, or sensitive user data.
- Keep environment variables and secret handling consistent with the existing project.

## 4.4 No fake functionality

Do not create buttons that do nothing, decorative controls that imply functionality, or hardcoded metrics that look like real user data. Every interactive control must have a real behavior or be clearly disabled with an explanation. Empty data should result in a thoughtful empty state, not fabricated statistics.

---

# 5. Product direction

LFT should feel like a **premium, focused training companion**. Use Apple Fitness as a quality and interaction reference, not as a pixel-for-pixel copy.

Core principles:

- Workout-first: starting and logging a workout should be fast.
- High signal, low clutter: show the next useful action before secondary information.
- Premium typography and spacing.
- Clear hierarchy for important metrics.
- Restrained accent color and gradients.
- Thoughtful cards and surfaces, not cards for everything.
- Consistent iconography.
- Smooth, subtle motion that never delays logging.
- Accessibility and readability in both themes.
- Mobile-first ergonomics for use in the gym.
- Honest metrics derived from actual data.
- The same design language across every screen.

## Primary navigation

Use five clear primary destinations:

1. **Home**
2. **Progress**
3. **Workout**
4. **History**
5. **Profile**

Adapt the existing routing rather than breaking deep links unnecessarily. The Workout destination should make starting or resuming training obvious. During an active workout, use an immersive training mode and hide unrelated global navigation if it distracts from logging. Keep an intentional, clear way to leave or finish the session.

Gamification should have a dedicated **Athlete Journey** experience accessible from an obvious Home/Progress/Profile entry point. It should not remain an incidental block buried in a giant Stats page.

---

# 6. Design system — build this before styling every screen

Create or consolidate reusable design tokens and primitives using the project's existing styling conventions.

## 6.1 Themes

Implement a complete premium dark theme and a complete premium light theme. Both must be first-class, not an inverted afterthought.

Dark theme direction:

- Deep near-black app background.
- Slightly elevated surface layers.
- Subtle separators and borders.
- High-contrast primary text.
- Muted but legible secondary text.
- Restrained accent color and selective gradient use.
- Avoid excessive glow, neon, or glass effects.

Light theme direction:

- White/off-white background.
- Clean surface hierarchy.
- Subtle neutral borders.
- Dark, high-contrast text.
- Carefully controlled accent colors.
- Charts, badges, timers, and dialogs designed specifically for light surfaces.

Persist the selected theme using the existing preference system where possible. Respect system preference if that is already supported or fits naturally. Switching theme must not cause a flash of the wrong theme or lose the user's selection.

## 6.2 Token categories

Centralize tokens for:

- App backgrounds and elevated surfaces
- Primary, secondary, muted, and inverse text
- Borders/dividers
- Accent and semantic success/warning/error colors
- Chart series
- Typography scale and weights
- Spacing scale
- Radii
- Shadows/elevation
- Focus rings
- Motion durations/easing
- Touch-target sizing

Use existing OKLCH token conventions if present. Avoid scattered one-off hex values and arbitrary spacing.

## 6.3 Typography and metrics

Establish a consistent type hierarchy for:

- Display / hero metric
- Page title
- Section title
- Card title
- Body
- Supporting text/caption
- Labels
- Numeric metrics

Use tabular numerals for values where supported. Large numbers should feel intentional, not oversized everywhere. Maintain readable contrast and avoid tiny labels for important information.

## 6.4 Reusable components

Create or improve shared components as needed; do not duplicate them per screen:

- App shell and top bar
- Primary navigation
- Buttons and icon buttons
- Cards and metric cards
- Section headers
- Progress rings/bars
- Badges and chips
- Exercise cards and exercise selector
- Set row / set input controls
- Timer / rest timer
- Chart containers and chart legends
- Search and filter controls
- Tabs / segmented controls
- Dialogs, sheets, and confirmation prompts
- Toasts and inline feedback
- Empty, loading, offline, and error states
- Skeletons where loading latency justifies them

Use the existing Radix/Lucide/etc. setup where appropriate. Avoid adding dependencies unless they solve a real need.

## 6.5 Component states

Define and test visual states where applicable:

- Default
- Hover (desktop)
- Focus-visible
- Pressed
- Disabled
- Loading
- Selected
- Completed
- Error
- Empty
- Offline/sync pending

No interactive element should look clickable but be inert. Keyboard focus must be visible.

---

# 7. Screen-by-screen requirements

Redesign all existing screens, not just the home page. Preserve the existing routes/features while giving them a coherent new visual system.

## 7.1 Splash / launch

- Show a restrained, polished LFT identity.
- Keep startup fast.
- Do not block basic local app use on a network request.
- Avoid adding a long animation that delays entry.
- Handle auth/session restoration without flashing the wrong screen.

## 7.2 Onboarding

If onboarding exists or is required by the current product:

- Make it concise and visually clear.
- Explain the core value: track workouts, see progress, build consistency.
- Allow skipping where appropriate.
- Persist completion safely.
- Do not repeatedly show onboarding to returning users.

## 7.3 Authentication

Redesign sign-in, sign-up, and recovery screens to match the design system.

- Preserve current auth providers and flows.
- Show useful validation and error messages.
- Prevent double submission.
- Preserve password/security behavior.
- Provide a clear guest path if guest mode exists.
- Never expose secrets or use fake authentication.

## 7.4 Home — fitness command center

Home should answer: **“What should I do next, and how am I progressing?”**

Prioritize:

- A concise greeting/context.
- One strong primary **Start Workout** action.
- Resume active workout if one exists.
- Today's planned workout/program if available.
- Quick-start / recent workout options.
- A small number of useful progress or consistency snapshots.
- Recent activity.
- An entry point to Athlete Journey.
- Useful empty states for new users.

Do not turn Home into a long analytics report. Keep the primary action visible without excessive scrolling. Use real user data only.

## 7.5 Active Workout — highest priority

This is the most important operational screen. It must be optimized for use between sets in a gym.

Create an immersive training layout that clearly shows:

- Workout name and elapsed duration.
- Current exercise and exercise order.
- Previous performance where available.
- Set number/status.
- Weight and reps inputs.
- Complete/log set action.
- Exercise-level progress.
- Rest timer and next action.
- Add exercise.
- Exercise options/reordering where supported.
- Finish workout and cancel/discard flows with confirmation.

### Set logging UX

- Minimize taps and unnecessary navigation.
- Use large, touch-friendly controls.
- Support fast weight/reps entry and editing.
- Use numeric input behavior suitable for mobile.
- Show units consistently.
- Make completion state obvious.
- Prevent accidental duplicate set submissions.
- Preserve incomplete work on navigation, refresh, and temporary offline use.
- Keep warm-up/drop-set semantics if currently supported.
- Use previous-set values or previous-session values as sensible defaults only when safe and consistent with current behavior.

Example visual comparison:

- Previous: `32.5 kg × 8`
- Current: editable weight/reps fields

### Active workout states

Design and implement:

- No exercises yet
- Exercise selector open
- Set in progress
- Set completed
- Resting
- Timer paused
- Offline/sync pending
- Finish confirmation
- Cancel confirmation
- Saving/error state
- Workout completed

Do not show the regular bottom navigation over the active workout if it competes with training controls. Provide a clear and safe exit/finish route.

## 7.6 Rest timer and transitions

The timer should feel integrated and premium:

- Large readable countdown.
- Clear progress indicator.
- Skip/end timer.
- Add 30 seconds if appropriate.
- Pause/resume if supported or sensible.
- Accessible controls.
- Haptic feedback only where supported and enabled.
- Correct behavior when app/tab is backgrounded or resumed, consistent with existing timer implementation.

Timer completion must not depend on a fragile interval that drifts badly. Use robust elapsed-time/deadline logic consistent with the current architecture. Avoid multiple simultaneous timers after navigation/remount.

## 7.7 Workout completion and results

Make finishing a workout feel rewarding without becoming slow or childish.

Show metrics calculated from the completed session, where available:

- Duration
- Exercises completed
- Sets completed
- Total volume
- PRs
- XP earned and level progress
- Consistency/streak contribution
- Comparison with a previous workout when meaningful

Actions:

- Save/confirm completion
- View workout details
- Save as template if supported
- Return Home

Do not count XP/PR rewards more than once if the completion view is revisited or the request retries. Avoid losing a workout if the network fails.

## 7.8 Progress

Replace the old dense Stats presentation with a structured, scannable Progress experience. Organize information into:

- **Strength**
- **Volume**
- **Consistency**
- **Body** (only if body metrics exist or are implemented)

Use tabs/segmented controls or distinct sections to avoid one overwhelming page. Each chart should have:

- Clear title and units
- A useful time range where applicable
- Empty state when there is insufficient history
- Readable axes/labels
- Correct dark/light colors
- No misleading values

Include consistency/streak information and a clear entry to Athlete Journey. Keep existing analytics that are useful, but reorganize them rather than silently removing them.

## 7.9 Exercise progression detail

For each exercise, show available history and progression:

- Current best / personal record
- Estimated 1RM if calculated
- Weight/reps progression
- Volume progression when meaningful
- Recent sessions and sets
- PR history
- Clear date/range context

Use the existing e1RM calculation if it is already the product rule: `e1RM = weight × (1 + reps / 30)`. Do not change historical calculations silently. Label estimated values clearly as estimates. Avoid implying progression if the dataset is too small.

## 7.10 History

Redesign workout history as a visual, scannable timeline/list.
Each entry should communicate, where available:

- Date
- Workout name
- Duration
- Volume
- Exercise/set summary
- PR indicator

Provide useful filtering/search only if it can be implemented cleanly. Opening an entry should show a detailed workout summary with sets and metrics. Preserve delete behavior and require confirmation for destructive actions. Handle empty history gracefully.

## 7.11 Athlete Journey / gamification

Create a dedicated, premium athletic progression experience.

Include:

- Current level
- Current XP/progress to next level
- Lifetime training volume
- Achievements and badges
- Milestones
- Challenges/goals if implemented
- Streak/consistency
- Recent unlocks
- Lifetime statistics

Use a restrained, athletic visual language: rewarding but not childish, cluttered, or casino-like.

### Preserve the existing level formula unless intentionally versioned

The current documented lifetime-volume level formula is:
`level = floor(sqrt(totalVolume / 2000)) + 1`

Verify the actual implementation and volume units before changing anything. If this formula is currently in use, preserve it for existing users unless there is a strong reason and an explicit versioned migration. Do not reset levels/XP or silently alter level thresholds.

### Gamification correctness

- Derive values from real workout records.
- Reward completion idempotently.
- Reopening results must not award XP again.
- Retried sync requests must not duplicate achievements/rewards.
- Avoid streak bugs from time zones or duplicate sessions.
- Clearly distinguish locked and earned achievements.
- Explain the next achievable milestone.
- If challenges are shown, they must have real progress and completion logic; otherwise omit them rather than showing fake progress.

## 7.12 Templates and programs

Redesign template/routine lists and details:

- Clear template names and exercise previews.
- Exercise count and useful metadata.
- Obvious start action.
- Edit, duplicate, delete, and save-as-template behaviors where supported.
- Empty state that helps the user create their first routine.
- Safe confirmation for destructive actions.

If programs are not currently supported, do not fake an elaborate program engine. Build only the required useful program capabilities that fit the existing data model and brief.

## 7.13 Exercise library and selector

- Fast search.
- Clear exercise names and relevant muscle/category metadata if available.
- Easy selection from active workout.
- Clear selected state.
- Avoid duplicate exercise insertion unless current behavior permits it.
- Preserve custom exercise behavior if it exists.
- Keyboard and mobile-friendly interaction.
- Good no-results and loading/error states.

Do not block workout logging because exercise metadata or network access is unavailable.

## 7.14 Profile and settings

Make Profile an athlete/settings hub, not one giant form.

Organize:

- Profile/account
- Preferences
- Theme
- Units (kg/lb)
- Timer settings
- Haptics
- Notifications if implemented
- Sync status
- Backup/export
- Authentication and sign out

Preserve current preferences and persistence. Unit changes must not corrupt underlying stored values or reinterpret historical data incorrectly. Show sync status honestly. Include confirmation for sign out if needed to prevent losing unsynced work.

## 7.15 Goals and body metrics

If current product scope/data model supports these, implement clean screens and safe persistence for:

- Training goals
- Weekly targets
- Body measurements/weight history

Do not present body metrics as existing data if none exists. Use opt-in, clearly labeled empty states. Do not introduce sensitive tracking without a clear user-controlled experience. Avoid letting optional features delay core workout UX.

## 7.16 Dialogs, sheets, toasts, and secondary screens

Redesign all existing overlays and secondary screens. Check that:

- Dialogs are not clipped on mobile.
- Destructive actions require confirmation.
- Success/error feedback is readable and brief.
- Escape/back behavior is appropriate.
- Focus is managed correctly.
- Tapping outside does not accidentally discard an active workout.
- Every secondary route inherits the same visual system.

---

# 8. Data, local-first behavior, and sync

The application must remain usable for workout logging when offline.

- Keep local writes fast and immediate.
- Maintain the current local-first model unless repository inspection proves otherwise.
- Keep background sync separate from the critical set-logging path.
- Handle offline/online transitions without duplicate or lost sessions.
- Do not overwrite valid cloud data with an empty local store.
- Do not mark a record synced before the remote write is confirmed.
- Keep retry behavior safe and idempotent.
- Surface sync state without making the UI noisy.
- Preserve guest/user data migration behavior as implemented.
- Validate external/stored data with the project's Zod patterns where applicable.
- Keep schema migrations additive and reversible where practical.
- Preserve RLS and user-scoped queries.

If a new UI requires a data field, first check whether existing data can support it. Add the smallest safe schema change. Do not add backend complexity for a purely visual need.

---

# 9. Responsive behavior and accessibility

Mobile is the primary environment for gym use, but desktop/tablet must remain coherent.

Verify:

- Small mobile widths
- Typical phone widths
- Tablet
- Desktop

Do not simply shrink desktop cards. Adapt layout and navigation intentionally.

Accessibility requirements:

- Semantic controls and headings.
- Keyboard navigation.
- Visible focus indicators.
- Sufficient text and chart contrast in both themes.
- Labels for icon-only buttons.
- Touch targets that are comfortable in a gym environment.
- Do not rely on color alone for set/PR/status meaning.
- Respect reduced-motion preferences where feasible.
- Keep input labels and errors programmatically associated.
- Avoid tiny, low-contrast secondary labels.

---

# 10. Motion and feedback

Use motion to reinforce hierarchy and feedback, not to decorate every element.

Appropriate moments:

- Screen transitions
- Button press feedback
- Set completion
- Progress ring changes
- PR celebration
- Level-up/unlock
- Timer completion
- Bottom sheets/dialogs

Keep animations short and non-blocking. Respect reduced motion. Haptics must be feature-detected and respect user settings. Never make workout logging wait for an animation.

---

# 11. Implementation workflow — finish in one pass

## Phase A: inspect and baseline

1. Inspect repository structure, package scripts, routing, components, state/data architecture, migrations, and tests.
2. Identify all screens and existing features.
3. Locate all persistence/sync/auth code.
4. Run existing tests/build/lint/type checks where available.
5. Record pre-existing failures separately; do not silently attribute them to your changes.
6. Identify high-risk areas and the minimum-safe approach.

Do not stop here.

## Phase B: design foundation

1. Establish coherent tokens for dark and light themes.
2. Build/reuse shared primitives.
3. Set typography, spacing, radii, surfaces, borders, and semantic colors.
4. Ensure the app shell, navigation, and focus states work.
5. Verify theme switching and persistence.

## Phase C: core training journey

Implement and polish in this order:

1. Home
2. Start/resume workout
3. Active workout and set logging
4. Exercise selector
5. Rest timer
6. Workout completion/results
7. Persistence/offline verification

## Phase D: review and progression

1. Progress overview
2. Exercise progression
3. History list and details
4. Athlete Journey/gamification
5. Templates/routines
6. Profile/settings
7. Goals/body metrics and other existing secondary features

## Phase E: responsive and polish

1. Audit every route/screen for consistent design.
2. Audit dark and light themes.
3. Audit mobile/tablet/desktop.
4. Add empty/loading/error/offline states.
5. Check transitions, haptics, focus, and input behavior.
6. Remove placeholder UI and dead controls.

## Phase F: verify and fix

Run available checks and test the app. Fix regressions before declaring completion. Do not stop at a successful compile.

If a tool/browser/screenshot capability is available, use it to inspect the running application at real viewport sizes and compare it with the provided design image. If visual inspection is not available, still perform code-level and runtime verification and be explicit in the final summary about what was and was not visually inspected. Never claim visual QA you did not perform.

---

# 12. Required test plan

Use the repository's existing test tools. Add targeted tests for critical logic if practical. At minimum verify the following flows manually or through automated tests.

## Core workout journey

- Launch app.
- Home loads with real user data or a proper empty state.
- Start an empty workout.
- Start a workout from a template.
- Add an exercise.
- Log multiple sets.
- Edit weight/reps.
- Mark a set complete.
- Reorder/remove exercises if supported.
- Start, add time to, skip, and complete a rest timer as supported.
- Navigate away/refresh where safe and verify session recovery.
- Finish workout.
- Verify summary metrics.
- Verify workout appears in History.
- Reopen completed workout details.

## Preservation and calculations

- Existing workout records still appear.
- Existing templates still appear.
- PR detection still works.
- e1RM calculation is unchanged unless intentionally versioned.
- Volume/duration calculations are correct.
- Unit preference changes display values correctly without corrupting data.
- Existing profile preferences remain.
- Export/backup still works.

## Gamification

- Level is derived consistently from the intended source data.
- Completion rewards are not duplicated by reopening results or retrying.
- Achievements/streaks use real records.
- Empty/locked states are coherent.

## Data and resilience

- Local persistence survives reload.
- Basic logging works without network access.
- Sync resumes when online.
- Empty local storage does not wipe cloud data.
- No duplicate sessions from retry.
- Authentication and RLS assumptions remain intact.
- Sign-out or account switching does not leak data between users.

## UI

- Dark theme on major screens.
- Light theme on major screens.
- Theme preference survives reload.
- Navigation works across every destination.
- Active workout has no distracting global navigation.
- All buttons and controls work.
- Loading, empty, error, and offline states are intentional.
- No overflow/clipping at mobile width.
- No major console errors.
- No fake values or placeholder actions.

---

# 13. Definition of done

The task is complete only when all applicable items are true:

- [ ] The app starts successfully.
- [ ] A coherent design system is implemented.
- [ ] Dark and light themes are both polished.
- [ ] Home is redesigned.
- [ ] Active Workout is redesigned as an immersive, gym-friendly experience.
- [ ] Set logging is fast and functional.
- [ ] Timers work.
- [ ] Completion/results work and use real data.
- [ ] Progress is reorganized and functional.
- [ ] Exercise progression works where data exists.
- [ ] History and details work.
- [ ] Athlete Journey is a real, dedicated experience.
- [ ] Templates and exercise selection work.
- [ ] Profile/settings work.
- [ ] Existing features are preserved.
- [ ] Existing user data is preserved.
- [ ] Offline/local-first behavior remains functional.
- [ ] Supabase sync/auth/RLS remain safe.
- [ ] PWA behavior remains functional where present.
- [ ] Responsive layouts are checked.
- [ ] Empty/loading/error/offline states are handled.
- [ ] No obvious dead buttons or fake metrics.
- [ ] No destructive database/data reset.
- [ ] Build/type/lint/tests have been run where available.
- [ ] Regressions found during verification have been fixed.
- [ ] The main user journey has been tested end-to-end.
- [ ] The overall app follows the provided visual design direction.

If any item cannot be completed, do not pretend it is done. Complete all possible work, then clearly report the blocker and its impact.

---

# 14. Final instructions to Codex

**Do the work, not just the plan.**

1. Inspect the codebase and existing behavior.
2. Implement the new design system.
3. Redesign and implement every major screen and existing secondary screen.
4. Preserve all working logic and user data.
5. Run the application and available checks.
6. Fix issues caused by the changes.
7. Finish with a concise report listing:
   - Major UI/UX changes completed.
   - Existing functionality preserved.
   - Files/areas materially changed.
   - Tests/build checks run and their results.
   - Any remaining limitations or blockers.
   - Any migrations added and why they are safe.

Do not claim that a screen is redesigned if only its colors changed. Do not claim that functionality works if it was not tested. Do not replace the project with a demo. Do not stop after a plan or a partial implementation.

**Target outcome:** the existing LFT app becomes a cohesive, premium, Apple Fitness-inspired workout tracker, visually aligned with the supplied design reference, functionally complete, responsive, and safe for existing user data.

---

# 15. Visual reference hierarchy — important update

The supplied images are complementary references with different purposes, not competing instructions.

## Reference A — Full design system showcase

The wide `Fitness App Design System Showcase` image is the overall product-wide visual reference. Use it for the broad screen inventory, dark/light theme direction, Home, workout, rest timer, completion, Progress, History, Athlete Journey, Profile, and shared components such as cards, buttons, inputs, badges, charts, navigation, empty states, and toasts.

This image does not fully specify every interaction or the newer persistent workout-duration timer. Do not assume it overrides the more recent, specific workout-screen and timer references.

## Reference B — Main active-workout screen

The single-screen image showing `EXERCISE 1 OF 9`, `Upper A`, `Incline Dumbbell Press`, Previous/Suggested cards, set number, weight/reps cards, and the green Complete Set button is the specific reference for the current active-workout composition. Keep this visual structure while connecting every control to real functionality.

## Reference C — Timer component design board

The separate timer-only image is the specific reference for the persistent workout-duration timer. Use its **top-left Default (Running) variant** as the primary design.

Place it immediately below the active-workout header and above the exercise title. It should show a stopwatch icon, divider, `WORKOUT TIME`, live `HH:MM:SS`, green running indicator, subtle green border/glow, and rounded dark pill.

### Timer behavior is mandatory

- Start when the workout session actually starts.
- Derive elapsed duration from the persisted session start timestamp, accounting for explicit pause behavior only if the app supports it.
- Continue while changing exercises, logging/editing sets, and running a rest timer.
- Restore accurately after refresh, route changes, component remounts, and returning from the background.
- Stop only after successful workout completion or confirmed discard.
- Never reset when changing exercises or create duplicate intervals.
- Keep workout duration separate from rest, warm-up, and exercise-transition countdowns.
- Support both themes and phone-width layouts.
- Never hardcode the sample time from the reference.

## Reference priority

1. Timer appearance and behavior: Reference C plus the timer requirements above.
2. Active workout layout: Reference B.
3. Overall screen system, shared components, and themes: Reference A.
4. This brief for functionality, safety, and acceptance criteria.

Do not discard Reference A because it lacks the latest timer, and do not discard References B/C because Reference A is broader. Integrate the new timer into the active workout while keeping the entire app consistent with Reference A.

---

# 16. Final visual coverage audit

Before declaring completion, inspect every existing route and screen and verify both visual and functional coverage. At minimum, audit the applicable equivalents of:

- Splash / launch
- Onboarding
- Sign in / sign up / recovery
- Home
- Active workout with persistent workout-duration timer
- Exercise selector
- Rest timer
- Workout completion/results
- Progress overview
- Exercise progression detail
- History list and session details
- Athlete Journey / gamification
- Templates/routines
- Programs, if supported
- Exercise library
- Profile/settings
- Goals/body metrics, if implemented
- Dialogs, sheets, confirmations, loading, empty, error, and offline states

A screen is not redesigned merely because its background color changed. Do not leave a mixture of polished new screens and untouched legacy screens. Do not invent fake screens for features that do not exist; report those cases honestly.
