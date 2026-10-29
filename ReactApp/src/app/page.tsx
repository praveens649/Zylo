import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { authService, AUTH_ME_KEY } from "@/api/auth.api";
import { authToken } from "@/lib/api";
import HeroSection from "./_components/landing/hero-section";
import ActivationSection from "./_components/landing/activation-section";
import FeaturesSection from "./_components/landing/features-section";
import DashboardSection from "./_components/landing/dashboard-section";
import GetStartedSection from "./_components/landing/get-started-section";

/**
 * Public landing page. Authenticated users are sent straight to their
 * console — the landing is only for signed-out visitors.
 */
export default function Home() {
  const token = authToken.get();
  const { data, isPending } = useQuery({
    queryKey: AUTH_ME_KEY,
    queryFn: authService.me,
    enabled: !!token,
    retry: false,
  });

  if (token && isPending) {
    return <div className="min-h-screen bg-background" />;
  }

  if (data?.user) {
    return (
      <Navigate
        to={data.user.role === "SUPER_ADMIN" ? "/users" : "/dashboard"}
        replace
      />
    );
  }

  return (
    <div className="bg-white">
      <HeroSection />
      <ActivationSection />
      <FeaturesSection />
      <DashboardSection />
      <GetStartedSection />
    </div>
  );
}
