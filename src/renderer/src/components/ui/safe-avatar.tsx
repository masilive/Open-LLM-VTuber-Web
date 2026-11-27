import { Box, Image } from "@chakra-ui/react";
import { useEffect, useState } from "react";

export interface SafeAvatarProps {
  src?: string;
  name: string;
  size?: string;
}

/**
 * Avatar image with a safe non-HTML-injecting initial fallback.
 */
export function SafeAvatar({
  src,
  name,
  size = "100%",
}: SafeAvatarProps): JSX.Element {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initial = (name.trim()[0] || "A").toUpperCase();

  useEffect(() => {
    setFailedSrc(null);
  }, [src]);

  if (!src || failedSrc === src) {
    return (
      <Box
        width={size}
        height={size}
        display="flex"
        alignItems="center"
        justifyContent="center"
        borderRadius="50%"
        bg="blue.500"
        color="white"
        fontSize="sm"
        fontWeight="bold"
        aria-label={`${name} avatar`}
      >
        {initial}
      </Box>
    );
  }

  return (
    <Image
      src={src}
      alt={`${name} avatar`}
      width={size}
      height={size}
      borderRadius="50%"
      objectFit="cover"
      onError={() => setFailedSrc(src)}
    />
  );
}
