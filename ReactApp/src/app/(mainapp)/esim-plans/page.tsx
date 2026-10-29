import { RequireAdmin } from "@/app/(mainapp)/_components/require-permission";
import { EsimPlansView } from "./_components/esim-plans-view";

export default function EsimPlansPage() {
  return (
    <RequireAdmin>
      <EsimPlansView />
    </RequireAdmin>
  );
}
