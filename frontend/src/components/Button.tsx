import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ className, variant = "primary", ...props }: Props) {
  return (
    <button
      className={clsx(
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-mint text-ink hover:bg-[#7af0c5]",
        variant === "secondary" && "border border-line bg-panel text-white hover:border-mint",
        variant === "danger" && "bg-coral text-white hover:bg-[#ff8175]",
        className
      )}
      {...props}
    />
  );
}
