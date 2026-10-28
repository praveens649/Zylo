import type { ReactNode } from "react";
import { Zap, type LucideIcon } from "lucide-react";

export interface AuthFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const STATS = [
  { value: "10 GB", label: "Data Bank Cap" },
  { value: "Instant", label: "P2P Data Sharing" },
  { value: "Rewards", label: "Data Quests & XP" },
];

interface AuthBrandPanelProps {
  headline: ReactNode;
  subtitle: string;
  features: AuthFeature[];
}

/** Left brand panel shared by login & signup screens highlighting Zylo innovations. */
export function AuthBrandPanel({
  headline,
  subtitle,
  features,
}: AuthBrandPanelProps) {
  return (
    <aside className="relative hidden w-1/2 flex-col justify-between border-r border-border bg-muted/30 p-12 text-foreground xl:p-16 lg:flex">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Zap className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            Zylo
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Smart Mobile Network
          </span>
        </div>
      </div>

      {/* Headline + features */}
      <div className="max-w-md space-y-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Next-Gen Telecom
          </span>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight text-foreground xl:text-5xl">
            {headline}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        </div>

        <ul className="space-y-5">
          {features.map((f, i) => (
            <li key={f.title} className="flex items-start gap-4">
              <span className="mt-1 font-display text-xs font-bold text-muted-foreground/70">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-2xs">
                <f.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{f.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Stats */}
      <div className="flex divide-x divide-border pt-6 border-t border-border/60">
        {STATS.map((s, i) => (
          <div key={s.label} className={i === 0 ? "pr-8" : "px-8"}>
            <p className="font-display text-2xl font-bold tracking-tight text-foreground">
              {s.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
