import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export interface StatusOption {
  value: string;
  label: string;
  color?: string;
}

interface StatusPipelineProps {
  statuses: StatusOption[];
  counts: Record<string, number>;
  activeStatus: string;
  onStatusChange: (status: string) => void;
  allLabel?: string;
  className?: string;
}

export function StatusPipeline({
  statuses,
  counts,
  activeStatus,
  onStatusChange,
  allLabel = "All",
  className,
}: StatusPipelineProps) {
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <ScrollArea className={cn("w-full whitespace-nowrap", className)}>
      <div className="flex gap-2 pb-2">
        {/* All tab */}
        <button
          onClick={() => onStatusChange("all")}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            "border border-border hover:bg-muted",
            activeStatus === "all"
              ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
              : "bg-background text-foreground"
          )}
        >
          {allLabel}
          <span
            className={cn(
              "inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 text-xs font-semibold rounded-full",
              activeStatus === "all"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {totalCount}
          </span>
        </button>

        {/* Status tabs */}
        {statuses.map((status) => {
          const count = counts[status.value] || 0;
          const isActive = activeStatus === status.value;

          return (
            <button
              key={status.value}
              onClick={() => onStatusChange(status.value)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                "border border-border hover:bg-muted",
                isActive
                  ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                  : "bg-background text-foreground"
              )}
            >
              {status.label}
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 text-xs font-semibold rounded-full",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : count > 0
                    ? "bg-muted text-muted-foreground"
                    : "bg-muted/50 text-muted-foreground/50"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
