import { RequireCustomer } from "@/app/(mainapp)/_components/require-permission";
import WifiView from "./_components/wifi-view";

export default function WifiPage() {
  return (
    <RequireCustomer adminHref="/wifi-admin">
      <WifiView />
    </RequireCustomer>
  );
}
