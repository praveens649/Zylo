import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Database,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OnboardingStatus } from "@/api/onboarding.api";
import {
  rechargeApi,
  RECHARGE_OVERVIEW_KEY,
  type RechargeSubscription,
} from "@/api/recharge.api";
import { dataBankApi, dataBankStatusKey } from "@/api/data-bank.api";
import { formatDate } from "@/lib/format";
import { PendingInviteCard } from "./pending-invite-card";
import { LoanPanel } from "../../loans/_components/loan-panel";

interface CustomerDashboardProps {
  statusData?: OnboardingStatus | null;
}

function daysLeft(endDate: string | null) {
  if (!endDate) return null;
  return Math.max(
    0,
    Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000)
  );
}

function formatMb(mb: number) {
  return mb >= 1024
    ? `${(mb / 1024).toFixed(1).replace(/\.0$/, "")} GB`
    : `${mb.toLocaleString("en-IN")} MB`;
}

function simStatusLabel(status?: string) {
  switch (status) {
    case "ACTIVE":
      return { text: "Active", cls: "text-emerald-600" };
    case "PENDING_ACTIVATION":
    case "READY_TO_INSTALL":
      return { text: "Activating", cls: "text-amber-600" };
    case "PARKED":
      return { text: "Parked", cls: "text-sky-600" };
    case "SUSPENDED":
    case "GRACE_PERIOD":
      return { text: "Suspended", cls: "text-amber-600" };
    default:
      return { text: status ?? "No SIM", cls: "text-muted-foreground" };
  }
}

function planBenefits(current: RechargeSubscription) {
  const p = current.plan;
  const parts = [p.callingBenefit];
  if (p.smsCount) parts.push(`${p.smsCount} SMS/Day`);
  if (p.dataAllowanceGb) parts.push(`${p.dataAllowanceGb} GB data`);
  return parts.join(" • ");
}

export function CustomerDashboard({ statusData }: CustomerDashboardProps) {
  const user = statusData?.user;
  const activeSim = statusData?.activeSim;
  const kyc = statusData?.kyc;

  const { data: overview } = useQuery({
    queryKey: RECHARGE_OVERVIEW_KEY,
    queryFn: rechargeApi.overview,
    enabled: !!activeSim?.id,
  });
  const line =
    overview?.sims.find((s) => s.id === activeSim?.id) ?? overview?.sims[0];
  const current = line?.currentPlan ?? null;
  const planDaysLeft = daysLeft(current?.endDate ?? null);

  const { data: bank, isError: bankUnavailable } = useQuery({
    queryKey: dataBankStatusKey(activeSim?.id ?? ""),
    queryFn: () => dataBankApi.getStatus(activeSim!.id),
    enabled: !!activeSim?.id,
    retry: false,
  });

  const network = simStatusLabel(activeSim?.status);

  return (
    <div className="space-y-6 animate-fade-up">
      <PendingInviteCard />
      {/* Welcome Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge
              className={
                activeSim
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted text-muted-foreground font-semibold"
              }
            >
              {activeSim ? "Active Connection" : "Setup pending"}
            </Badge>
            {kyc?.status === "VERIFIED" && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                DoT Verified
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground">
            Welcome back, {user?.name || "Zylo Member"}!
          </h1>
          {statusData?.organization && (
            <p className="mt-1 text-sm font-medium text-primary">
              Member of {statusData.organization.name}
              {statusData.membership?.role
                ? ` · ${statusData.membership.role.toLowerCase()}`
                : ""}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            {activeSim
              ? "Your personal Zylo connection is active. Manage your Data Bank reserves, transfer data to friends, or level up with daily Data Quests."
              : "Complete your SIM onboarding to activate your personal Zylo connection."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button asChild className="font-semibold shadow-sm">
            <Link to="/payments">
              View Payments & Billing
              <ArrowUpRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Connection & Plan Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Active SIM Card */}
        <Card className="border-border bg-card shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Personal Line
              </span>
              <Badge variant="outline" className="text-xs font-mono">
                {activeSim?.technology || "PHYSICAL"} SIM
              </Badge>
            </div>
            <CardTitle className="text-xl font-mono font-bold tracking-tight text-foreground mt-1">
              {activeSim?.phoneNumber?.number || "Not activated"}
            </CardTitle>
            <CardDescription className={`text-xs font-medium ${network.cls}`}>
              Network Status: {network.text}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-2 border-t border-border/70 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Category:</span>
              <span className="font-medium text-foreground">
                {activeSim?.category === "BUSINESS" ? "Business" : "Personal"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>KYC Holder:</span>
              <span className="font-medium text-foreground">{kyc?.fullName || user?.name || "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Plan Card */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Plan
              </span>
              <Badge
                className={
                  current
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs"
                    : "bg-muted text-muted-foreground border-border/40 text-xs"
                }
              >
                {current ? "Active" : "No plan"}
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground mt-1">
              {current?.plan.name ?? "No active plan"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {current
                ? planBenefits(current)
                : "Recharge your number to activate a plan."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-2 border-t border-border/70 text-xs text-muted-foreground">
            {current ? (
              <>
                <div className="flex justify-between">
                  <span>Validity Remaining:</span>
                  <span className="font-medium text-foreground">
                    {planDaysLeft ?? "—"} of {current.plan.validityDays} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Ends:</span>
                  <span className="font-medium text-foreground">
                    {formatDate(current.endDate)}
                  </span>
                </div>
              </>
            ) : (
              <Button asChild size="sm" className="w-full">
                <Link to="/recharge">Recharge now</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Data Bank Piggy Vault */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Data Bank Vault
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Database className="h-3.5 w-3.5" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground mt-1">
              {bank ? `${formatMb(bank.balanceMb)} Saved` : "0 MB Saved"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {bankUnavailable
                ? "Data Bank isn't enabled on this plan"
                : "Unused daily quota auto-banks at midnight"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-2 border-t border-border/70 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Vault Capacity:</span>
              <span className="font-medium text-foreground">
                {bank ? formatMb(bank.capacityMb) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Rollover Expiry:</span>
              <span className="font-medium text-foreground">
                {bank ? `${bank.rolloverExpiryDays} Days` : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zylo Data Loan — borrow data when you run out */}
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <LoanPanel />
      </div>

      {/* Differentiator Quick Actions */}
      <div>
        <h3 className="text-base font-bold text-foreground mb-3">
          Zylo Innovation Features
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
              <Database className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Zylo Data Bank</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Deposit and withdraw banked data lots before expiration. Never lose data you paid for.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 mb-3">
              <Send className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-foreground">P2P Data Transfer</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Send spare data to any registered Zylo friend instantly using their mobile number.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 mb-3">
              <Sparkles className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Data Quests & XP</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Complete weekly mobile challenges, earn XP levels, and unlock free data coupons.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
