import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  Gauge,
  Loader2,
  Package,
  Play,
  Router,
  Wifi,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { wifiAdminApi } from "@/api/wifi.api";
import { errorMessage } from "../_hooks/use-wifi";
import { WifiHero } from "./wifi-ui";
import { RoutersTab } from "./admin/routers-tab";
import { PlansTab } from "./admin/plans-tab";
import { UnitsTab } from "./admin/units-tab";
import { ConnectionsTab, InstallationsTab, OrdersTab } from "./admin/fulfilment-tabs";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "plans", label: "Plans" },
  { id: "routers", label: "Router models" },
  { id: "units", label: "Inventory" },
  { id: "orders", label: "Orders" },
  { id: "connections", label: "Connections" },
  { id: "installations", label: "Installations" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function DashboardTab() {
  const { data, isLoading } = useQuery({ queryKey: ["wifi", "admin", "dashboard"], queryFn: wifiAdminApi.dashboard });
  const jobs = useMutation({
    mutationFn: wifiAdminApi.runJobs,
    onSuccess: (r) => toast({ title: `Lifecycle job ran: ${JSON.stringify(r)}` }),
    onError: (e) => toast({ title: errorMessage(e), variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    { label: "Active connections", value: data?.activeConnections ?? 0, icon: Wifi },
    { label: "Routers in stock", value: data?.unitsInStock ?? 0, icon: Router },
    { label: "Installs scheduled today", value: data?.installsToday ?? 0, icon: CalendarClock },
    { label: "Plans expiring this week", value: data?.expiringThisWeek ?? 0, icon: Gauge },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <c.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Maintenance</CardTitle>
          <CardDescription>
            The lifecycle job runs hourly on the server: expiry → grace → suspension, auto-resume after pause.
            Run it manually here for testing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" disabled={jobs.isPending} onClick={() => jobs.mutate()}>
            {jobs.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
            Run lifecycle job now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function WifiAdminView() {
  const [tab, setTab] = useState<TabId>("dashboard");

  return (
    <div className="space-y-6">
      <WifiHero
        badge="ADMIN"
        title="Zylo WiFi Console"
        subtitle="Manage broadband plans, router inventory, orders, installations and connections."
        right={
          <Badge variant="secondary" className="self-start">
            <Package className="mr-1.5 h-3.5 w-3.5" /> Operations
          </Badge>
        }
      />
      <div className="flex flex-wrap gap-1.5 border-b pb-3">
        {TABS.map((t) => (
          <Button key={t.id} size="sm" variant={tab === t.id ? "default" : "ghost"} onClick={() => setTab(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>
      {tab === "dashboard" && <DashboardTab />}
      {tab === "plans" && <PlansTab />}
      {tab === "routers" && <RoutersTab />}
      {tab === "units" && <UnitsTab />}
      {tab === "orders" && <OrdersTab />}
      {tab === "connections" && <ConnectionsTab />}
      {tab === "installations" && <InstallationsTab />}
    </div>
  );
}
