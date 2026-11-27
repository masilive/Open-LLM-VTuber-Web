import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTextInput } from "./use-text-input";

const mocks = vi.hoisted(() => ({
  wsContextPresent: true,
  aiState: "idle",
  autoStopMic: true,
  sendMessage: vi.fn(),
  interrupt: vi.fn(),
  appendHumanMessage: vi.fn(),
  stopMic: vi.fn(),
  captureAllMedia: vi.fn(),
}));

vi.mock("@/context/websocket-context", () => ({
  useWebSocket: () =>
    mocks.wsContextPresent ? { sendMessage: mocks.sendMessage } : null,
}));

vi.mock("@/context/ai-state-context", () => ({
  useAiState: () => ({ aiState: mocks.aiState }),
}));

vi.mock("@/components/canvas/live2d", () => ({
  useInterrupt: () => ({ interrupt: mocks.interrupt }),
}));

vi.mock("@/context/chat-history-context", () => ({
  useChatHistory: () => ({ appendHumanMessage: mocks.appendHumanMessage }),
}));

vi.mock("@/context/vad-context", () => ({
  useVAD: () => ({ stopMic: mocks.stopMic, autoStopMic: mocks.autoStopMic }),
}));

vi.mock("@/hooks/utils/use-media-capture", () => ({
  useMediaCapture: () => ({ captureAllMedia: mocks.captureAllMedia }),
}));

function inputEvent(value: string) {
  return { target: { value } } as React.ChangeEvent<HTMLInputElement>;
}

describe("useTextInput", () => {
  beforeEach(() => {
    mocks.wsContextPresent = true;
    mocks.aiState = "idle";
    mocks.autoStopMic = true;
    mocks.captureAllMedia.mockResolvedValue([
      {
        source: "camera",
        data: "data:image/jpeg;base64,camera",
        mime_type: "image/jpeg",
      },
    ]);
    vi.clearAllMocks();
  });

  it("rejects blank input without touching transport or history", async () => {
    const { result } = renderHook(() => useTextInput());
    await expect(result.current.handleSend()).resolves.toBe(false);
    expect(mocks.sendMessage).not.toHaveBeenCalled();
    expect(mocks.appendHumanMessage).not.toHaveBeenCalled();
    expect(mocks.captureAllMedia).not.toHaveBeenCalled();
  });

  it("sends trimmed text with captured and manually attached images, then clears the draft", async () => {
    mocks.aiState = "thinking-speaking";
    const { result } = renderHook(() => useTextInput());

    act(() => {
      result.current.setInputText(inputEvent("  hello companion  "));
    });

    const manualImage = {
      source: "upload",
      data: "data:image/png;base64,upload",
      mime_type: "image/png",
    };
    let sent = false;
    await act(async () => {
      sent = await result.current.handleSend([manualImage]);
    });
    expect(sent).toBe(true);

    expect(mocks.interrupt).toHaveBeenCalledTimes(1);
    expect(mocks.captureAllMedia).toHaveBeenCalledTimes(1);
    expect(mocks.appendHumanMessage).toHaveBeenCalledWith("hello companion");
    expect(mocks.sendMessage).toHaveBeenCalledWith({
      type: "text-input",
      text: "hello companion",
      images: [
        {
          source: "camera",
          data: "data:image/jpeg;base64,camera",
          mime_type: "image/jpeg",
        },
        manualImage,
      ],
    });
    expect(mocks.stopMic).toHaveBeenCalledTimes(1);
    expect(result.current.inputText).toBe("");
  });

  it("does not interrupt a quiet AI and does not stop the microphone when auto-stop is off", async () => {
    mocks.autoStopMic = false;
    const { result } = renderHook(() => useTextInput());

    act(() => {
      result.current.setInputText(inputEvent("hello"));
    });
    await result.current.handleSend();

    expect(mocks.interrupt).not.toHaveBeenCalled();
    expect(mocks.stopMic).not.toHaveBeenCalled();
  });

  it("fails safely when no websocket context is available", async () => {
    mocks.wsContextPresent = false;
    const { result } = renderHook(() => useTextInput());

    act(() => {
      result.current.setInputText(inputEvent("hello"));
    });

    await expect(result.current.handleSend()).resolves.toBe(false);
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  it("uses Enter to send unless shifted or composing", async () => {
    const { result } = renderHook(() => useTextInput());
    act(() => {
      result.current.setInputText(inputEvent("hello"));
    });

    const preventDefault = vi.fn();
    act(() => {
      result.current.handleKeyPress({
        key: "Enter",
        shiftKey: true,
        preventDefault,
      } as never);
    });
    expect(preventDefault).not.toHaveBeenCalled();

    act(() => {
      result.current.handleCompositionStart();
    });
    act(() => {
      result.current.handleKeyPress({
        key: "Enter",
        shiftKey: false,
        preventDefault,
      } as never);
    });
    expect(preventDefault).not.toHaveBeenCalled();

    act(() => {
      result.current.handleCompositionEnd();
    });
    act(() => {
      result.current.handleKeyPress({
        key: "Enter",
        shiftKey: false,
        preventDefault,
      } as never);
    });
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});
