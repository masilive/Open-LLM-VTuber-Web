import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { IconActionButton } from "../icon-action-button";
import { renderWithProviders } from "@/test/render";

describe("IconActionButton", () => {
  it("renders an accessible labeled action and handles clicks", () => {
    const onClick = vi.fn();
    renderWithProviders(
      <IconActionButton
        label="Send message"
        icon={<span>send</span>}
        onClick={onClick}
        tone="primary"
        size="lg"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Send message" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("exposes active pressed state", () => {
    renderWithProviders(
      <IconActionButton
        label="Microphone"
        icon={<span>mic</span>}
        active
        tone="success"
        size="sm"
      />,
    );
    expect(screen.getByRole("button", { name: "Microphone" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("honors disabled state", () => {
    const onClick = vi.fn();
    renderWithProviders(
      <IconActionButton
        label="Disabled"
        icon={<span>x</span>}
        onClick={onClick}
        disabled
        tone="danger"
        type="submit"
      />,
    );
    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
