import { RequireCustomer } from "@/app/(mainapp)/_components/require-permission";
import { MyWifi } from "../_components/my-wifi";

export default function MyWifiPage() {
  return (
    <RequireCustomer adminHref="/wifi-admin">
      <MyWifi />
    </RequireCustomer>
  );
}
