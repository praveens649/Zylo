import { RequireCustomer } from "@/app/(mainapp)/_components/require-permission";
import SupportView from "./_components/support-view";

export default function SupportPage() {
  return (
    <RequireCustomer adminHref="/support-admin">
      <SupportView />
    </RequireCustomer>
  );
}
