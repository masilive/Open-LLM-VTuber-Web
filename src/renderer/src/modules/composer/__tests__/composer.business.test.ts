import { describe, expect, it } from "vitest";
import {
  attachmentsToPayload,
  canSendMessage,
  composerDraftReducer,
  formatBytes,
  initialComposerDraftState,
  MAX_COMPOSER_ATTACHMENTS,
  validateImageFile,
} from "../composer.business";
import {
  ComposerAttachment,
  ComposerDraftAction,
} from "../composer.abstractions";

const attachment = (id: string): ComposerAttachment => ({
  id,
  name: `${id}.png`,
  dataUrl: `data:image/png;base64,${id}`,
  mimeType: "image/png",
  sizeBytes: 100,
});

describe("validateImageFile", () => {
  it("accepts supported image types within the byte limit", () => {
    expect(validateImageFile("image/png", 1)).toEqual({
      valid: true,
      failure: null,
    });
    expect(validateImageFile("image/jpeg", 1024)).toEqual({
      valid: true,
      failure: null,
    });
  });

  it("rejects unsupported types before size validation", () => {
    expect(validateImageFile("text/plain", 1)).toEqual({
      valid: false,
      failure: "unsupported-type",
    });
    expect(validateImageFile("text/plain", 0)).toEqual({
      valid: false,
      failure: "unsupported-type",
    });
  });

  it("rejects empty and oversized files", () => {
    expect(validateImageFile("image/png", 0)).toEqual({
      valid: false,
      failure: "too-large",
    });
    expect(validateImageFile("image/png", -1)).toEqual({
      valid: false,
      failure: "too-large",
    });
    expect(validateImageFile("image/png", 11, 10)).toEqual({
      valid: false,
      failure: "too-large",
    });
  });
});

describe("canSendMessage", () => {
  it("requires both nonblank text and an open connection", () => {
    expect(canSendMessage("hello", "OPEN")).toBe(true);
    expect(canSendMessage("  hello  ", "OPEN")).toBe(true);
    expect(canSendMessage("   ", "OPEN")).toBe(false);
    expect(canSendMessage("hello", "CONNECTING")).toBe(false);
    expect(canSendMessage("hello", "CLOSED")).toBe(false);
  });
});

describe("attachmentsToPayload", () => {
  it("converts each attachment into backend wire format", () => {
    expect(attachmentsToPayload([attachment("a")])).toEqual([
      {
        source: "upload",
        data: "data:image/png;base64,a",
        mime_type: "image/png",
      },
    ]);
  });
});

describe("composerDraftReducer", () => {
  it("adds attachments immutably and enforces the maximum", () => {
    let state = initialComposerDraftState;
    for (let index = 0; index < MAX_COMPOSER_ATTACHMENTS + 1; index += 1) {
      state = composerDraftReducer(state, {
        type: "add-attachment",
        attachment: attachment(String(index)),
      });
    }
    expect(state.attachments.map((item) => item.id)).toEqual(["1", "2", "3"]);
    expect(initialComposerDraftState.attachments).toHaveLength(0);
  });

  it("ignores duplicate attachment ids", () => {
    const state = composerDraftReducer(initialComposerDraftState, {
      type: "add-attachment",
      attachment: attachment("a"),
    });
    expect(
      composerDraftReducer(state, {
        type: "add-attachment",
        attachment: attachment("a"),
      }),
    ).toBe(state);
  });

  it("removes only the requested attachment", () => {
    const state = {
      attachments: [attachment("a"), attachment("b")],
    };
    expect(
      composerDraftReducer(state, { type: "remove-attachment", id: "a" })
        .attachments,
    ).toEqual([attachment("b")]);
  });

  it("clears attachments and preserves identity when already empty", () => {
    const state = { attachments: [attachment("a")] };
    expect(composerDraftReducer(state, { type: "clear-attachments" })).toBe(
      initialComposerDraftState,
    );
    expect(
      composerDraftReducer(initialComposerDraftState, {
        type: "clear-attachments",
      }),
    ).toBe(initialComposerDraftState);
  });

  it("returns the original state for an unknown action", () => {
    const unknown = { type: "unknown" } as unknown as ComposerDraftAction;
    expect(composerDraftReducer(initialComposerDraftState, unknown)).toBe(
      initialComposerDraftState,
    );
  });
});

describe("formatBytes", () => {
  it("formats invalid, small, kilobyte, and megabyte values", () => {
    expect(formatBytes(Number.NaN)).toBe("0 KB");
    expect(formatBytes(-1)).toBe("0 KB");
    expect(formatBytes(1)).toBe("1 KB");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(1536 * 1024)).toBe("1.5 MB");
  });
});
