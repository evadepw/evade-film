import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  /** 0–100. */
  value: number;
  className?: string;
  label?: string;
}

/** Watch progress. A 2px silver rule on a 20%-alpha track — no colour, no glow. */
export function ProgressBar({ value, className, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-0.5 w-full overflow-hidden rounded-full bg-silver-a20", className)}
    >
      <div
        className="h-full rounded-full bg-silver-1 transition-[width] duration-200 ease-evade"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
