const hits = new Map<string, { n: number; reset: number }>();

export function tooManyAttempts(key: string, max = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now > cur.reset) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return false;
  }
  cur.n += 1;
  return cur.n > max;
}
