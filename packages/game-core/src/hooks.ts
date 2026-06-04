import * as React from "react";

/** Tracks `prefers-reduced-motion: reduce`. */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

/** True when the element scrolls offscreen — games pause to save CPU. */
export function useOffscreenPause(ref: React.RefObject<HTMLElement | null>): boolean {
  const [offscreen, setOffscreen] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry) setOffscreen(!entry.isIntersecting);
    });
    io.observe(el);
    const onVisibility = () => setOffscreen(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ref]);
  return offscreen;
}

/** Persisted high score in localStorage, gated by the `persist` prop. */
export function useHighScore(
  key: string,
  persist: boolean | string | undefined,
): [number, (score: number) => void] {
  const storageKey =
    typeof persist === "string" ? persist : persist === false ? null : `gamekitui:${key}:hi`;
  const [high, setHigh] = React.useState(0);

  React.useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setHigh(Number(raw) || 0);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const submit = React.useCallback(
    (score: number) => {
      setHigh((prev) => {
        if (score <= prev) return prev;
        if (storageKey) {
          try {
            window.localStorage.setItem(storageKey, String(score));
          } catch {
            /* ignore */
          }
        }
        return score;
      });
    },
    [storageKey],
  );

  return [high, submit];
}
