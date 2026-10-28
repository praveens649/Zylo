import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { useAuthUser } from "@/lib/use-auth-user";
import { isAdmin } from "@/lib/permissions";
import { onboardingApi, ONBOARDING_STATUS_KEY } from "@/api/onboarding.api";

import { AdminDashboard } from "./_components/admin-dashboard";
import { CustomerDashboard } from "./_components/customer-dashboard";

export default function DashboardPage() {
  const { user, isPending: isUserPending } = useAuthUser();

  const isUserAdmin = isAdmin(user);

  // Retrieve customer onboarding status if non-admin
  const { data: statusData, isLoading: isStatusLoading } = useQuery({
    queryKey: ONBOARDING_STATUS_KEY,
    queryFn: onboardingApi.getStatus,
    enabled: !!user && !isUserAdmin,
  });

  if (isUserPending || (!isUserAdmin && isStatusLoading)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isUserAdmin && user) {
    return <AdminDashboard user={user} />;
  }

  return <CustomerDashboard statusData={statusData} />;
}
