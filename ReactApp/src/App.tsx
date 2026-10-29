import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Providers } from "@/app/providers";

import HomePage from "@/app/page";
import LoginPage from "@/app/login/page";
import SignupPage from "@/app/signup/page";
import NotFoundPage from "@/app/not-found";

import DashboardLayout from "@/app/(mainapp)/layout";
import OnboardingPage from "@/app/(mainapp)/onboarding/page";
import OrganizationPage from "@/app/(mainapp)/organization/page";
import CustomerDashboardPage from "@/app/(mainapp)/dashboard/page";
import UsersPage from "@/app/(mainapp)/users/page";
import SimsPage from "@/app/(mainapp)/sims/page";
import EditUserPage from "@/app/(mainapp)/users/[userId]/edit/page";
import OrdersPage from "@/app/(mainapp)/orders/page";
import PaymentsPage from "@/app/(mainapp)/payments/page";
import PlansPage from "@/app/(mainapp)/plans/page";
import RechargePage from "@/app/(mainapp)/recharge/page";
import DataBankPage from "@/app/(mainapp)/data-bank/page";
import QuestsPage from "@/app/(mainapp)/quests/page";
import EsimPage from "@/app/(mainapp)/esim/page";
import EsimPlansPage from "@/app/(mainapp)/esim-plans/page";
import NotificationsPage from "@/app/(mainapp)/notifications/page";
import ProfilePage from "@/app/(mainapp)/profile/page";
import TvPage from "@/app/(mainapp)/tv/page";
import MyTvPage from "@/app/(mainapp)/tv/my/page";
import TvSuccessPage from "@/app/(mainapp)/tv/success/page";
import TvAdminPage from "@/app/(mainapp)/tv-admin/page";
import WifiPage from "@/app/(mainapp)/wifi/page";
import MyWifiPage from "@/app/(mainapp)/wifi/my/page";
import WifiSuccessPage from "@/app/(mainapp)/wifi/success/page";
import WifiAdminPage from "@/app/(mainapp)/wifi-admin/page";
import SupportPage from "@/app/(mainapp)/support/page";
import SupportAdminPage from "@/app/(mainapp)/support-admin/page";
import LoansAdminPage from "@/app/(mainapp)/loans-admin/page";

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
            <Route path="/data-bank" element={<DataBankPage />} />
            <Route path="/quests" element={<QuestsPage />} />
            <Route path="/esim" element={<EsimPage />} />
            <Route path="/esim-plans" element={<EsimPlansPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/sims" element={<SimsPage />} />
            <Route path="/users/:userId/edit" element={<EditUserPage />} />
            <Route path="/organization" element={<OrganizationPage />} />
          <Route path="/orders" element={<OrdersPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/tv" element={<TvPage />} />
            <Route path="/tv/my" element={<MyTvPage />} />
            <Route path="/tv/success" element={<TvSuccessPage />} />
            <Route path="/tv-admin" element={<TvAdminPage />} />
            <Route path="/wifi" element={<WifiPage />} />
            <Route path="/wifi/my" element={<MyWifiPage />} />
            <Route path="/wifi/success" element={<WifiSuccessPage />} />
            <Route path="/wifi-admin" element={<WifiAdminPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/support-admin" element={<SupportAdminPage />} />
            <Route path="/loans-admin" element={<LoansAdminPage />} />
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Providers>
    </BrowserRouter>
  );
}
