import { RequireAdmin } from "@/app/(mainapp)/_components/require-permission";
import { WifiAdminView } from "../wifi/_components/wifi-admin-view";

export default function WifiAdminPage() {
  return (
    <RequireAdmin>
      <WifiAdminView />
    </RequireAdmin>
  );
}
