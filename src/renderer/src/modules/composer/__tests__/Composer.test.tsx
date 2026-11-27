import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { Composer } from "../Composer";
import { MAX_IMAGE_BYTES } from "../composer.business";
import { renderWithProviders } from "@/test/render";

const mocks = vi.hoisted(() => ({
  inputValue: "hello",
  wsState: "OPEN" as "CONNECTING" | "OPEN" | "CLOSING" | "CLOSED",
  aiState: "idle" as string,
  micOn: true,
  handleInputChange: vi.fn(),
  handleCompositionStart: vi.fn(),
  handleCompositionEnd: vi.fn(),
  handleInterrupt: vi.fn(),
  handleMicToggle: vi.fn(),
  handleSend: vi.fn(),
  toastCreate: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/context/websocket-context", () => ({
  useWebSocket: () => ({ wsState: mocks.wsState }),
}));

vi.mock("@/hooks/footer/use-footer", () => ({
  useFooter: () => ({
    inputValue: mocks.inputValue,
    handleInputChange: mocks.handleInputChange,
    handleCompositionStart: mocks.handleCompositionStart,
    handleCompositionEnd: mocks.handleCompositionEnd,
    handleInterrupt: mocks.handleInterrupt,
    handleMicToggle: mocks.handleMicToggle,
    handleSend: mocks.handleSend,
    micOn: mocks.micOn,
    aiState: mocks.aiState,
  }),
}));

vi.mock("@/components/footer/ai-state-indicator", () => ({
  default: () => <div data-testid="ai-state-indicator" />,
}));

vi.mock("@/components/ui/toaster", () => ({
  toaster: { create: mocks.toastCreate },
}));

function imageFile(name: string, size = 10, type = "image/png"): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function uploadFiles(container: HTMLElement, files: File[]) {
  const input = container.querySelector('input[type="file"]');
  expect(input).not.toBeNull();
  fireEvent.change(input as HTMLInputElement, { target: { files } });
}

