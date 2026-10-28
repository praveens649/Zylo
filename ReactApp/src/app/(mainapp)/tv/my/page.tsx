import { RequireCustomer } from "@/app/(mainapp)/_components/require-permission";
import MyTv from "../_components/my-tv";

export default function MyTvPage() {
  return (
    <RequireCustomer adminHref="/tv-admin">
      <MyTv />
    </RequireCustomer>
  );
}
