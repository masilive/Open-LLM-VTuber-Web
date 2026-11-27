import {
  ComposerAttachment,
  ComposerDraftAction,
  ComposerDraftState,
  ImageValidationResult,
  OutgoingImagePayload,
} from "./composer.abstractions";
import { ConnectionState } from "../connection/connection.abstractions";
export const MAX_COMPOSER_ATTACHMENTS = 3;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const initialComposerDraftState: ComposerDraftState = {
  attachments: [],
};

/**
 * Validate an image before it is read into memory or sent to the backend.
 */
export function validateImageFile(
  mimeType: string,
  sizeBytes: number,
  maxBytes = MAX_IMAGE_BYTES,
): ImageValidationResult {
  if (!SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
    return { valid: false, failure: "unsupported-type" };
  }
  if (sizeBytes <= 0 || sizeBytes > maxBytes) {
    return { valid: false, failure: "too-large" };
  }
  return { valid: true, failure: null };
}

/**
 * Decide whether the current draft may be submitted.
 */
export function canSendMessage(
  text: string,
  connectionState: ConnectionState,
): boolean {
  return connectionState === "OPEN" && text.trim().length > 0;
}

/**
 * Convert UI attachments into the backend wire format at one seam.
 */
export function attachmentsToPayload(
  attachments: ComposerAttachment[],
): OutgoingImagePayload[] {
  return attachments.map((attachment) => ({
    source: "upload",
    data: attachment.dataUrl,
    mime_type: attachment.mimeType,
  }));
}

/**
 * Reducer for attachment draft state. It is immutable, bounded, and idempotent.
 */
export function composerDraftReducer(
  state: ComposerDraftState,
  action: ComposerDraftAction,
): ComposerDraftState {
  switch (action.type) {
    case "add-attachment": {
      if (
        state.attachments.some(
          (attachment) => attachment.id === action.attachment.id,
        )
      ) {
        return state;
      }
      return {
        attachments: [...state.attachments, action.attachment].slice(
          -MAX_COMPOSER_ATTACHMENTS,
        ),
      };
    }
    case "remove-attachment":
      return {
        attachments: state.attachments.filter(
          (attachment) => attachment.id !== action.id,
        ),
      };
    case "clear-attachments":
      return state.attachments.length === 0 ? state : initialComposerDraftState;
    default:
      return state;
  }
}

/**
 * Format a byte count in a compact user-facing form.
 */
export function formatBytes(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) return "0 KB";
  if (sizeBytes < 1024 * 1024)
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
