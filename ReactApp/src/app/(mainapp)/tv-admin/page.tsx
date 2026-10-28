import { RequireAdmin } from "@/app/(mainapp)/_components/require-permission";
import TvAdminView from "../tv/_components/tv-admin-view";

export default function TvAdminPage() {
  return (
    <RequireAdmin>
      <TvAdminView />
    </RequireAdmin>
  );
}
