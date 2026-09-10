import type { WorkingHours } from "./types";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function generateSlots(
  date: Date,
  workingHours: WorkingHours,
  durationMinutes: number,
  bookedIso: string[],
) {
  const key = DAY_KEYS[date.getDay()];
  const hours = workingHours[key];
  if (!hours) return [];

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const start = toMinutes(hours.start);
  const end = toMinutes(hours.end);
  const booked = new Set(bookedIso.map((iso) => new Date(iso).getTime()));
  const slots: { iso: string; label: string }[] = [];
  const now = Date.now();

  for (let t = start; t + durationMinutes <= end; t += durationMinutes) {
    const slot = new Date(year, month, day, Math.floor(t / 60), t % 60, 0, 0);
    if (slot.getTime() <= now) continue;
    if (booked.has(slot.getTime())) continue;
    slots.push({
      iso: slot.toISOString(),
      label: slot.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  }
  return slots;
}

export function estimateWaitMinutes(position: number, avgMinutes = 12) {
  return Math.max(0, (position - 1) * avgMinutes);
}
