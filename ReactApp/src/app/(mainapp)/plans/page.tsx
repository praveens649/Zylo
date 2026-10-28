import { RequireAdmin } from "@/app/(mainapp)/_components/require-permission";
import PlansView from "./_components/plans-view";

export default function PlansPage() {
  return (
    <RequireAdmin>
      <PlansView />
    </RequireAdmin>
  );
}
