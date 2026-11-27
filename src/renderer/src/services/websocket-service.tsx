/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-use-before-define */
import { Subject } from "rxjs";
import { ModelInfo } from "@/context/live2d-config-context";
import { HistoryInfo } from "@/context/websocket-context";
import { ConfigFile } from "@/context/character-config-context";
import { toaster } from "@/components/ui/toaster";

export interface DisplayText {
  text: string;
  name: string;
  avatar: string;
}

interface BackgroundFile {
  name: string;
  url: string;
}

export interface AudioPayload {
  type: "audio";
  audio?: string;
  volumes?: number[];
  slice_length?: number;
  display_text?: DisplayText;
  actions?: Actions;
}

export interface Message {
  id: string;
  content: string;
  role: "ai" | "human";
  timestamp: string;
  name?: string;
  avatar?: string;

  // Fields for different message types (make optional)
  type?: "text" | "tool_call_status"; // Add possible types, default to 'text' if omitted
  tool_id?: string; // Specific to tool calls
  tool_name?: string; // Specific to tool calls
  status?: "running" | "completed" | "error"; // Specific to tool calls
}

export interface Actions {
  expressions?: string[] | number[];
  pictures?: string[];
  sounds?: string[];
}

export interface MessageEvent {
  tool_id: any;
  tool_name: any;
  name: any;
  status: any;
  content: string;
  timestamp: string;
  type: string;
  audio?: string;
  volumes?: number[];
  slice_length?: number;
  files?: BackgroundFile[];
  actions?: Actions;
  text?: string;
  model_info?: ModelInfo;
  conf_name?: string;
  conf_uid?: string;
  uids?: string[];
  messages?: Message[];
  history_uid?: string;
  success?: boolean;
  histories?: HistoryInfo[];
  configs?: ConfigFile[];
  message?: string;
  members?: string[];
  is_owner?: boolean;
  client_uid?: string;
  forwarded?: boolean;
  display_text?: DisplayText;
  live2d_model?: string;
  browser_view?: {
    debuggerFullscreenUrl: string;
    debuggerUrl: string;
    pages: {
      id: string;
      url: string;
      faviconUrl: string;
      title: string;
      debuggerUrl: string;
      debuggerFullscreenUrl: string;
    }[];
    wsUrl: string;
    sessionId?: string;
  };
}

// Get translation function for error messages
const getTranslation = () => {
  try {
    const i18next = require("i18next").default;
    return i18next.t.bind(i18next);
  } catch (e) {
    // Fallback if i18next is not available
    return (key: string) => key;
  }
};

class WebSocketService {
  private static instance: WebSocketService;

  private ws: WebSocket | null = null;

  private messageSubject = new Subject<MessageEvent>();

  private stateSubject = new Subject<
    "CONNECTING" | "OPEN" | "CLOSING" | "CLOSED"
  >();

  private latencySubject = new Subject<number>();

  private currentState: "CONNECTING" | "OPEN" | "CLOSING" | "CLOSED" = "CLOSED";

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  private heartbeatSentAt: number | null = null;

  private heartbeatInFlight = false;

  private latestLatencyMs: number | null = null;

  static getInstance() {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.sendHeartbeat();
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), 15000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.heartbeatSentAt = null;
    this.heartbeatInFlight = false;
    this.latestLatencyMs = null;
  }

  private sendHeartbeat() {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    if (
      this.heartbeatInFlight &&
      this.heartbeatSentAt !== null &&
      performance.now() - this.heartbeatSentAt < 12000
    ) {
      return;
    }

    try {
      this.heartbeatSentAt = performance.now();
      this.heartbeatInFlight = true;
      this.ws.send(JSON.stringify({ type: "heartbeat" }));
    } catch (error) {
      console.warn("Failed to send heartbeat:", error);
      this.heartbeatSentAt = null;
      this.heartbeatInFlight = false;
    }
  }

  private handleHeartbeatAck() {
    if (!this.heartbeatInFlight || this.heartbeatSentAt === null) return;
    const latencyMs = Math.max(
      0,
      Math.round(performance.now() - this.heartbeatSentAt),
    );
    this.heartbeatSentAt = null;
    this.heartbeatInFlight = false;
    this.latestLatencyMs = latencyMs;
    this.latencySubject.next(latencyMs);
  }

  private initializeConnection() {
    this.sendMessage({
      type: "fetch-backgrounds",
    });
    this.sendMessage({
      type: "fetch-configs",
    });
    this.sendMessage({
      type: "fetch-history-list",
    });
    this.sendMessage({
      type: "create-new-history",
    });
  }

  connect(url: string) {
    if (
      this.ws?.readyState === WebSocket.CONNECTING ||
      this.ws?.readyState === WebSocket.OPEN
    ) {
      this.disconnect();
    }

    try {
      this.ws = new WebSocket(url);
      this.currentState = "CONNECTING";
      this.stateSubject.next("CONNECTING");

      this.ws.onopen = () => {
        this.currentState = "OPEN";
        this.stateSubject.next("OPEN");
        this.startHeartbeat();
        this.initializeConnection();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "heartbeat-ack") {
            this.handleHeartbeatAck();
            return;
          }
          this.messageSubject.next(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
          toaster.create({
            title: `${getTranslation()("error.failedParseWebSocket")}: ${error}`,
            type: "error",
            duration: 2000,
          });
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.currentState = "CLOSED";
        this.stateSubject.next("CLOSED");
      };

      this.ws.onerror = () => {
        this.stopHeartbeat();
        this.currentState = "CLOSED";
        this.stateSubject.next("CLOSED");
      };
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      this.currentState = "CLOSED";
      this.stateSubject.next("CLOSED");
    }
  }

  sendMessage(message: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not open. Unable to send message:", message);
      toaster.create({
        title: getTranslation()("error.websocketNotOpen"),
        type: "error",
        duration: 2000,
      });
    }
  }

  onMessage(callback: (message: MessageEvent) => void) {
    return this.messageSubject.subscribe(callback);
  }

  onStateChange(
    callback: (state: "CONNECTING" | "OPEN" | "CLOSING" | "CLOSED") => void,
  ) {
    return this.stateSubject.subscribe(callback);
  }

  onLatency(callback: (latencyMs: number) => void) {
    if (this.latestLatencyMs !== null) {
      callback(this.latestLatencyMs);
    }
    return this.latencySubject.subscribe(callback);
  }

  disconnect() {
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
  }

  getCurrentState() {
    return this.currentState;
  }
}

export const wsService = WebSocketService.getInstance();
