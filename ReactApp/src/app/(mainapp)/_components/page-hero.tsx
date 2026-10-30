import { Badge } from "@/components/ui/badge";

/**
 * Shared page hero — the gradient banner style used on the recharge page.
 * `children` renders on the right side (filters, pickers, actions).
 */
export function PageHero({
  badge,
  icon,
  title,
  subtitle,
  children,
}: {
  badge: string;
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-purple-500/10 to-teal-500/10 p-6 shadow-sm md:p-8">
      <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Badge className="border-primary/30 bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {icon}
            {badge}
          </Badge>
          <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {subtitle}
          </p>
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </div>
  );
}