describe("Composer", () => {
  beforeEach(() => {
    mocks.inputValue = "hello";
    mocks.wsState = "OPEN";
    mocks.aiState = "idle";
    mocks.micOn = true;
    mocks.handleSend.mockResolvedValue(true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders accessible composer controls and submits through the send action", async () => {
    renderWithProviders(<Composer />);

    expect(screen.getByLabelText("footer.typeYourMessage")).toBeInTheDocument();
    expect(screen.getByText("footer.keyboardHint")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "footer.microphoneOn" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "footer.promptAi" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "footer.send" }));
    await waitFor(() => expect(mocks.handleSend).toHaveBeenCalledWith([]));
  });

  it("changes the interrupt label while the AI is speaking and forwards control actions", () => {
    mocks.aiState = "thinking-speaking";
    renderWithProviders(<Composer />);

    fireEvent.click(
      screen.getByRole("button", { name: "footer.interruptConversation" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "footer.microphoneOn" }),
    );

    expect(mocks.handleInterrupt).toHaveBeenCalledTimes(1);
    expect(mocks.handleMicToggle).toHaveBeenCalledTimes(1);
  });

  it("disables submission for blank input or a closed connection", () => {
    mocks.inputValue = "   ";
    const { rerender } = renderWithProviders(<Composer />);
    expect(screen.getByRole("button", { name: "footer.send" })).toBeDisabled();

    mocks.inputValue = "hello";
    mocks.wsState = "CLOSED";
    rerender(<Composer />);
    expect(screen.getByRole("button", { name: "footer.send" })).toBeDisabled();
    expect(mocks.handleSend).not.toHaveBeenCalled();
  });

  it("submits on Enter but preserves Shift+Enter newline behavior", async () => {
    renderWithProviders(<Composer />);
    const input = screen.getByLabelText("footer.typeYourMessage");

    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(mocks.handleSend).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(mocks.handleSend).toHaveBeenCalledTimes(1));
  });

  it("does not submit during IME composition and forwards composition events", async () => {
    renderWithProviders(<Composer />);
    const input = screen.getByLabelText("footer.typeYourMessage");

    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mocks.handleCompositionStart).toHaveBeenCalledTimes(1);
    expect(mocks.handleSend).not.toHaveBeenCalled();

    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mocks.handleCompositionEnd).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mocks.handleSend).toHaveBeenCalledTimes(1));
  });

  it("accepts image attachments, previews them, sends their payload, and removes them", async () => {
    const { container } = renderWithProviders(<Composer />);
    uploadFiles(container, [imageFile("cat.png", 100)]);

    expect(await screen.findByText("cat.png")).toBeInTheDocument();
    expect(screen.getByText("1 KB")).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "footer.send" }));
    await waitFor(() => expect(mocks.handleSend).toHaveBeenCalled());
    const payload = mocks.handleSend.mock.calls[0][0];
    expect(payload).toHaveLength(1);
    expect(payload[0]).toMatchObject({
      source: "upload",
      mime_type: "image/png",
    });
    expect(payload[0].data).toMatch(/^data:image\/png/);

    uploadFiles(container, [imageFile("dog.png", 100)]);
    expect(await screen.findByText("dog.png")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "footer.removeAttachment" }),
    );
    await waitFor(() =>
      expect(screen.queryByText("dog.png")).not.toBeInTheDocument(),
    );
  });

  it("warns for unsupported and oversized files without reading them into the draft", async () => {
    const { container } = renderWithProviders(<Composer />);
    uploadFiles(container, [imageFile("notes.txt", 10, "text/plain")]);
    uploadFiles(container, [imageFile("huge.png", MAX_IMAGE_BYTES + 1)]);

    await waitFor(() => {
      expect(mocks.toastCreate).toHaveBeenCalledWith(
        expect.objectContaining({ title: "footer.attachmentUnsupported" }),
      );
      expect(mocks.toastCreate).toHaveBeenCalledWith(
        expect.objectContaining({ title: "footer.attachmentTooLarge" }),
      );
    });
    expect(screen.queryByText("notes.txt")).not.toBeInTheDocument();
    expect(screen.queryByText("huge.png")).not.toBeInTheDocument();
  });

  it("bounds attachment count and reports the limit", async () => {
    const { container } = renderWithProviders(<Composer />);
    uploadFiles(container, [
      imageFile("one.png"),
      imageFile("two.png"),
      imageFile("three.png"),
      imageFile("four.png"),
    ]);

    await waitFor(() =>
      expect(mocks.toastCreate).toHaveBeenCalledWith(
        expect.objectContaining({ title: "footer.attachmentLimit" }),
      ),
    );
    expect(await screen.findByText("one.png")).toBeInTheDocument();
    expect(screen.getByText("two.png")).toBeInTheDocument();
    expect(screen.getByText("three.png")).toBeInTheDocument();
    expect(screen.queryByText("four.png")).not.toBeInTheDocument();
  });

  it("surfaces image read failures instead of silently dropping them", async () => {
    class ErrorFileReader {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        setTimeout(() => this.onerror?.(), 0);
      }
    }
    vi.stubGlobal("FileReader", ErrorFileReader);

    const { container } = renderWithProviders(<Composer />);
    uploadFiles(container, [imageFile("broken.png")]);

    await waitFor(() =>
      expect(mocks.toastCreate).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error" }),
      ),
    );
  });

  it("handles an empty file selection safely", () => {
    const { container } = renderWithProviders(<Composer />);
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: null } });
    expect(mocks.toastCreate).not.toHaveBeenCalled();
  });

  it("keeps attachments when submission fails at the transport seam", async () => {
    mocks.handleSend.mockResolvedValue(false);
    const { container } = renderWithProviders(<Composer />);
    uploadFiles(container, [imageFile("cat.png")]);
    expect(await screen.findByText("cat.png")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "footer.send" }));
    await waitFor(() => expect(mocks.handleSend).toHaveBeenCalled());
    expect(screen.getByText("cat.png")).toBeInTheDocument();
  });

  it("supports collapse toggle mouse and keyboard interaction", () => {
    const onToggle = vi.fn();
    renderWithProviders(<Composer isCollapsed onToggle={onToggle} />);
    const toggle = screen.getByRole("button", { name: "Expand composer" });

    fireEvent.click(toggle);
    fireEvent.keyDown(toggle, { key: "Enter" });
    fireEvent.keyDown(toggle, { key: " " });
    fireEvent.keyDown(toggle, { key: "Escape" });

    expect(onToggle).toHaveBeenCalledTimes(3);
  });

  it("opens the file picker from the attachment affordance", () => {
    const { container } = renderWithProviders(<Composer />);
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click").mockImplementation(() => {});
    fireEvent.click(screen.getByRole("button", { name: "footer.attachImage" }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("forwards text editing to the input hook", () => {
    renderWithProviders(<Composer />);
    fireEvent.change(screen.getByLabelText("footer.typeYourMessage"), {
      target: { value: "updated" },
    });
    expect(mocks.handleInputChange).toHaveBeenCalledTimes(1);
  });

  it("returns immediately when keyboard submission is not currently allowed", () => {
    mocks.inputValue = "   ";
    renderWithProviders(<Composer />);
    fireEvent.keyDown(screen.getByLabelText("footer.typeYourMessage"), {
      key: "Enter",
    });
    expect(mocks.handleSend).not.toHaveBeenCalled();
  });

  it("renders the microphone-off visual and accessible state", () => {
    mocks.micOn = false;
    renderWithProviders(<Composer />);
    const button = screen.getByRole("button", { name: "footer.microphoneOff" });
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("uses crypto randomUUID when available for attachment identity", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "fixed-id" });
    const { container } = renderWithProviders(<Composer />);
    uploadFiles(container, [imageFile("crypto.png")]);
    expect(await screen.findByText("crypto.png")).toBeInTheDocument();
  });

  it("falls back to deterministic attachment identity when crypto is unavailable", async () => {
    vi.stubGlobal("crypto", undefined);
    const { container } = renderWithProviders(<Composer />);
    uploadFiles(container, [imageFile("fallback.png")]);
    expect(await screen.findByText("fallback.png")).toBeInTheDocument();
  });
});
