import { RequireCustomer } from "@/app/(mainapp)/_components/require-permission";
import TvSuccess from "../_components/tv-success";

export default function TvSuccessPage() {
  return (
    <RequireCustomer adminHref="/tv-admin">
      <TvSuccess />
    </RequireCustomer>
  );
}
