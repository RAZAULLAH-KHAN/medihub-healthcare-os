type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "emergency";
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: Props) {
  const styles = {
    primary: "bg-primary text-white hover:bg-primary-hover disabled:opacity-50",
    secondary:
      "bg-white text-text-primary border border-border hover:bg-slate-50",
    ghost: "bg-transparent text-primary hover:bg-teal-50",
    danger: "bg-danger text-white hover:bg-red-700",
    emergency: "bg-emergency text-white hover:bg-red-800",
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-base font-medium transition-colors disabled:cursor-not-allowed ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
