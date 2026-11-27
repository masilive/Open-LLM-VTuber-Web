import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { wsService } from "./websocket-service";

const sockets: MockWebSocket[] = [];

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readonly url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  });

  constructor(url: string) {
    this.url = url;
    sockets.push(this);
  }

  open() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  receive(message: object) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

vi.mock("@/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
}));

describe("WebSocketService heartbeat transport", () => {
  beforeEach(() => {
    sockets.length = 0;
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", MockWebSocket);
    wsService.disconnect();
  });

  afterEach(() => {
    wsService.disconnect();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("sends a heartbeat on open and initializes client state", () => {
    wsService.connect("ws://backend.test/client-ws");
    const socket = sockets[0];

    expect(socket.url).toBe("ws://backend.test/client-ws");
    socket.open();

    const sentMessages = socket.send.mock.calls.map(([payload]) =>
      JSON.parse(payload),
    );
    expect(sentMessages[0]).toEqual({ type: "heartbeat" });
    expect(sentMessages).toContainEqual({ type: "fetch-backgrounds" });
    expect(sentMessages).toContainEqual({ type: "fetch-configs" });
    expect(sentMessages).toContainEqual({ type: "fetch-history-list" });
    expect(sentMessages).toContainEqual({ type: "create-new-history" });
  });

  it("filters heartbeat acknowledgements from application messages and publishes latency", () => {
    const messages: object[] = [];
    const latencies: number[] = [];
    const messageSubscription = wsService.onMessage((message) =>
      messages.push(message),
    );
    const latencySubscription = wsService.onLatency((latency) =>
      latencies.push(latency),
    );

    wsService.connect("ws://backend.test/client-ws");
    const socket = sockets[0];
    socket.open();
    socket.receive({ type: "heartbeat-ack" });
    socket.receive({ type: "full-text", text: "hello" });

    expect(latencies).toHaveLength(1);
    expect(latencies[0]).toBeGreaterThanOrEqual(0);
    expect(messages).toEqual([{ type: "full-text", text: "hello" }]);

    messageSubscription.unsubscribe();
    latencySubscription.unsubscribe();
  });

  it("does not overlap heartbeat round trips while one is still fresh", () => {
    wsService.connect("ws://backend.test/client-ws");
    const socket = sockets[0];
    socket.open();
    socket.send.mockClear();

    vi.advanceTimersByTime(15000);
    expect(socket.send).not.toHaveBeenCalled();

    socket.receive({ type: "heartbeat-ack" });
    vi.advanceTimersByTime(15000);
    expect(socket.send).toHaveBeenCalledTimes(1);
    expect(JSON.parse(socket.send.mock.calls[0][0])).toEqual({
      type: "heartbeat",
    });
  });

  it("stops the heartbeat timer when the socket closes", () => {
    wsService.connect("ws://backend.test/client-ws");
    const socket = sockets[0];
    socket.open();
    socket.receive({ type: "heartbeat-ack" });
    socket.send.mockClear();

    socket.close();
    vi.advanceTimersByTime(45000);

    expect(socket.send).not.toHaveBeenCalled();
  });

  it("replays the latest latency to late subscribers and clears it on close", () => {
    wsService.connect("ws://backend.test/client-ws");
    const socket = sockets[0];
    socket.open();
    socket.receive({ type: "heartbeat-ack" });

    const latencies: number[] = [];
    const subscription = wsService.onLatency((latency) =>
      latencies.push(latency),
    );
    expect(latencies).toHaveLength(1);
    subscription.unsubscribe();

    socket.close();
    const afterClose: number[] = [];
    wsService.onLatency((latency) => afterClose.push(latency)).unsubscribe();
    expect(afterClose).toEqual([]);
  });
});
