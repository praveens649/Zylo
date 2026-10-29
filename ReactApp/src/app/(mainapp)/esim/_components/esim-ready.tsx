import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  Download,
  QrCode,
  Settings,
  Smartphone,
  Wifi,
} from "lucide-react";
import type { TravelEsimOrder } from "@/api/travel-esim.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/format";
import { countryFlag, countryName } from "../_lib/countries";

interface EsimReadyProps {
  order: TravelEsimOrder;
  showHeading?: boolean;
}

const INSTALL_STEPS = [
  { icon: Settings, text: "Go to Mobile Settings" },
  { icon: QrCode, text: "Add eSIM / Scan QR code" },
  { icon: CheckCircle2, text: "Follow the on-screen steps" },
];

export function EsimReady({ order, showHeading = true }: EsimReadyProps) {
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);
  const qrData = order.esim?.qrCodeData ?? null;
  const dataLabel =
    order.plan.dataAllowanceMb >= 1024
      ? `${order.plan.dataAllowanceMb / 1024} GB`
      : `${order.plan.dataAllowanceMb} MB`;

  const downloadQr = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zylo-esim-${order.reference.slice(0, 8)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyCode = () => {
    if (!order.esim?.activationCode) return;
    navigator.clipboard.writeText(order.esim.activationCode);
    toast({ title: "Copied", description: "Activation code copied." });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 to-card shadow-sm">
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-400" />

      <div className="p-5">
        {showHeading && (
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">
                Payment Successful!
              </h3>
              <p className="text-xs text-muted-foreground">
                Your {countryName(order.destinationCountry)} eSIM is ready —
                install it before you travel.
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-[auto_1fr]">
          {/* QR */}
          <div className="flex flex-col items-center gap-3">
            <div
              ref={qrRef}
              className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
            >
              {qrData ? (
                <QRCodeSVG value={qrData} size={168} level="M" />
              ) : (
                <div className="flex h-[168px] w-[168px] items-center justify-center text-muted-foreground">
                  <QrCode className="h-10 w-10" />
                </div>
              )}
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              Scan this QR code
              <br />
              in your phone settings
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={downloadQr}
              disabled={!qrData}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download QR Code
            </Button>
          </div>

          {/* Details */}
          <div className="flex min-w-0 flex-col gap-3">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-foreground">
                  {countryFlag(order.destinationCountry)}{" "}
                  {order.plan.name}
                </p>
                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[11px] font-semibold">
                  {order.status === "ACTIVATED" ? "ACTIVATED" : "READY"}
                </Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Wifi className="h-3 w-3" /> {dataLabel} data
                </span>
                <span>{order.plan.validityDays} days validity</span>
                {order.plan.callMinutes != null && (
                  <span>{order.plan.callMinutes} mins calls</span>
                )}
                {order.plan.smsCount != null && (
                  <span>{order.plan.smsCount} SMS</span>
                )}
                <span>Depart: {formatDate(order.departureDate)}</span>
                <span>Return: {formatDate(order.returnDate)}</span>
                {order.number && (
                  <span className="col-span-2 font-mono text-foreground">
                    Number: {order.number}
                  </span>
                )}
                <span className="col-span-2">
                  Ref:{" "}
                  <span className="font-mono text-foreground">
                    {order.reference.slice(0, 8).toUpperCase()}
                  </span>
                </span>
              </div>
            </div>

            {order.esim?.activationCode && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Activation code (manual install)
                  </p>
                  <p className="truncate font-mono text-xs text-foreground">
                    {order.esim.activationCode}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={copyCode}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* How to install */}
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Smartphone className="h-3.5 w-3.5 text-primary" />
                How to install
              </p>
              <ol className="mt-2.5 flex flex-col gap-2">
                {INSTALL_STEPS.map((s, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-xs">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <s.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">{s.text}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                Install using Wi-Fi before travel — the plan activates when it
                first connects to a local network at your destination.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
