import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { authService, AUTH_ME_KEY } from "@/api/auth.api";
import { onboardingApi, ONBOARDING_STATUS_KEY } from "@/api/onboarding.api";
import { ApiRequestError, authToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ConsoleShell } from "./console-shell";

export default function DashboardLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const { data, error, isPending, refetch } = useQuery({
    queryKey: AUTH_ME_KEY,
    queryFn: authService.me,
    retry: false,
  });

  const isCustomer = data?.user?.role === "CUSTOMER";
  const isOnboardingRoute = location.pathname === "/onboarding";
  // Incomplete customers may only visit onboarding + their dashboard
  // (where invited members see their allocated number).
  const allowedWhenIncomplete = ["/onboarding", "/dashboard"];

  // Check onboarding completion for customers
  const { data: onboardingData, isPending: isOnboardingPending } = useQuery({
    queryKey: ONBOARDING_STATUS_KEY,
    queryFn: onboardingApi.getStatus,
    enabled: !!data?.user && isCustomer,
  });

  useEffect(() => {
    if (error instanceof ApiRequestError && error.status === 401) {
      authToken.clear();
      navigate("/login", { replace: true });
    }
  }, [error, navigate]);

  // Enforce Onboarding: Customers must complete onboarding before entering the dashboard
  useEffect(() => {
    if (isCustomer && onboardingData && !isOnboardingPending) {
      if (
        !onboardingData.isComplete &&
        !allowedWhenIncomplete.includes(location.pathname)
      ) {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isCustomer, onboardingData, isOnboardingPending, isOnboardingRoute, navigate]);

  if (error) {
    if (!(error instanceof ApiRequestError && error.status === 401)) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <Card className="w-full max-w-md text-center border-border/70 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle>Can&apos;t reach the server</CardTitle>
              <CardDescription>
                {error instanceof Error ? error.message : "Something went wrong."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
              <Button variant="ghost" onClick={() => navigate("/login", { replace: true })}>
                Back to login
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  if (isPending || !data || (isCustomer && isOnboardingPending)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6" />
    );
  }

  // When on the onboarding portal, render full-screen without sidebar
  if (isOnboardingRoute) {
    return children || <Outlet />;
  }

  return (
    <ConsoleShell user={data.user}>
      {children || <Outlet />}
    </ConsoleShell>
  );
}
