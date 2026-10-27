import type { ReactNode } from "react";
import { Layers, type LucideIcon } from "lucide-react";

export interface AuthFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const STATS = [
  { value: "50+", label: "Game stations" },
  { value: "10+", label: "Game zones" },
  { value: "24/7", label: "Arena access" },
];

interface AuthBrandPanelProps {
  /** Headline rendered as the large display heading. */
  headline: ReactNode;
  subtitle: string;
  features: AuthFeature[];
}

/** Left brand panel shared by the login & signup screens (large screens only). */
export function AuthBrandPanel({
  headline,
  subtitle,
  features,
}: AuthBrandPanelProps) {
  return (
    <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-white/10 bg-[#070707] p-12 text-white xl:p-16 lg:flex">
      {/* Diagonal scanline stripes + corner glow */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent_0_10px,rgba(139,92,246,0.03)_10px_20px)]" />
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-violet-500/10 blur-[110px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-violet-400/5 blur-[100px]" />
      {/* Lime edge accent */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-violet-400/60 to-transparent" />

      {/* Brand */}
      <div className="relative flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-400 text-black shadow-[0_0_26px_-4px_rgba(139,92,246,0.7)]">
          <Layers className="h-5 w-5" />
        </div>
        <span className="font-display text-lg font-bold tracking-tight">
          DoodleBlue
        </span>
        <span className="rounded-sm border border-violet-400/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-violet-300">
          Arena
        </span>
      </div>

      {/* Headline + features */}
      <div className="relative max-w-md space-y-9">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.35em] text-violet-400">
            {"// Player access"}
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-violet-400/40 to-transparent" />
        </div>

        <h1 className="font-display text-5xl font-bold uppercase leading-[1.02] tracking-tight xl:text-6xl">
          {headline}
        </h1>
        <p className="max-w-sm text-sm leading-relaxed text-neutral-400">
          {subtitle}
        </p>

        <ul className="space-y-6">
          {features.map((f, i) => (
            <li key={f.title} className="flex items-start gap-4">
              <span className="mt-0.5 font-display text-xs font-bold text-violet-500/70">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-violet-400/30 bg-violet-400/10">
                <f.icon className="h-4 w-4 text-violet-300" />
              </div>
              <div>
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                  {f.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Stats */}
      <div className="relative flex divide-x divide-white/10">
        {STATS.map((s, i) => (
          <div key={s.label} className={i === 0 ? "pr-8" : "px-8"}>
            <p className="font-display text-2xl font-bold text-violet-400">
              {s.value}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
