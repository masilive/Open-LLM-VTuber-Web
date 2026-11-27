export interface DisplayableMessageLike {
  content?: string;
  type?: string;
  status?: "running" | "completed" | "error";
}

/**
 * Decide whether a stored chat entry is meaningful enough to render.
 */
export function isDisplayableChatMessage(
  message: DisplayableMessageLike,
): boolean {
  if (message.content) return true;
  if (message.type !== "tool_call_status") return false;
  return (
    message.status === "running" ||
    message.status === "completed" ||
    message.status === "error"
  );
}

/**
 * Filter messages without mutating the backing history array.
 */
export function filterDisplayableMessages<T extends DisplayableMessageLike>(
  messages: T[],
): T[] {
  return messages.filter(isDisplayableChatMessage);
}
