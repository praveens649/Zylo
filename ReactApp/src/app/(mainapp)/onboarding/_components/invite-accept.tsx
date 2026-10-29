import { useQuery, useMutation } from "@tanstack/react-query";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { BusinessOrganization } from "@/api/onboarding.api";
import {
  lookupInviteAction,
  acceptInviteAction,
  declineInviteAction,
} from "../_actions/onboarding.actions";

interface Props {
  token: string;
  onAccepted: (organization: BusinessOrganization) => void;
  onDone: () => void;
}

/** Invite landing card — shown when `?invite=<token>` is in the URL. */
export function InviteAccept({ token, onAccepted, onDone }: Props) {
  const { data: invite, isLoading, isError } = useQuery({
    queryKey: ["invite-preview", token],
    queryFn: () => lookupInviteAction(token),
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptInviteAction(token),
    onSuccess: (res) => {
      toast({ title: "Joined!", description: res.message });
      onAccepted(res.organization);
    },
    onError: (err: any) => {
      toast({
        title: "Could Not Join",
        description: err?.message || "This invite could not be accepted.",
        variant: "destructive",
      });
      onDone();
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => declineInviteAction(token),
    onSuccess: () => onDone(),
    onError: () => onDone(),
  });

  return (
    <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
      {isLoading ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
      ) : isError || !invite || invite.status !== "PENDING" ? (
        <p className="text-sm text-muted-foreground">
          This invite is invalid or no longer active.
        </p>
      ) : (
        <>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">
              Join {invite.organization.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              You were invited to join this organization. Members get a Business
              SIM with a number from the corporate prefix{" "}
              <span className="font-mono font-semibold">
                {invite.organization.numberPrefix}
              </span>
              .
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              disabled={acceptMutation.isPending || declineMutation.isPending}
              onClick={() => declineMutation.mutate()}
            >
              Decline
            </Button>
            <Button
              className="flex-1"
              disabled={acceptMutation.isPending || declineMutation.isPending}
              onClick={() => acceptMutation.mutate()}
            >
              {acceptMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Accept & Join
            </Button>
          </div>
        </>
      )}
      {(isError || (invite && invite.status !== "PENDING")) && (
        <Button variant="outline" className="w-full" onClick={onDone}>
          Continue to Onboarding
        </Button>
      )}
    </div>
  );
}
