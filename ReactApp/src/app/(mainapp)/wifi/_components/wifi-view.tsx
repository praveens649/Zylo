"use client";

import { useSearchParams } from "react-router-dom";
import { useWifiConnections } from "../_hooks/use-wifi";
import { WifiStore } from "./wifi-store";
import { MyWifi } from "./my-wifi";

export function WifiView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const connsQ = useWifiConnections();
  const connections = connsQ.data ?? [];

  const tab: "browse" | "my" = searchParams.get("tab") === "my" ? "my" : "browse";

  const handleTabChange = (nextTab: "browse" | "my") => {
    setSearchParams({ tab: nextTab }, { replace: true });
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
