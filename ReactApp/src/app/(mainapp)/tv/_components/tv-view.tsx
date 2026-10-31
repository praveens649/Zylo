"use client";

import { useSearchParams } from "react-router-dom";
import { useTvConnections } from "../_hooks/use-tv";
import TvStore from "./tv-store";
import MyTv from "./my-tv";

export function TvView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const connsQ = useTvConnections();
  const connections = connsQ.data ?? [];

  const tab: "browse" | "my" = searchParams.get("tab") === "my" ? "my" : "browse";

  const handleTabChange = (nextTab: "browse" | "my") => {
    setSearchParams({ tab: nextTab }, { replace: true });
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
