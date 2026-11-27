import { Box, Text, VStack } from "@chakra-ui/react";

export interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  ariaLabel: string;
  emptyLabel?: string;
  maxValue?: number;
}

/**
 * Build an SVG polyline point string for a series of numeric values.
 */
export function buildSparklinePoints(
  values: number[],
  width: number,
  height: number,
  padding = 2,
  maxValue?: number,
): string {
  if (values.length === 0) return "";

  const usableWidth = Math.max(1, width - padding * 2);
  const usableHeight = Math.max(1, height - padding * 2);
  const max = maxValue ?? Math.max(...values);
  const min = Math.min(0, ...values);
  const range = Math.max(1, max - min);

  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? width / 2
          : padding + (index / (values.length - 1)) * usableWidth;
      const normalized = (value - min) / range;
      const y = padding + (1 - normalized) * usableHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

/**
 * Lightweight dependency-free line chart for compact operational metrics.
 */
export function Sparkline({
  values,
  width = 132,
  height = 36,
  ariaLabel,
  emptyLabel = "No data yet",
  maxValue,
}: SparklineProps): JSX.Element {
  if (values.length === 0) {
    return (
      <VStack
        height={`${height}px`}
        width={`${width}px`}
        justify="center"
        color="gray.500"
      >
        <Text fontSize="xs">{emptyLabel}</Text>
      </VStack>
    );
  }

  const points = buildSparklinePoints(values, width, height, 2, maxValue);
  const latest = values[values.length - 1];
  const pointList = points.split(" ");
  const [latestX, latestY] = (pointList[pointList.length - 1] as string).split(
    ",",
  ) as [string, string];

  return (
    <Box color="blue.300" lineHeight={0}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
      >
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={latestX} cy={latestY} r="3" fill="currentColor" />
      </svg>
      <Text
        position="absolute"
        width="1px"
        height="1px"
        padding="0"
        margin="-1px"
        overflow="hidden"
        clipPath="inset(50%)"
        whiteSpace="nowrap"
        border="0"
      >
        {`${ariaLabel}: ${latest}`}
      </Text>
    </Box>
  );
}
