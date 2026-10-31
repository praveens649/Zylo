import { RequireCustomer } from "@/app/(mainapp)/_components/require-permission";
import TvView from "./_components/tv-view";

export default function TvPage() {
  return (
    <RequireCustomer adminHref="/tv-admin">
      <TvView />
    </RequireCustomer>
  );
}
