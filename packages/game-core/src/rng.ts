/** Deterministic, seedable RNG (mulberry32). Pure — safe in engines & tests. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  return {
    /** Float in [0, 1). */
    next(): number {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** Integer in [min, max). */
    int(min: number, max: number): number {
      return min + Math.floor(this.next() * (max - min));
    },
  };
}

export type Rng = ReturnType<typeof createRng>;
