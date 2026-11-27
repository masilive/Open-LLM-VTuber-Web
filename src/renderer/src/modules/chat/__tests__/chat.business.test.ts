import { describe, expect, it } from "vitest";
import {
  filterDisplayableMessages,
  isDisplayableChatMessage,
} from "../chat.business";

describe("chat message visibility", () => {
  it("keeps messages with content regardless of type", () => {
    expect(isDisplayableChatMessage({ content: "hello" })).toBe(true);
    expect(
      isDisplayableChatMessage({ content: "hello", type: "unknown" }),
    ).toBe(true);
  });

  it("drops empty non-tool messages", () => {
    expect(isDisplayableChatMessage({})).toBe(false);
    expect(isDisplayableChatMessage({ type: "audio" })).toBe(false);
  });

  it("keeps running, completed, and failed tool states", () => {
    for (const status of ["running", "completed", "error"] as const) {
      expect(
        isDisplayableChatMessage({ type: "tool_call_status", status }),
      ).toBe(true);
    }
  });

  it("drops tool states with no useful status", () => {
    expect(isDisplayableChatMessage({ type: "tool_call_status" })).toBe(false);
  });

  it("filters without mutating the input array", () => {
    const input = [
      { content: "hello" },
      {},
      { type: "tool_call_status", status: "running" as const },
    ];
    expect(filterDisplayableMessages(input)).toEqual([input[0], input[2]]);
    expect(input).toHaveLength(3);
  });
});
