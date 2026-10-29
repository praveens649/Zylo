import { RequireCustomer } from "@/app/(mainapp)/_components/require-permission";
import { WifiSuccess } from "../_components/wifi-success";

export default function WifiSuccessPage() {
  return (
    <RequireCustomer adminHref="/wifi-admin">
      <WifiSuccess />
    </RequireCustomer>
  );
}
