import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { buildSparklinePoints, Sparkline } from "../sparkline";
import { renderWithProviders } from "@/test/render";

describe("buildSparklinePoints", () => {
  it("returns an empty point string for no values", () => {
    expect(buildSparklinePoints([], 100, 40)).toBe("");
  });

  it("centers a single value horizontally", () => {
    const [x] = buildSparklinePoints([5], 100, 40).split(" ")[0].split(",");
    expect(Number(x)).toBe(50);
  });

  it("spreads multiple values across the usable width", () => {
    const points = buildSparklinePoints([0, 10], 102, 42, 2).split(" ");
    expect(points[0].split(",")[0]).toBe("2.00");
    expect(points[1].split(",")[0]).toBe("100.00");
  });

  it("uses an explicit maximum and handles zero-width geometry defensively", () => {
    expect(buildSparklinePoints([50], 2, 2, 2, 100)).not.toBe("");
  });
});

describe("Sparkline", () => {
  it("renders a friendly empty state", () => {
    renderWithProviders(
      <Sparkline values={[]} ariaLabel="Latency" emptyLabel="Waiting" />,
    );
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders an accessible chart with the latest value exposed to screen readers", () => {
    renderWithProviders(
      <Sparkline
        values={[10, 20]}
        ariaLabel="Latency"
        width={100}
        height={30}
      />,
    );
    expect(screen.getByRole("img", { name: "Latency" })).toBeInTheDocument();
    expect(screen.getByText("Latency: 20")).toBeInTheDocument();
  });
});
