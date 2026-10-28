import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { authService, AUTH_ME_KEY } from "@/api/auth.api";
import { authToken } from "@/lib/api";

export default function Home() {
  const token = authToken.get();
  const { data, isPending, error } = useQuery({
    queryKey: AUTH_ME_KEY,
    queryFn: authService.me,
    enabled: !!token,
    retry: false,
  });

  if (!token || error) {
    return <Navigate to="/login" replace />;
  }

  if (isPending || !data) {
    return <div className="min-h-screen bg-background" />;
  }

  if (data.user.role === "SUPER_ADMIN") {
    return <Navigate to="/users" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
