import { useState } from "react";
import { useWebSocket } from "@/context/websocket-context";
import { useAiState } from "@/context/ai-state-context";
import { useInterrupt } from "@/components/canvas/live2d";
import { useChatHistory } from "@/context/chat-history-context";
import { useVAD } from "@/context/vad-context";
import { useMediaCapture } from "@/hooks/utils/use-media-capture";

export function useTextInput() {
  const [inputText, setInputText] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const wsContext = useWebSocket();
  const { aiState } = useAiState();
  const { interrupt } = useInterrupt();
  const { appendHumanMessage } = useChatHistory();
  const { stopMic, autoStopMic } = useVAD();
  const { captureAllMedia } = useMediaCapture();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
  };

  const handleSend = async (
    additionalImages: {
      source: string;
      data: string;
      mime_type: string;
    }[] = [],
  ) => {
    const textToSend = inputText.trim();
    if (!textToSend || !wsContext) return false;
    if (aiState === "thinking-speaking") {
      interrupt();
    }

    const capturedImages = await captureAllMedia();
    const images = [...capturedImages, ...additionalImages];

    appendHumanMessage(textToSend);
    wsContext.sendMessage({
      type: "text-input",
      text: textToSend,
      images,
    });

    if (autoStopMic) stopMic();
    setInputText("");
    return true;
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposing) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = () => setIsComposing(false);

  return {
    inputText,
    setInputText: handleInputChange,
    handleSend,
    handleKeyPress,
    handleCompositionStart,
    handleCompositionEnd,
  };
}
