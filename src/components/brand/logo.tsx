import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/logo.jpg"
      alt=""
      width={40}
      height={40}
      className={cn("brand-mark", className)}
    />
  );
}

export function BrandLockup({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-start gap-3">
      <BrandMark />
      <div className="min-w-0">
        <p className="wordmark">Free PDF Safe</p>
        {subtitle ? <p className="mt-1 max-w-[32ch] text-sm text-muted">{subtitle}</p> : null}
      </div>
    </div>
  );
}
