"use client";

import { useState } from "react";
import { LifeBuoy, Loader2 } from "lucide-react";

import { AppDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { SupportCategory } from "@/api/support.api";
import { useRechargeOverview } from "../../recharge/_hooks/use-recharge";
import { useCreateTicket } from "../_hooks/use-support";
import { CATEGORY_LABELS, fieldCls } from "./ticket-ui";

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [
  SupportCategory,
  string,
][];

const NO_SIM = "__none__";

export function NewTicketDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportCategory>("OTHER");
  const [simId, setSimId] = useState<string>(NO_SIM);
  const [description, setDescription] = useState("");

  const { data: overview } = useRechargeOverview();
  const sims = overview?.sims ?? [];

  const createTicket = useCreateTicket();

  const isValid =
    subject.trim().length >= 4 && description.trim().length >= 10;

  const reset = () => {
    setSubject("");
    setCategory("OTHER");
    setSimId(NO_SIM);
    setDescription("");
  };

  const submit = () => {
    if (!isValid || createTicket.isPending) return;
    createTicket.mutate(
      {
        subject: subject.trim(),
        description: description.trim(),
        category,
        ...(simId !== NO_SIM ? { simId } : {}),
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Report an issue"
      icon={<LifeBuoy className="h-5 w-5 text-primary" />}
      description="Describe the problem and our team will get back to you on this ticket."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!isValid || createTicket.isPending}
          >
            {createTicket.isPending && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            Submit ticket
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-subject">Subject</Label>
          <Input
            id="ticket-subject"
            placeholder="e.g. Recharge not reflected on my number"
            maxLength={120}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as SupportCategory)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Related number (optional)</Label>
            <Select value={simId} onValueChange={setSimId}>
              <SelectTrigger>
                <SelectValue placeholder="Select number" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SIM}>Not related to a number</SelectItem>
                {sims.map((sim) => (
                  <SelectItem key={sim.id} value={sim.id}>
                    {sim.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-description">Description</Label>
          <textarea
            id="ticket-description"
            className={`${fieldCls} min-h-[110px]`}
            placeholder="What happened? Include order IDs, amounts, or error messages if you have them."
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="text-right text-[11px] text-muted-foreground">
            {description.length}/2000
          </p>
        </div>
      </div>
    </AppDialog>
  );
}
