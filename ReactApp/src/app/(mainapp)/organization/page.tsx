import { Link } from "next/link";
import { Building2, Loader2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOnboardingStatus } from "../onboarding/_hooks/use-onboarding";
import { InvitePanel } from "../onboarding/_components/invite-panel";

/** Business SIM owner view — organization details and member invites. */
export default function OrganizationPage() {
  const { data, isLoading } = useOnboardingStatus();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const org = data?.organization;
  const membership = data?.membership;
  const isOwner = org && data?.user && org.ownerUserId === data.user.id;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Organization</h1>
        <p className="text-sm text-muted-foreground">
          Your business verification and team members.
        </p>
      </div>

      {!org ? (
        <Card className="p-8 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No organization yet — onboard a Business SIM to create one.
          </p>
          <Button asChild className="mt-4">
            <Link href="/onboarding">Start Business Onboarding</Link>
          </Button>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  {org.name}
                </CardTitle>
                <Badge
                  variant="secondary"
                  className={
                    org.status === "APPROVED"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-amber-500/10 text-amber-600"
                  }
                >
                  {org.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Corporate Prefix</p>
                <p className="font-mono font-semibold">{org.numberPrefix}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Business Type</p>
                <p className="font-medium">{org.businessType ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Registration No.</p>
                <p className="font-mono font-medium">
                  {org.registrationNumber ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Business Email</p>
                <p className="font-medium">{org.businessEmail}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium">
                  {[org.city, org.state].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
              {membership && (
                <div>
                  <p className="text-xs text-muted-foreground">Your Role</p>
                  <p className="font-medium">
                    <Users className="mr-1 inline h-3.5 w-3.5" />
                    {membership.role}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {isOwner && org.status === "APPROVED" && (
            <Card>
              <CardContent className="pt-6">
                <InvitePanel organizationId={org.id} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
