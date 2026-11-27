import {
  Box,
  Flex,
  HStack,
  IconButton,
  Image,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  ChangeEvent,
  KeyboardEvent,
  useReducer,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { BsMicFill, BsMicMuteFill, BsPaperclip } from "react-icons/bs";
import { FiChevronDown, FiSend, FiX } from "react-icons/fi";
import { IoHandRightSharp } from "react-icons/io5";
import { InputGroup } from "@/components/ui/input-group";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { toaster } from "@/components/ui/toaster";
import { useWebSocket } from "@/context/websocket-context";
import { useFooter } from "@/hooks/footer/use-footer";
import { footerStyles } from "@/components/footer/footer-styles";
import AIStateIndicator from "@/components/footer/ai-state-indicator";
import {
  attachmentsToPayload,
  canSendMessage,
  composerDraftReducer,
  formatBytes,
  initialComposerDraftState,
  MAX_COMPOSER_ATTACHMENTS,
  validateImageFile,
} from "./composer.business";
import { ComposerAttachment } from "./composer.abstractions";
import { ConnectionState } from "../connection/connection.abstractions";

interface ComposerProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function createAttachment(file: File, dataUrl: string): ComposerAttachment {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${file.name}-${file.size}-${Date.now()}`;
  return {
    id,
    name: file.name,
    dataUrl,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

/**
 * Conversation composer module. Rendering is isolated from pure draft rules.
 */
export function Composer({
  isCollapsed = false,
  onToggle,
}: ComposerProps): JSX.Element {
  const { t } = useTranslation();
  const { wsState } = useWebSocket();
  const {
    inputValue,
    handleInputChange,
    handleCompositionStart,
    handleCompositionEnd,
    handleInterrupt,
    handleMicToggle,
    handleSend,
    micOn,
    aiState,
  } = useFooter();
  const [draft, dispatch] = useReducer(
    composerDraftReducer,
    initialComposerDraftState,
  );
  const [isComposing, setIsComposing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSend =
    canSendMessage(inputValue, wsState as ConnectionState) && !isSending;
  const interruptLabel =
    aiState === "thinking-speaking"
      ? t("footer.interruptConversation")
      : t("footer.promptAi");

  const submit = async () => {
    if (!canSend) return;
    setIsSending(true);
    try {
      const sent = await handleSend(attachmentsToPayload(draft.attachments));
      if (sent) dispatch({ type: "clear-attachments" });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    let acceptedCount = draft.attachments.length;
    for (const file of Array.from(files)) {
      if (acceptedCount >= MAX_COMPOSER_ATTACHMENTS) {
        toaster.create({
          title: t("footer.attachmentLimit"),
          type: "warning",
          duration: 2500,
        });
        break;
      }
      const validation = validateImageFile(file.type, file.size);
      if (!validation.valid) {
        toaster.create({
          title:
            validation.failure === "unsupported-type"
              ? t("footer.attachmentUnsupported")
              : t("footer.attachmentTooLarge"),
          type: "warning",
          duration: 3000,
        });
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        dispatch({
          type: "add-attachment",
          attachment: createAttachment(file, dataUrl),
        });
        acceptedCount += 1;
      } catch {
        toaster.create({
          title: t("error.failedCapture", { source: "upload" }),
          type: "error",
          duration: 3000,
        });
      }
    }
  };

  return (
    <Box {...footerStyles.footer.container(isCollapsed)}>
      <Box
        {...footerStyles.footer.toggleButton}
        role="button"
        tabIndex={0}
        aria-label={isCollapsed ? "Expand composer" : "Collapse composer"}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onToggle?.();
        }}
        color="whiteAlpha.600"
        style={{ transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)" }}
      >
        <FiChevronDown />
      </Box>

      <Box pt="0" px={{ base: 2, md: 4 }} pb={1}>
        <Flex
          width="100%"
          direction={{ base: "column", md: "row" }}
          gap={{ base: 1, md: 3 }}
          align={{ base: "stretch", md: "flex-end" }}
        >
          <Flex
            direction={{ base: "row", md: "column" }}
            gap={2}
            align={{ base: "center", md: "stretch" }}
            justify="space-between"
          >
            <AIStateIndicator />
            <HStack gap={2}>
              <IconActionButton
                label={
                  micOn ? t("footer.microphoneOn") : t("footer.microphoneOff")
                }
                icon={micOn ? <BsMicFill /> : <BsMicMuteFill />}
                onClick={handleMicToggle}
                active={micOn}
                tone={micOn ? "success" : "danger"}
              />
              <IconActionButton
                label={interruptLabel}
                icon={<IoHandRightSharp />}
                onClick={handleInterrupt}
                tone="warning"
              />
            </HStack>
          </Flex>

          <HStack flex={1} width="100%" align="flex-end" gap={2} minW={0}>
            <VStack flex={1} align="stretch" gap={1} minW={0}>
              {draft.attachments.length > 0 && (
                <HStack gap={2} overflowX="auto" pb={1}>
                  {draft.attachments.map((attachment) => (
                    <HStack
                      key={attachment.id}
                      bg="gray.700"
                      borderRadius="lg"
                      px={2}
                      py={1}
                      gap={2}
                      flexShrink={0}
                    >
                      <Image
                        src={attachment.dataUrl}
                        alt=""
                        boxSize="28px"
                        borderRadius="md"
                        objectFit="cover"
                      />
                      <VStack align="flex-start" gap={0} maxW="120px">
                        <Text fontSize="xs" color="gray.100" truncate>
                          {attachment.name}
                        </Text>
                        <Text fontSize="10px" color="gray.400">
                          {formatBytes(attachment.sizeBytes)}
                        </Text>
                      </VStack>
                      <IconButton
                        aria-label={t("footer.removeAttachment")}
                        size="xs"
                        variant="ghost"
                        color="gray.300"
                        onClick={() =>
                          dispatch({
                            type: "remove-attachment",
                            id: attachment.id,
                          })
                        }
                      >
                        <FiX />
                      </IconButton>
                    </HStack>
                  ))}
                </HStack>
              )}

              <InputGroup flex={1}>
                <Box position="relative" width="100%">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    hidden
                    onChange={(event) => {
                      handleFiles(event.target.files);
                      event.target.value = "";
                    }}
                  />
                  <IconButton
                    aria-label={t("footer.attachImage")}
                    title={t("footer.attachImage")}
                    variant="ghost"
                    {...footerStyles.footer.attachButton}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <BsPaperclip size="22" />
                  </IconButton>
                  <Textarea
                    value={inputValue}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      handleInputChange(event)
                    }
                    onKeyDown={handleKeyDown}
                    onCompositionStart={() => {
                      setIsComposing(true);
                      handleCompositionStart();
                    }}
                    onCompositionEnd={() => {
                      setIsComposing(false);
                      handleCompositionEnd();
                    }}
                    placeholder={t("footer.typeYourMessage")}
                    aria-label={t("footer.typeYourMessage")}
                    {...footerStyles.footer.input}
                  />
                </Box>
              </InputGroup>
              <HStack
                justify="space-between"
                px={1}
                display={{ base: "none", md: "flex" }}
              >
                <Text fontSize="xs" color="whiteAlpha.500">
                  {t("footer.keyboardHint")}
                </Text>
                {draft.attachments.length > 0 && (
                  <Text fontSize="xs" color="whiteAlpha.500">
                    {draft.attachments.length}/{MAX_COMPOSER_ATTACHMENTS}
                  </Text>
                )}
              </HStack>
            </VStack>

            <IconActionButton
              label={t("footer.send")}
              icon={<FiSend />}
              onClick={submit}
              disabled={!canSend}
              tone="primary"
              size="lg"
            />
          </HStack>
        </Flex>
      </Box>
    </Box>
  );
}
