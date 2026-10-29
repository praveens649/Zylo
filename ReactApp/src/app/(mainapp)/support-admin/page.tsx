import { RequireAdmin } from "@/app/(mainapp)/_components/require-permission";
import AdminSupportView from "./_components/admin-support-view";

export default function SupportAdminPage() {
  return (
    <RequireAdmin message="Administrator access is required to manage support tickets.">
      <AdminSupportView />
    </RequireAdmin>
  );
}
