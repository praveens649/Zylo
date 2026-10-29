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
import SimsPage from "@/app/(mainapp)/sims/page";
import EditUserPage from "@/app/(mainapp)/users/[userId]/edit/page";
import OrdersPage from "@/app/(mainapp)/orders/page";
import PaymentsPage from "@/app/(mainapp)/payments/page";
import PlansPage from "@/app/(mainapp)/plans/page";
import RechargePage from "@/app/(mainapp)/recharge/page";
import EsimPage from "@/app/(mainapp)/esim/page";
import EsimPlansPage from "@/app/(mainapp)/esim-plans/page";
import ProfilePage from "@/app/(mainapp)/profile/page";
import TvPage from "@/app/(mainapp)/tv/page";
import MyTvPage from "@/app/(mainapp)/tv/my/page";
import TvSuccessPage from "@/app/(mainapp)/tv/success/page";
import TvAdminPage from "@/app/(mainapp)/tv-admin/page";

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
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/dashboard" element={<CustomerDashboardPage />} />
            <Route path="/recharge" element={<RechargePage />} />
            <Route path="/esim" element={<EsimPage />} />
            <Route path="/esim-plans" element={<EsimPlansPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/sims" element={<SimsPage />} />
            <Route path="/users/:userId/edit" element={<EditUserPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/tv" element={<TvPage />} />
            <Route path="/tv/my" element={<MyTvPage />} />
            <Route path="/tv/success" element={<TvSuccessPage />} />
            <Route path="/tv-admin" element={<TvAdminPage />} />
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Providers>
    </BrowserRouter>
  );
}
