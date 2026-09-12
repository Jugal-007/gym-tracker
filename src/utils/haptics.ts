/**
 * Triggers a light haptic feedback vibration.
 * Used for minor interactions like incrementing a stepper.
 */
export function hapticLight() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    // 10ms for a very light tap
    navigator.vibrate(10);
  }
}

/**
 * Triggers a medium haptic feedback vibration.
 * Used for more significant actions like checking off a set.
 */
export function hapticMedium() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    // 30ms for a medium tap
    navigator.vibrate(30);
  }
}

/**
 * Triggers a heavy haptic feedback vibration.
 * Used for major actions like deleting a template or finishing a workout.
 */
export function hapticHeavy() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    // 50ms for a heavy tap
    navigator.vibrate(50);
  }
}

/**
 * Triggers a success haptic pattern.
 * Used when a new PR is hit.
 */
export function hapticSuccess() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([20, 40, 20]);
  }
}
