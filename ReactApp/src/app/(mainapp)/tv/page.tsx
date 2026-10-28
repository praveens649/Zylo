import { RequireCustomer } from "@/app/(mainapp)/_components/require-permission";
import TvStore from "./_components/tv-store";

export default function TvPage() {
  return (
    <RequireCustomer adminHref="/tv-admin">
      <TvStore />
    </RequireCustomer>
  );
}
