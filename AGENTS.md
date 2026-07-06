<frontend_aesthetics>
This project is a lightweight Traditional Chinese personal workout log PWA. It is not a marketing landing page. The first screen should feel like a focused training notebook for use between sets: fast, readable, thumb-friendly, and quietly motivating.

Design direction:
Create a distinctive gym-log interface that feels tactile and purpose-built, not generic SaaS. The product records today's workout, body weight, exercise categories, sets, reps, previous-set shortcuts, history, an exercise library, and local export. The visual language should support repeated daily use in a gym environment: quick scanning, strong hierarchy, high contrast, and minimal friction.

Typography:
Use fonts that work beautifully with Traditional Chinese and numeric workout data. Avoid generic defaults such as Arial, Roboto, Inter, system-ui, and overused AI choices like Space Grotesk. Consider pairing a refined Traditional Chinese UI font with a distinctive numeric/mono font for weights, reps, dates, and set rows. The numbers should feel precise and athletic, while Chinese labels remain highly legible on mobile.

Color & Theme:
Commit to a cohesive, context-specific aesthetic. Avoid the current plain paper-and-teal look unless intentionally evolved. Do not use purple gradients on white backgrounds. Strong directions could include:
- a graphite training journal with off-white data panels and sharp lime, safety orange, or cobalt accents
- a weight-room equipment palette: rubber black, brushed steel, chalk white, red selector-pin accents
- a compact Japanese/Taiwanese gym notebook feel: warm paper, dense ink, stamped category tags, one bold signal color
Use CSS variables for all major colors. Dominant neutrals with one or two sharp accents are better than evenly distributed colors.

Layout:
Preserve the app's practical structure: Today, History, Library, Export, bottom tab navigation, and mobile-first portrait use. Improve visual rhythm and hierarchy without turning the app into a landing page. The Today view is the primary workspace and should make the current workout feel active and alive.

Make dense information feel organized:
- exercise cards should clearly separate exercise name, last record, set list, and add-set controls
- category tabs should feel like a real training split selector, not generic chips
- set rows should make weight, unit, reps, and repeated sets easy to scan
- history should feel like archived training notes, not raw text dumped into a card
- export should remain utilitarian and trustworthy

Motion:
Use restrained, high-impact motion. Prioritize one polished page-load or view-switch sequence with staggered reveals. Exercise cards, newly added sets, selected category tabs, and saved states can have subtle CSS transitions. Motion should feel like a training instrument responding crisply, not decorative animation scattered everywhere.

Backgrounds:
Create atmosphere and depth while keeping readability excellent. Use layered CSS backgrounds, subtle gridlines, chalk marks, ruled-paper texture, plate-stack geometry, or equipment-inspired patterns. Avoid generic blobs, orbs, bokeh, and decorative gradients that do not relate to training.

Controls:
This is a utility app, so controls must feel deliberate and touch-safe. Buttons should communicate action priority clearly:
- Save today should be visually important
- Delete actions should be restrained but unmistakable
- Previous-set shortcuts should feel quick and tappable
- Add-set controls should not cause layout shift
Use icons where they clarify common actions, but keep Traditional Chinese labels where speed and clarity matter.

Avoid generic AI-generated aesthetics:
- no Inter / Roboto / Arial / default system font look
- no purple-blue gradient hero treatment
- no oversized marketing hero section
- no generic dashboard card soup
- no decorative UI that reduces speed during workout logging
- no one-note beige, slate, or teal-only palette
- no layout where every element is just a rounded white card

Important constraints:
Keep the app mobile-first and PWA-friendly. Maintain excellent readability in Traditional Chinese. Text must not overflow buttons, tabs, cards, or compact controls. The interface should work well on narrow phones. The bottom tab bar must remain stable and easy to use. Use CSS variables and responsive constraints. Make the final design feel like it belongs specifically to a personal workout tracker used during real training sessions.
</frontend_aesthetics>
