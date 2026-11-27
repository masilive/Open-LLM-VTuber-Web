import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { StatusPill } from "../status-pill";
import { renderWithProviders } from "@/test/render";

describe("StatusPill", () => {
  it("renders a static status with icon and detail", () => {
    renderWithProviders(
      <StatusPill
        tone="success"
        icon={<span>icon</span>}
        label="Connected"
        detail="42 ms"
        ariaLabel="Connection status"
      />,
    );
    expect(screen.getByLabelText("Connection status")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("42 ms")).toBeInTheDocument();
    expect(screen.getByText("icon")).toBeInTheDocument();
  });

  it("renders as a button and forwards clicks when interactive", () => {
    const onClick = vi.fn();
    renderWithProviders(
      <StatusPill
        tone="warning"
        label="Reconnect"
        onClick={onClick}
        ariaLabel="Reconnect"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reconnect" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("supports all tone variants and omits optional content", () => {
    renderWithProviders(<StatusPill tone="neutral" label="Offline" />);
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });
});
