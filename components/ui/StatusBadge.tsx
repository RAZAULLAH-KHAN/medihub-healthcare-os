type Kind =
  | "waiting"
  | "success"
  | "danger"
  | "info"
  | "emergency"
  | "neutral";

const MAP: Record<Kind, { className: string; label: string }> = {
  waiting: {
    className: "bg-amber-50 text-amber-800 border-amber-200",
    label: "Waiting",
  },
  success: {
    className: "bg-green-50 text-green-800 border-green-200",
    label: "Confirmed",
  },
  danger: {
    className: "bg-red-50 text-red-800 border-red-200",
    label: "Error",
  },
  info: {
    className: "bg-blue-50 text-blue-800 border-blue-200",
    label: "Info",
  },
  emergency: {
    className: "bg-emergency-bg text-emergency border-red-200",
    label: "Emergency",
  },
  neutral: {
    className: "bg-slate-100 text-slate-700 border-slate-200",
    label: "Idle",
  },
};

export function StatusBadge({
  kind,
  label,
}: {
  kind: Kind;
  label?: string;
}) {
  const m = MAP[kind];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium ${m.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label ?? m.label}
    </span>
  );
}
