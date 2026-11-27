/* eslint-disable function-paren-newline */
/* eslint-disable react/jsx-one-expression-per-line */
/* eslint-disable no-trailing-spaces */
/* eslint-disable no-nested-ternary */
/* eslint-disable import/order */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable react/require-default-props */
import { Box, Spinner, Flex, Text, Icon } from "@chakra-ui/react";
import { sidebarStyles, chatPanelStyles } from "./sidebar-styles";
import {
  MainContainer,
  ChatContainer,
  MessageList as ChatMessageList,
  Message as ChatMessage,
  Avatar as ChatAvatar,
} from "@chatscope/chat-ui-kit-react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { useChatHistory } from "@/context/chat-history-context";
import { Global } from "@emotion/react";
import { useConfig } from "@/context/character-config-context";
import { useWebSocket } from "@/context/websocket-context";
import { FaTools, FaCheck, FaTimes } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { FiMessageCircle } from "react-icons/fi";
import { EmptyState } from "@/components/ui/empty-state";
import { SafeAvatar } from "@/components/ui/safe-avatar";
import { filterDisplayableMessages } from "@/modules/chat/chat.business";

// Main component
function ChatHistoryPanel(): JSX.Element {
  const { t } = useTranslation();
  const { messages } = useChatHistory(); // Get messages directly from context
  const { confName } = useConfig();
  const { baseUrl } = useWebSocket();
  const userName = "Me";

  const validMessages = filterDisplayableMessages(messages);

  return (
    <Box h="full" overflow="hidden" bg="gray.900">
      <Global styles={chatPanelStyles} />
      <MainContainer>
        <ChatContainer>
          <ChatMessageList>
            {validMessages.length === 0 ? (
              <EmptyState
                compact
                icon={<FiMessageCircle size="28" />}
                title={t("sidebar.emptyTitle")}
                description={t("sidebar.emptyDescription")}
              />
            ) : (
              validMessages.map((msg) => {
                // Check if it's a tool call message
                if (msg.type === "tool_call_status") {
                  return (
                    // Render Tool Call Indicator using msg properties
                    <Flex
                      key={msg.id} // Use tool_id as key
                      {...sidebarStyles.toolCallIndicator.container}
                      alignItems="center"
                    >
                      <Icon
                        as={FaTools}
                        {...sidebarStyles.toolCallIndicator.icon}
                      />
                      <Text {...sidebarStyles.toolCallIndicator.text}>
                        {/* {msg.tool_name}: {msg.status === 'running' ? 'Running...' : msg.content} */}
                        {t(
                          msg.status === "running"
                            ? "sidebar.toolRunning"
                            : "sidebar.toolCompleted",
                          {
                            name: msg.name,
                            tool: msg.tool_name,
                          },
                        )}
                      </Text>
                      {/* Show spinner if running, checkmark if completed, maybe error icon? */}
                      {msg.status === "running" && (
                        <Spinner
                          size="xs"
                          color={sidebarStyles.toolCallIndicator.spinner.color}
                          ml={sidebarStyles.toolCallIndicator.spinner.ml}
                        />
                      )}
                      {msg.status === "completed" && (
                        <Icon
                          as={FaCheck}
                          {...sidebarStyles.toolCallIndicator.completedIcon}
                        />
                      )}
                      {/* Optional: Add an error icon */}
                      {msg.status === "error" && (
                        <Icon
                          as={FaTimes}
                          {...sidebarStyles.toolCallIndicator.errorIcon}
                        />
                      )}
                    </Flex>
                  );
                }
                // Render Standard Chat Message (human or ai text)
                return (
                  <ChatMessage
                    key={msg.id}
                    model={{
                      message: msg.content,
                      sentTime: msg.timestamp,
                      sender:
                        msg.role === "ai"
                          ? msg.name || confName || "AI"
                          : userName,
                      direction: msg.role === "ai" ? "incoming" : "outgoing",
                      position: "single",
                    }}
                    avatarPosition={msg.role === "ai" ? "tl" : "tr"}
                    avatarSpacer={false}
                  >
                    <ChatAvatar>
                      <SafeAvatar
                        src={
                          msg.role === "ai" && msg.avatar
                            ? `${baseUrl}/avatars/${msg.avatar}`
                            : undefined
                        }
                        name={
                          msg.role === "ai"
                            ? msg.name || confName || "AI"
                            : userName
                        }
                      />
                    </ChatAvatar>
                  </ChatMessage>
                );
              })
            )}
          </ChatMessageList>
        </ChatContainer>
      </MainContainer>
    </Box>
  );
}

export default ChatHistoryPanel;
