import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline";
};

export function Button({ className = "", variant = "default", ...props }: ButtonProps) {
  const variants = {
    default: "bg-slate-50 text-slate-950 hover:bg-slate-200",
    secondary: "bg-slate-800 text-slate-50 hover:bg-slate-700",
    outline: "border border-slate-700 bg-transparent text-slate-50 hover:bg-slate-800",
  };

  return (
    <button
      className={[
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      ].join(" ")}
      {...props}
    />
  );
}
