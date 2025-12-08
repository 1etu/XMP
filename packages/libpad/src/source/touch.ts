import type { PadSource } from "../source.js";

const SWIPE_PX = 48;
const SWIPE_SLOPE = 1.2;
const NATIVE = "button, a, input, textarea, select, [data-native-input]";

export function touch(target: EventTarget): PadSource {
  return {
    device: "touch",

    attach(emit) {
      let x0 = 0;
      let y0 = 0;
      let live = false;

      const start = (e: Event): void => {
        live = false;

        if (e.target instanceof Element && e.target.closest(NATIVE) !== null) {
          return;
        }

        const t = (e as TouchEvent).changedTouches[0];
        if (t === undefined) {
          return;
        }

        x0 = t.clientX;
        y0 = t.clientY;
        live = true;
      };

      const end = (e: Event): void => {
        const t = (e as TouchEvent).changedTouches[0];
        if (t === undefined || !live) {
          return;
        }
        live = false;

        const dx = t.clientX - x0;
        const dy = t.clientY - y0;
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);

        if (ax < SWIPE_PX && ay < SWIPE_PX) {
          emit("decide");
          return;
        }

        if (ax > ay * SWIPE_SLOPE) {
          emit(dx < 0 ? "right" : "left");
        } else if (ay > ax * SWIPE_SLOPE) {
          emit(dy < 0 ? "down" : "up");
        }
      };

      target.addEventListener("touchstart", start, { passive: true });
      target.addEventListener("touchend", end, { passive: true });

      return () => {
        target.removeEventListener("touchstart", start);
        target.removeEventListener("touchend", end);
      };
    },
  };
}
