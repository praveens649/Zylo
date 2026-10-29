import { RequireAdmin } from "@/app/(mainapp)/_components/require-permission";
import LoansAdminView from "./_components/loans-admin-view";

export default function LoansAdminPage() {
  return (
    <RequireAdmin>
      <LoansAdminView />
    </RequireAdmin>
  );
}
