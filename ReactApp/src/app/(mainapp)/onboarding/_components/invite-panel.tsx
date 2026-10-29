import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, Copy, MailPlus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import GenericTable from "@/components/ui/generic-table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type { BusinessInvite } from "@/api/onboarding.api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { numbersApi, type PhoneNumber } from "@/api/numbers.api";
import {
  listInvitesAction,
  createInviteAction,
  cancelInviteAction,
} from "../_actions/onboarding.actions";

const INVITES_KEY = ["onboarding", "invites"];

/**
 * Owner-only panel: invites table with an "Invite Member" action in the
 * top-right. Each invite allocates a prefix-pool number to the member.
 * Hides itself when the API rejects (non-owner / no approved org).
 */
export function InvitePanel({ organizationId }: { organizationId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: invites, isError } = useQuery({
    queryKey: INVITES_KEY,
    queryFn: listInvitesAction,
    retry: false,
  });

  // Unallocated numbers in the org prefix pool.
  const { data: pool } = useQuery({
    queryKey: ["org-numbers", organizationId],
    queryFn: () =>
      numbersApi.getAvailable({ organizationId, category: "BUSINESS", limit: 50 }),
    enabled: !!organizationId,
  });
  const availableNumbers: PhoneNumber[] = pool?.data ?? [];

  const createMutation = useMutation({
    mutationFn: createInviteAction,
    onSuccess: (res) => {
      setLastLink(`${window.location.origin}/onboarding?invite=${res.token}`);
      setEmail("");
      setEmployeeId("");
      setPhoneNumberId("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: INVITES_KEY });
      toast({ title: "Invite Created", description: `Invite ready for ${res.invite.email}` });
    },
    onError: (err: any) => {
      toast({
        title: "Invite Failed",
        description: err?.message || "Could not create the invite.",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelInviteAction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVITES_KEY }),
  });

  // Members (not owners) get 403 — hide the panel quietly.
  if (isError) return null;

  const copyLink = async () => {
    if (!lastLink) return;
    await navigator.clipboard.writeText(lastLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const columns: ColumnDef<BusinessInvite>[] = [
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "phoneNumber",
      header: "Number",
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">
          {row.original.phoneNumber?.number ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "employeeId",
      header: "Emp ID",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.employeeId ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Invited",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className={
            row.original.status === "ACCEPTED"
              ? "bg-emerald-500/10 text-emerald-600"
              : row.original.status === "PENDING"
              ? "bg-amber-500/10 text-amber-600"
              : "bg-muted text-muted-foreground"
          }
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.status === "PENDING" ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => cancelMutation.mutate(row.original.id)}
            aria-label="Cancel invite"
          >
            <XCircle className="h-4 w-4" />
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            Team Invites
          </h4>
          <p className="text-xs text-muted-foreground">
            Members join this organization and get numbers from its prefix pool.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <MailPlus className="mr-1.5 h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="inviteEmail">Member Email</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="employee@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inviteNumber">Allocate Number</Label>
                <Select value={phoneNumberId} onValueChange={setPhoneNumberId}>
                  <SelectTrigger id="inviteNumber" className="w-full">
                    <SelectValue placeholder="Pick a prefix number" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableNumbers.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No numbers left in the pool
                      </SelectItem>
                    ) : (
                      availableNumbers.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.number}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Held for this member until they accept.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inviteEmpId">Employee ID (optional)</Label>
                <Input
                  id="inviteEmpId"
                  placeholder="EMP-01"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                disabled={
                  createMutation.isPending || !email.trim() || !phoneNumberId
                }
                onClick={() =>
                  createMutation.mutate({
                    email: email.trim(),
                    phoneNumberId,
                    employeeId: employeeId.trim() || undefined,
                  })
                }
              >
                Send Invite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {lastLink && (
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs">
          <span className="flex-1 truncate font-mono">{lastLink}</span>
          <Button type="button" variant="ghost" size="sm" onClick={copyLink}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      )}

      <GenericTable
        columns={columns}
        data={invites ?? []}
        sort
        pagination
        filter
        filterColumn="email"
        filterPlaceHolder="Search invite email..."
      />
    </div>
  );
}
