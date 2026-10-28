import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Providers } from "@/app/providers";

import HomePage from "@/app/page";
import LoginPage from "@/app/login/page";
import SignupPage from "@/app/signup/page";
import NotFoundPage from "@/app/not-found";

import DashboardLayout from "@/app/(mainapp)/layout";
import OnboardingPage from "@/app/(mainapp)/onboarding/page";
import CustomerDashboardPage from "@/app/(mainapp)/dashboard/page";
import UsersPage from "@/app/(mainapp)/users/page";
import EditUserPage from "@/app/(mainapp)/users/[userId]/edit/page";
import PaymentsPage from "@/app/(mainapp)/payments/page";

export default function App() {
  return (
    <BrowserRouter>
      <Providers>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Authenticated / Main App routes wrapped in DashboardLayout */}
          <Route element={<DashboardLayout />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/dashboard" element={<CustomerDashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/:userId/edit" element={<EditUserPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Providers>
    </BrowserRouter>
  );
}
