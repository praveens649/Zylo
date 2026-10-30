import { RequireAdmin } from "@/app/(mainapp)/_components/require-permission";
import { MusicAdminView } from "../music/_components/music-admin-view";

export default function MusicAdminPage() {
  return (
    <RequireAdmin>
      <MusicAdminView />
    </RequireAdmin>
  );
}
