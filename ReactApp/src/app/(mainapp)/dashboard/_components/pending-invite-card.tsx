import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Building2, Check, Loader2, Phone, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ONBOARDING_STATUS_KEY, type MyInvite } from "@/api/onboarding.api";
import { AUTH_ME_KEY } from "@/api/auth.api";
import {
  myInvitesAction,
  acceptInviteByIdAction,
  declineInviteByIdAction,
} from "../../onboarding/_actions/onboarding.actions";

const MY_INVITES_KEY = ["onboarding", "my-invites"];

/**
 * Member-side card: pending organization invites, showing the prefix
 * number allocated to them. Accepting joins the org; the number then
 * shows in their prefix pool during Business SIM onboarding.
 */
export function PendingInviteCard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: invites } = useQuery({
    queryKey: MY_INVITES_KEY,
    queryFn: myInvitesAction,
    refetchInterval: 30_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: MY_INVITES_KEY });
    queryClient.invalidateQueries({ queryKey: ONBOARDING_STATUS_KEY });
    queryClient.invalidateQueries({ queryKey: AUTH_ME_KEY });
  };

  const acceptMutation = useMutation({
    mutationFn: acceptInviteByIdAction,
    onSuccess: (res) => {
      toast({ title: "Joined!", description: res.message });
      invalidate();
      navigate("/dashboard");
    },
    onError: (err: any) => {
      toast({
        title: "Could Not Join",
        description: err?.message || "This invite could not be accepted.",
        variant: "destructive",
      });
      invalidate();
    },
  });

  const declineMutation = useMutation({
    mutationFn: declineInviteByIdAction,
    onSuccess: () => {
      toast({ title: "Invite declined" });
      invalidate();
    },
    onError: () => invalidate(),
  });

  if (!invites?.length) return null;

  return (
    <div className="space-y-3">
      {invites.map((inv: MyInvite) => (
        <Card
          key={inv.id}
          className="border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"
        >
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
                <Building2 className="h-5 w-5 text-primary" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  You've been invited to join {inv.organization.name}
                </p>
                {inv.phoneNumber && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    Allocated number:
                    <span className="font-mono font-semibold text-foreground">
                      {inv.phoneNumber.number}
                    </span>
                    <span className="text-muted-foreground">
                      (prefix {inv.organization.numberPrefix})
                    </span>
                  </p>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Expires {new Date(inv.expiresAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={acceptMutation.isPending || declineMutation.isPending}
                onClick={() => declineMutation.mutate(inv.id)}
              >
                <X className="mr-1 h-4 w-4" />
                Decline
              </Button>
              <Button
                size="sm"
                disabled={acceptMutation.isPending || declineMutation.isPending}
                onClick={() => acceptMutation.mutate(inv.id)}
              >
                {acceptMutation.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1 h-4 w-4" />
                )}
                Accept & Join
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
