import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionStatus } from "../ConnectionStatus";
import { ConnectionStatusModel } from "../connection.abstractions";
import { renderWithProviders } from "@/test/render";

const mocks = vi.hoisted(() => ({
  reconnect: vi.fn(),
  model: null as ConnectionStatusModel | null,
}));

vi.mock("../use-connection-status", () => ({
  useConnectionStatus: () => ({
    model: mocks.model,
    reconnect: mocks.reconnect,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function createModel(
  overrides: Partial<ConnectionStatusModel> = {},
): ConnectionStatusModel {
  return {
    state: "OPEN",
    quality: "excellent",
    tone: "success",
    isConnected: true,
    isConnecting: false,
    canReconnect: false,
    stats: {
      count: 2,
      latestMs: 42,
      averageMs: 61,
      minimumMs: 42,
      maximumMs: 80,
    },
    samples: [
      { latencyMs: 80, at: 1 },
      { latencyMs: 42, at: 2 },
    ],
    ...overrides,
  };
}

describe("ConnectionStatus", () => {
  beforeEach(() => {
    mocks.model = createModel();
    vi.clearAllMocks();
  });

  it("shows a connected pill with latest latency and expandable health details", async () => {
    renderWithProviders(<ConnectionStatus />);

    expect(screen.getByText("connection.connected")).toBeInTheDocument();
    expect(screen.getAllByText("42 ms").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("connection.connected"));

    expect(
      await screen.findByText("connection.heartbeatHelp"),
    ).toBeInTheDocument();
    expect(screen.getByText("61 ms")).toBeInTheDocument();
    expect(screen.getByText("42–80 ms")).toBeInTheDocument();
    expect(
      screen.getByText("connection.quality.excellent"),
    ).toBeInTheDocument();
    expect(screen.getByText("2 ×")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /connection.reconnect/ }),
    ).not.toBeInTheDocument();
  });

  it("shows offline fallbacks and exposes reconnection when available", async () => {
    mocks.model = createModel({
      state: "CLOSED",
      quality: "offline",
      tone: "danger",
      isConnected: false,
      canReconnect: true,
      stats: {
        count: 0,
        latestMs: null,
        averageMs: null,
        minimumMs: null,
        maximumMs: null,
      },
      samples: [],
    });
    renderWithProviders(<ConnectionStatus />);

    expect(screen.getByText("connection.offline")).toBeInTheDocument();
    fireEvent.click(screen.getByText("connection.offline"));

    expect(
      await screen.findByText("connection.waitingForHeartbeat"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
    fireEvent.click(
      screen.getByRole("button", { name: /connection.reconnect/ }),
    );
    expect(mocks.reconnect).toHaveBeenCalledTimes(1);
  });

  it("renders the connecting state without a reconnect action", async () => {
    mocks.model = createModel({
      state: "CONNECTING",
      quality: "offline",
      tone: "warning",
      isConnected: false,
      isConnecting: true,
      canReconnect: false,
      stats: {
        count: 0,
        latestMs: null,
        averageMs: null,
        minimumMs: null,
        maximumMs: null,
      },
      samples: [],
    });
    renderWithProviders(<ConnectionStatus />);

    expect(screen.getByText("connection.connecting")).toBeInTheDocument();
    fireEvent.click(screen.getByText("connection.connecting"));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /connection.reconnect/ }),
      ).not.toBeInTheDocument(),
    );
  });
});
