"use client";

import { useSearchParams } from "react-router-dom";
import { useTvConnections } from "../_hooks/use-tv";
import TvStore from "./tv-store";
import MyTv from "./my-tv";

export function TvView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const connsQ = useTvConnections();
  const connections = connsQ.data ?? [];
  const hasLiveConn = connections.some((c) => !["CANCELLED"].includes(c.status));

  const tabParam = searchParams.get("tab");
  const tab: "browse" | "my" =
    tabParam === "my"
      ? "my"
      : tabParam === "browse"
      ? "browse"
      : hasLiveConn
      ? "my"
      : "browse";

  const handleTabChange = (nextTab: "browse" | "my") => {
    setSearchParams(nextTab === "my" ? { tab: "my" } : {});
  };

  return (
    <div>
      {tab === "browse" ? (
        <TvStore
          onSwitchTab={handleTabChange}
          currentTab={tab}
          connectionCount={connections.length}
        />
      ) : (
        <MyTv
          onSwitchTab={handleTabChange}
          currentTab={tab}
          connectionCount={connections.length}
        />
      )}
    </div>
  );
}

export default TvView;

