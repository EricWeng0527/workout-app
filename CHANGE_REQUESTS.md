# Change Requests

## Execution rule

Modify one item at a time. After each item, verify that change before moving to the next item.

## Requests

1. Fix mobile date/body-weight input layout.
   - On narrow phones, date and body-weight inputs should not squeeze each other.
   - The date should remain fully visible.
   - The body-weight input should have consistent sizing.
   - Verification: check a 360px mobile viewport for no horizontal overflow and readable date/body-weight fields.

2. Make newly added set rows visually distinct from previous-set shortcut options.
   - Newly added set rows should use a lighter style.
   - Previous-set shortcut buttons should remain visually distinct.
   - Verification: add a set and confirm its row color is clearly different from quick-fill shortcuts.

3. Change the set submit button text from "加" to "+".
   - Verification: tapping "+" still adds a set.

4. Remove the "上次" button from exercise cards.
   - Previous-set shortcut options should remain available.
   - Verification: the "上次" button is gone, and quick-fill shortcut buttons still work.

5. Add a workout draft buffer.
   - During a workout, leaving or reloading the app should not lose today's unsaved record.
   - Each meaningful edit should write to a draft buffer.
   - Verification: add workout data, reload the page, and confirm today's draft remains.

6. Add temporary success toasts for create/delete actions.
   - Add and delete actions should show a small success message.
   - The message should disappear automatically.
   - Verification: adding and deleting sets, exercises, and library items shows a toast.

7. Keep the active input workspace at the top of Today.
   - Today should behave like a top-entry workout workspace.
   - When adding a new exercise, that new exercise/input area appears above previous exercises.
   - Previous exercise records move downward.
   - Within an exercise, the input area should stay above its set list, and newly added set rows should appear below the input.
   - The visual order should be: input area / newest exercise / older exercises.
   - Verification: add one exercise and sets, then add a second exercise; the second exercise appears above the first, while the first moves down.

8. Auto-merge repeated identical sets.
   - If the new set has the same weight, unit, and reps as the previous set in that exercise, increment the previous set's repeat count instead of adding a duplicate row.
   - Verification: entering `20kg x10` twice becomes `20kg x10 x2`.

9. Remember the previous unit per exercise.
   - The unit select should default to the unit most recently used for that exercise.
   - Verification: choose `kg` for an exercise, add a set, then confirm that exercise defaults to `kg` next time.

10. Support ordering exercises in the Library tab.
    - In the Library tab, allow adjusting the display order of exercises within a category.
    - The Today exercise chip order should follow the same order.
    - Verification: reorder exercises in Library and confirm Today reflects the new order.

## Suggested implementation order

1. Mobile layout
2. "+" button
3. Remove "上次"
4. Top-entry Today ordering
5. Auto-merge repeated sets
6. Remember unit per exercise
7. Draft buffer
8. Success toasts
9. Color distinction for new set rows vs quick-fill shortcuts
10. Library ordering
