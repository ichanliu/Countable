---
title: "Countable Development Lessons Learned"
summary: "Critical lessons learned while developing Countable to avoid repeating bugs"
read_when:
  - Starting a new development cycle on Countable
  - Adding new UI with PanResponder or Animated
  - Modifying the hero editor or widget
  - Adding new layout components
---

# Countable Development Lessons

## Core Rule: Simpler is Safer

Every bug we fixed was caused by unnecessary complexity. When choosing between two
approaches, pick the one with fewer layers and less nesting.

## PanResponder & Animated

1. **Put PanResponder on the direct touch target**, not on a parent or child.
   - Example for drag: Animated.View with `{...dragPan.panHandlers}` directly on it.
   - Do NOT put it on a wrapper View that has `flex`, `justifyContent`, or `padding`.

2. **Use `transform` for position changes, not `top`/`left`/`getLayout()`**.
   - `transform: [{ translateX: anim.x }, { translateY: anim.y }]` does NOT trigger
     layout recalculation, avoiding cascading layout bugs.
   - `getLayout()` sets top/left which can conflict with flex layouts.

3. **Touch target minimum 30x30**.
   - 20x20 is too small for fingers. Always use 30x30 or larger for resize handles.

4. **Two PanResponders on nested views work** when each has `onStartShouldSetPanResponder: () => true`.
   - The inner (child) PanResponder captures touches on the handle.
   - The outer (parent) PanResponder captures touches on the box.
   - They don't conflict because React Native's responder system handles prioritization.

## Layout

1. **Avoid flex spacers for positioning.**
   - `flex: X` with multiple children is unpredictable when content is large.
   - Use `paddingTop: (screenHeight - contentHeight) * positionPercent / 100` instead.

2. **Avoid `flexShrink` unless you understand the implications.**
   - `flexShrink` only compresses, it doesn't distribute space.
   - If you want proportional distribution, use `flex: X` on ALL children.

3. **Avoid nested justifyContent + flexDirection combinations.**
   - `justifyContent: 'center'` on parent + `flex` on children = fighting.
   - Pick ONE approach: either parent centers content, OR children use flex spacers.

4. **Test with extreme values** (max font size, max/min position) to catch layout breaks.

## Widget

1. **Widget background: use a single `setBackgroundColor` on the root FrameLayout.**
   - Do NOT layer ImageView + LinearLayout with different backgrounds.
   - The corner rounding issue (4 corners showing through) happens when two layers
     have different backgrounds and one is rounded.
   - Set `android:background` in XML to a transparent default, set color programmatically.

2. **Widget date: store targetDate as ISO string, recalculate in Kotlin.**
   - Do NOT rely on JS-side pre-calculated counts.
   - `updatePeriodMillis` in widget info XML triggers `onUpdate` periodically.
   - Calculate days from stored targetDate using Calendar.getInstance() in local timezone.
   - Use simple millisecond division `diffMs / 86400000L` not TimeUnit.convert().

3. **Widget image: file:// URIs may fail on Android 12+.**
   - Fall back to solid color background when image fails to decode.
   - Use `inSampleSize = 4` for BitmapFactory to avoid OOM.
   - Check for null bitmap after decodeFile.

## Hero Editor

1. **Drag + corner resize is the most intuitive pattern** (Instagram/Canva style).
   - Users rejected steppers, sliders, and +/- buttons.
   - Only implement: drag box, corner handle, color picker, save/cancel/reset.

2. **Editor should be a full-screen Modal with its own background.**
   - Do NOT try to edit the hero in-place on page 1.
   - Modal with `animationType: "fade"` and `statusBarTranslucent` for full-screen feel.

3. **When converting drag offset to save position:**
   - `savedPosY = 50 + (dragY / screenHeight) * 50`
   - Clamp to 0-100.
   - When loading: start at center (offset 0), let user reposition.

## Page 2 Layout

1. **Compact edit cards: gap=12, paddingTop=20 is safe.**
   - gap=24 + paddingTop=40 pushes content below the fold.
   - If content still overflows, reduce card verticalPadding.

2. **Test on small screens** (in emulator or with different dimensions).
