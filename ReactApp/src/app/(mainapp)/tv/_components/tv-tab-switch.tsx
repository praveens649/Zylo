import { Tv, MonitorPlay } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function TvTabSwitch({
  tab,
  onChange,
  count,
}: {
  tab: "browse" | "my";
  onChange?: (tab: "browse" | "my") => void;
  count?: number;
}) {
  const navigate = useNavigate();
  const select = (next: "browse" | "my") => {
    if (onChange) onChange(next);
    else navigate(`/tv?tab=${next}`);
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-primary/20 bg-background/85 p-1.5 shadow-sm backdrop-blur-md">
      <button
        type="button"
        onClick={() => select("browse")}
        className={cn(
          "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold sm:text-sm transition-all",
          tab === "browse"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
      >
        <Tv className="h-4 w-4" />
        <span>Zylo TV</span>
      </button>
      <button
        type="button"
        onClick={() => select("my")}
        className={cn(
          "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold sm:text-sm transition-all",
          tab === "my"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
      >
        <MonitorPlay className="h-4 w-4" />
        <span>My TV</span>
        {typeof count === "number" && count > 0 && (
          <span
            className={cn(
              "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
              tab === "my"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
            )}
          >
            {count}
          </span>
        )}
      </button>
    </div>
  );
}

