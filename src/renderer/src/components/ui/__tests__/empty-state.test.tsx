import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { EmptyState } from "../empty-state";
import { renderWithProviders } from "@/test/render";

describe("EmptyState", () => {
  it("renders title, icon, description, and action", () => {
    const onAction = vi.fn();
    renderWithProviders(
      <EmptyState
        icon={<span>icon</span>}
        title="No messages yet"
        description="Say hello"
        actionLabel="Start"
        onAction={onAction}
      />,
    );
    expect(screen.getByText("No messages yet")).toBeInTheDocument();
    expect(screen.getByText("Say hello")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("supports compact rendering without optional content", () => {
    renderWithProviders(
      <EmptyState
        compact
        icon={<span>compact-icon</span>}
        title="Nothing here"
      />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not render an action when the callback is missing", () => {
    renderWithProviders(
      <EmptyState title="Nothing here" actionLabel="Unavailable" />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
