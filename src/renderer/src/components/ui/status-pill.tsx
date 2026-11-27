import { Box, Button, HStack, Text } from "@chakra-ui/react";
import { ReactNode } from "react";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface StatusPillProps {
  tone: StatusTone;
  icon?: ReactNode;
  label: ReactNode;
  detail?: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  minWidth?: string;
}

const toneStyles: Record<
  StatusTone,
  { bg: string; color: string; borderColor: string }
> = {
  success: {
    bg: "rgba(34, 197, 94, 0.18)",
    color: "green.200",
    borderColor: "green.400",
  },
  warning: {
    bg: "rgba(234, 179, 8, 0.18)",
    color: "yellow.200",
    borderColor: "yellow.400",
  },
  danger: {
    bg: "rgba(239, 68, 68, 0.2)",
    color: "red.200",
    borderColor: "red.400",
  },
  info: {
    bg: "rgba(59, 130, 246, 0.18)",
    color: "blue.200",
    borderColor: "blue.400",
  },
  neutral: {
    bg: "rgba(148, 163, 184, 0.16)",
    color: "gray.200",
    borderColor: "gray.500",
  },
};

const sharedStyles = {
  minH: "34px",
  px: 3,
  py: 1,
  borderRadius: "full",
  borderWidth: "1px",
  backdropFilter: "blur(12px)",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
} as const;

/**
 * Compact status indicator that never relies on color alone.
 */
export function StatusPill({
  tone,
  icon,
  label,
  detail,
  onClick,
  ariaLabel,
  minWidth = "110px",
}: StatusPillProps): JSX.Element {
  const toneStyle = toneStyles[tone];
  const content = (
    <HStack gap={2} justify="center" minW={minWidth}>
      {icon && (
        <Box aria-hidden="true" display="inline-flex">
          {icon}
        </Box>
      )}
      <Text fontSize="sm" fontWeight="semibold" lineHeight="1">
        {label}
      </Text>
      {detail && (
        <Text fontSize="xs" opacity={0.82} lineHeight="1">
          {detail}
        </Text>
      )}
    </HStack>
  );

  if (onClick) {
    return (
      <Button
        {...sharedStyles}
        {...toneStyle}
        onClick={onClick}
        aria-label={ariaLabel}
        variant="ghost"
        height="auto"
        _hover={{ filter: "brightness(1.15)" }}
      >
        {content}
      </Button>
    );
  }

  return (
    <Box
      {...sharedStyles}
      {...toneStyle}
      aria-label={ariaLabel}
      display="inline-flex"
      alignItems="center"
    >
      {content}
    </Box>
  );
}
