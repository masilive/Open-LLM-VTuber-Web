import { useEffect, useMemo, useRef, useState } from "react";
import { useWebSocket } from "@/context/websocket-context";
import { wsService } from "@/services/websocket-service";
import { ConnectionState, LatencySample } from "./connection.abstractions";
import {
  appendLatencySample,
  buildConnectionStatusModel,
} from "./connection.business";

/**
 * Adapter hook that binds the WebSocket transport seam to the connection model.
 */
export function useConnectionStatus() {
  const { wsState, reconnect } = useWebSocket();
  const [samples, setSamples] = useState<LatencySample[]>([]);
  const previousStateRef = useRef(wsState);

  useEffect(() => {
    const subscription = wsService.onLatency((latencyMs) => {
      setSamples((current) =>
        appendLatencySample(current, { latencyMs, at: Date.now() }),
      );
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const previousState = previousStateRef.current;
    previousStateRef.current = wsState;
    if (previousState === "OPEN" && wsState !== "OPEN") {
      setSamples([]);
    }
  }, [wsState]);

  const model = useMemo(
    () => buildConnectionStatusModel(wsState as ConnectionState, samples),
    [wsState, samples],
  );

  return { model, reconnect };
}
