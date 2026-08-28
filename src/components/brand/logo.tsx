import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/logo.jpg"
      alt=""
      width={58}
      height={58}
      className={cn("brand-mark", className)}
    />
  );
}

export function BrandLockup({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-3.5">
      <BrandMark />
      <div className="min-w-0">
        <h1 className="wordmark">Free PDF Safe</h1>
        {subtitle ? <p className="wordmark-sub">{subtitle}</p> : null}
      </div>
    </div>
  );
}
