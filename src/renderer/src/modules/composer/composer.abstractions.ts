export interface ComposerAttachment {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
}

export interface OutgoingImagePayload {
  source: "upload";
  data: string;
  mime_type: string;
}

export type ImageValidationFailure = "unsupported-type" | "too-large";

export interface ImageValidationResult {
  valid: boolean;
  failure: ImageValidationFailure | null;
}

export interface ComposerDraftState {
  attachments: ComposerAttachment[];
}

export type ComposerDraftAction =
  | { type: "add-attachment"; attachment: ComposerAttachment }
  | { type: "remove-attachment"; id: string }
  | { type: "clear-attachments" };
