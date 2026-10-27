import { RequireAdmin } from "@/app/(mainapp)/_components/require-permission";
import UsersView from "./_components/user-view";

export default function UsersPage() {
  return (
    <RequireAdmin>
      <UsersView />
    </RequireAdmin>
  );
}
