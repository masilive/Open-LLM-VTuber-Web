import { Box, Button, Text, VStack } from "@chakra-ui/react";
import { ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

/**
 * Friendly empty state that explains what is missing and what the user can do next.
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps): JSX.Element {
  return (
    <VStack
      height="100%"
      minH={compact ? "140px" : "220px"}
      justify="center"
      align="center"
      gap={compact ? 3 : 5}
      px={6}
      textAlign="center"
      color="gray.300"
    >
      {icon && (
        <Box
          aria-hidden="true"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          boxSize={compact ? "48px" : "64px"}
          borderRadius="full"
          bg="whiteAlpha.100"
          color="blue.200"
          boxShadow="inset 0 0 0 1px rgba(255,255,255,0.08)"
        >
          {icon}
        </Box>
      )}
      <VStack gap={1} maxW="280px">
        <Text
          fontWeight="semibold"
          fontSize={compact ? "md" : "lg"}
          color="gray.100"
        >
          {title}
        </Text>
        {description && (
          <Text fontSize="sm" lineHeight="1.5" color="gray.400">
            {description}
          </Text>
        )}
      </VStack>
      {actionLabel && onAction && (
        <Button
          size="sm"
          colorPalette="blue"
          onClick={onAction}
          borderRadius="full"
        >
          {actionLabel}
        </Button>
      )}
    </VStack>
  );
}
