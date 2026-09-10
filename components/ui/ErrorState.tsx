export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-5 py-8 text-center"
    >
      <p className="font-medium text-danger">Something went wrong</p>
      <p className="mt-1 text-sm text-text-secondary">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-white px-4 py-2 text-primary ring-1 ring-border"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
