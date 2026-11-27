import { IconButton } from "@chakra-ui/react";
import { ReactNode } from "react";
import { Tooltip } from "./tooltip";

export interface IconActionButtonProps {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  tone?: "neutral" | "success" | "warning" | "danger" | "primary";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit";
}

const toneColors = {
  neutral: { bg: "gray.700", activeBg: "gray.600", color: "gray.100" },
  success: { bg: "green.600", activeBg: "green.500", color: "white" },
  warning: { bg: "yellow.500", activeBg: "yellow.400", color: "gray.900" },
  danger: { bg: "red.500", activeBg: "red.400", color: "white" },
  primary: { bg: "blue.500", activeBg: "blue.400", color: "white" },
} as const;

const dimensions = {
  sm: { boxSize: "36px", minW: "36px", fontSize: "16px" },
  md: { boxSize: "44px", minW: "44px", fontSize: "20px" },
  lg: { boxSize: "50px", minW: "50px", fontSize: "22px" },
} as const;

/**
 * Accessible icon action with a mandatory label, tooltip, and pressed state.
 */
export function IconActionButton({
  label,
  icon,
  onClick,
  active = false,
  disabled = false,
  tone = "neutral",
  size = "md",
  type = "button",
}: IconActionButtonProps): JSX.Element {
  const colors = toneColors[tone];
  const sizeStyles = dimensions[size];

  return (
    <Tooltip content={label} positioning={{ placement: "top" }}>
      <IconButton
        type={type}
        aria-label={label}
        aria-pressed={active}
        title={label}
        onClick={onClick}
        disabled={disabled}
        bg={active ? colors.activeBg : colors.bg}
        color={colors.color}
        borderRadius="14px"
        borderWidth={active ? "2px" : "1px"}
        borderColor={active ? "whiteAlpha.700" : "transparent"}
        transition="transform 140ms ease, filter 140ms ease, background 140ms ease"
        _hover={{ filter: "brightness(1.12)", transform: "translateY(-1px)" }}
        _active={{ transform: "translateY(0)" }}
        _disabled={{ opacity: 0.45, cursor: "not-allowed", transform: "none" }}
        {...sizeStyles}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}
