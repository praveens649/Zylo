import { Navigate } from "react-router-dom";

export default function MyTvPage() {
  return <Navigate to="/tv?tab=my" replace />;
}
