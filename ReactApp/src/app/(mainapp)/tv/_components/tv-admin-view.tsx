"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Clock, Loader2, PlayCircle, Radio, Tv, Warehouse } from "lucide-react";
import { tvAdminApi, TV_KEYS } from "@/api/tv.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthUser } from "@/lib/use-auth-user";
import { isAdmin } from "@/lib/permissions";
import { ForbiddenState } from "../../_components/forbidden-state";
import { useTvAction } from "../_hooks/use-tv";
import { TvHero } from "./tv-ui";
import { BoxesTab } from "./admin/boxes-tab";
import { PacksTab } from "./admin/packs-tab";
import { UnitsTab } from "./admin/units-tab";
import { ConnectionsTab, InstallationsTab, OrdersTab } from "./admin/fulfilment-tabs";

const TABS = [
  ["orders", "TV Orders"],
  ["installations", "Installations"],
  ["connections", "Connections"],
  ["units", "Units"],
  ["boxes", "Boxes"],
  ["packs", "TV Packs"],
] as const;

type Tab = (typeof TABS)[number][0];

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Tv; label: string; value?: number; tone: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute right-0 top-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full blur-2xl ${tone}`} />
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold">{value ?? "—"}</p>
        </div>
        <Icon className="h-7 w-7 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export function TvAdminView() {
  const { user } = useAuthUser();
  const admin = isAdmin(user);
  const [tab, setTab] = useState<Tab>("orders");

  const dash = useQuery({ queryKey: [...TV_KEYS.admin, "dashboard"], queryFn: tvAdminApi.dashboard, enabled: admin });
  const jobs = useTvAction(tvAdminApi.runJobs, (r) => `Lifecycle job done: ${r.gracePeriod ?? 0} to grace, ${r.suspended ?? 0} suspended, ${r.resumed ?? 0} resumed`);

  if (user && !admin) return <ForbiddenState message="Administrator access is required to manage Zylo TV." />;

  return (
    <div className="flex flex-col gap-7 pb-10">
      <TvHero
        badge="Zylo TV · Super Admin"
        title="Set-Top Box Console"
        subtitle="Fulfil orders, assign box units, schedule installations and manage the catalogue."
        right={
          <Button variant="outline" className="shrink-0" disabled={jobs.isPending} onClick={() => jobs.mutate(undefined)}>
            {jobs.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
            Run expiry job now
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Radio} label="Active connections" value={dash.data?.activeConnections} tone="bg-emerald-500/20" />
        <Stat icon={Warehouse} label="Units in stock" value={dash.data?.unitsInStock} tone="bg-primary/20" />
        <Stat icon={CalendarCheck} label="Installs today" value={dash.data?.installsToday} tone="bg-purple-500/20" />
        <Stat icon={Clock} label="Expiring this week" value={dash.data?.expiringThisWeek} tone="bg-amber-500/20" />
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border/60 bg-card/60 p-2">
        {TABS.map(([key, label]) => (
          <Button key={key} size="sm" variant={tab === key ? "default" : "ghost"} className="font-semibold" onClick={() => setTab(key)}>
            {label}
          </Button>
        ))}
      </div>

      {tab === "orders" && <OrdersTab />}
      {tab === "installations" && <InstallationsTab />}
      {tab === "connections" && <ConnectionsTab />}
      {tab === "units" && <UnitsTab />}
      {tab === "boxes" && <BoxesTab />}
      {tab === "packs" && <PacksTab />}
    </div>
  );
}

export default TvAdminView;
