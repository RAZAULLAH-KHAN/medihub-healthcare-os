export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-text-primary">
        {label}
      </span>
      {children}
      {hint && !error ? (
        <span className="mt-1 block text-sm text-text-secondary">{hint}</span>
      ) : null}
      {error ? (
        <span className="mt-1 block text-sm text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2.5 text-text-primary placeholder:text-text-secondary focus:border-primary";
