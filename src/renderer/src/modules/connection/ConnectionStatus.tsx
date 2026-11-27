import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { FiRefreshCw, FiWifi, FiWifiOff } from "react-icons/fi";
import { StatusPill } from "@/components/ui/status-pill";
import { Sparkline } from "@/components/ui/sparkline";
import {
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverRoot,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useConnectionStatus } from "./use-connection-status";

function formatLatency(latencyMs: number | null): string {
  return latencyMs === null ? "—" : `${latencyMs} ms`;
}

/**
 * Connection status module with transport health details and a compact latency chart.
 */
export function ConnectionStatus(): JSX.Element {
  const { t } = useTranslation();
  const { model, reconnect } = useConnectionStatus();
  const statusKey = model.isConnected
    ? "connection.connected"
    : model.isConnecting
      ? "connection.connecting"
      : "connection.offline";
  const qualityLabel = t(`connection.quality.${model.quality}`);
  const latencyValues = model.samples.map((sample) => sample.latencyMs);

  return (
    <PopoverRoot positioning={{ placement: "bottom-start" }}>
      <PopoverTrigger asChild>
        <Box
          display="inline-block"
          cursor="pointer"
          aria-label={t("connection.detailsTitle")}
        >
          <StatusPill
            tone={model.tone}
            icon={model.isConnected ? <FiWifi /> : <FiWifiOff />}
            label={t(statusKey)}
            detail={
              model.isConnected
                ? formatLatency(model.stats.latestMs)
                : undefined
            }
            minWidth="112px"
          />
        </Box>
      </PopoverTrigger>
      <PopoverContent
        width="280px"
        bg="gray.900"
        color="gray.100"
        borderColor="whiteAlpha.200"
        boxShadow="0 18px 48px rgba(0,0,0,0.45)"
      >
        <PopoverHeader borderBottomWidth="1px" borderColor="whiteAlpha.100">
          <PopoverTitle fontWeight="semibold">
            {t("connection.detailsTitle")}
          </PopoverTitle>
        </PopoverHeader>
        <PopoverBody>
          <VStack align="stretch" gap={4} py={2}>
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.400">
                {t("connection.latencyNow")}
              </Text>
              <Text fontWeight="semibold">
                {formatLatency(model.stats.latestMs)}
              </Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.400">
                {t("connection.latencyAverage")}
              </Text>
              <Text fontWeight="semibold">
                {formatLatency(model.stats.averageMs)}
              </Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.400">
                {t("connection.latencyRange")}
              </Text>
              <Text fontWeight="semibold">
                {model.stats.minimumMs === null ||
                model.stats.maximumMs === null
                  ? "—"
                  : `${model.stats.minimumMs}–${model.stats.maximumMs} ms`}
              </Text>
            </HStack>
            <VStack align="stretch" gap={2}>
              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.400">
                  {qualityLabel}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {model.stats.count} ×
                </Text>
              </HStack>
              <Sparkline
                values={latencyValues}
                ariaLabel={t("connection.detailsTitle")}
                emptyLabel={t("connection.waitingForHeartbeat")}
                maxValue={500}
                width={224}
                height={42}
              />
            </VStack>
            <Text fontSize="xs" color="gray.500" lineHeight="1.5">
              {t("connection.heartbeatHelp")}
            </Text>
            {model.canReconnect && (
              <Button
                size="sm"
                colorPalette="blue"
                borderRadius="full"
                onClick={reconnect}
                alignSelf="flex-start"
              >
                <HStack gap={2}>
                  <FiRefreshCw />
                  <Text>{t("connection.reconnect")}</Text>
                </HStack>
              </Button>
            )}
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </PopoverRoot>
  );
}
