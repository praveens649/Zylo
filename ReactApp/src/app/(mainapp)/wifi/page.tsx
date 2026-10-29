import { RequireCustomer } from "@/app/(mainapp)/_components/require-permission";
import { WifiStore } from "./_components/wifi-store";

export default function WifiPage() {
  return (
    <RequireCustomer adminHref="/wifi-admin">
      <WifiStore />
    </RequireCustomer>
  );
}
