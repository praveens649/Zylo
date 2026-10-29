"use client";

import { useMemo, useState } from "react";
import { Smartphone } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useRechargeOverview } from "../../recharge/_hooks/use-recharge";
import { DataLoanCard } from "./data-loan-card";
import { LoanHistory } from "./loan-history";

interface LoanPanelProps {
  /** Also render the expandable loan history under the card. */
  showHistory?: boolean;
}

/**
 * Self-contained Data Loan panel — picks the customer's first ACTIVE SIM,
 * shows a number picker when they own several, then the loan card.
 */
export function LoanPanel({ showHistory = false }: LoanPanelProps) {
  const { data: overview } = useRechargeOverview();
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);

  const activeSims = useMemo(
    () => (overview?.sims ?? []).filter((s) => s.status === "ACTIVE"),
    [overview],
  );
  const selectedSim =
    activeSims.find((s) => s.id === selectedSimId) ?? activeSims[0] ?? null;

  if (!selectedSim) return null;

  return (
    <div className="space-y-4">
      {activeSims.length > 1 && (
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          <Select
            value={selectedSim.id}
            onValueChange={setSelectedSimId}
          >
            <SelectTrigger className="h-9 w-48 bg-background/70 text-sm font-medium">
              <SelectValue placeholder="Select number" />
            </SelectTrigger>
            <SelectContent>
              {activeSims.map((sim) => (
                <SelectItem key={sim.id} value={sim.id}>
                  {sim.number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <DataLoanCard simId={selectedSim.id} />
      {showHistory && <LoanHistory simId={selectedSim.id} />}
    </div>
  );
}

export default LoanPanel;
