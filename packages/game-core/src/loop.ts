/**
 * Framework-agnostic fixed-interval rAF loop. The React host calls this from an
 * effect; a future vanilla host reuses it verbatim (see PRD §6.7).
 */
export function createLoop(
  tick: (dt: number) => void,
  { interval = 0 }: { interval?: number } = {},
) {
  let raf = 0;
  let last = 0;
  let acc = 0;
  let running = false;

  const frame = (t: number) => {
    if (!running) return;
    if (last === 0) last = t;
    const dt = t - last;
    last = t;
    if (interval <= 0) {
      tick(dt);
    } else {
      acc += dt;
      while (acc >= interval) {
        tick(interval);
        acc -= interval;
      }
    }
    raf = requestAnimationFrame(frame);
  };

  return {
    start() {
      if (running) return;
      running = true;
      last = 0;
      acc = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    get running() {
      return running;
    },
  };
}
