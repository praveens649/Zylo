import { RequireAdmin } from "@/app/(mainapp)/_components/require-permission";
import SimsView from "./_components/sims-view";

export default function SimsPage() {
  return (
    <RequireAdmin>
      <SimsView />
    </RequireAdmin>
  );
}
