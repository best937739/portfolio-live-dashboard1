import * as React from "react";

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={[
        "flex h-10 w-full rounded-xl border px-3 py-2 text-sm outline-none transition placeholder:text-slate-500 focus:ring-2 focus:ring-slate-600 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
