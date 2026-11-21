// SHADOWLINE — keyboard input. Tracks held keys for movement and
// edge-triggered presses (Enter, R, M) that the state machine consumes
// once per frame.

export function createInput() {
  const held = new Set();
  const pressed = new Set();

  const onKeyDown = (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!held.has(event.code)) pressed.add(event.code);
    held.add(event.code);
  };
  const onKeyUp = (event) => {
    held.delete(event.code);
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return {
    isDown(code) {
      return held.has(code);
    },
    // True once, on the frame the key went down.
    wasPressed(code) {
      return pressed.has(code);
    },
    // The movement vector from WASD or the arrow keys.
    moveVector() {
      let x = 0;
      let y = 0;
      if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
      if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
      if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
      return { x, y };
    },
    sprint() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    crouch() {
      return held.has('KeyC') || held.has('ControlLeft') || held.has('ControlRight');
    },
    // Call at the end of each frame so presses do not linger.
    endFrame() {
      pressed.clear();
    },
  };
}
