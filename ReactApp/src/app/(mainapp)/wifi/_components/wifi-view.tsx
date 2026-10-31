"use client";

import { useSearchParams } from "react-router-dom";
import { useWifiConnections } from "../_hooks/use-wifi";
import { WifiStore } from "./wifi-store";
import { MyWifi } from "./my-wifi";

export function WifiView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const connsQ = useWifiConnections();
  const connections = connsQ.data ?? [];
  const hasLive = connections.some((c) => !["CANCELLED"].includes(c.status));

  const tabParam = searchParams.get("tab");
  const tab: "browse" | "my" =
    tabParam === "my"
      ? "my"
      : tabParam === "browse"
      ? "browse"
      : hasLive
      ? "my"
      : "browse";

  const handleTabChange = (nextTab: "browse" | "my") => {
    setSearchParams(nextTab === "my" ? { tab: "my" } : {});
  };

  return (
    <div>
      {tab === "browse" ? (
        <WifiStore
          onSwitchTab={handleTabChange}
          currentTab={tab}
          connectionCount={connections.length}
        />
      ) : (
        <MyWifi
          onSwitchTab={handleTabChange}
          currentTab={tab}
          connectionCount={connections.length}
        />
      )}
    </div>
  );
}

export default WifiView;

