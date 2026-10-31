import { Navigate } from "react-router-dom";

export default function MyWifiPage() {
  return <Navigate to="/wifi?tab=my" replace />;
}
