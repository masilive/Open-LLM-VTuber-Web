import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { SafeAvatar } from "../safe-avatar";
import { renderWithProviders } from "@/test/render";

describe("SafeAvatar", () => {
  it("renders an initial fallback when no source is provided", () => {
    renderWithProviders(<SafeAvatar name="nova" />);
    expect(screen.getByLabelText("nova avatar")).toHaveTextContent("N");
  });

  it("uses A when the display name is blank", () => {
    renderWithProviders(<SafeAvatar name="   " />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders the image and falls back safely if loading fails", () => {
    renderWithProviders(
      <SafeAvatar name="Nova" src="https://example.test/avatar.png" />,
    );
    const image = screen.getByAltText("Nova avatar");
    expect(image).toBeInTheDocument();
    fireEvent.error(image);
    expect(screen.getByLabelText("Nova avatar")).toHaveTextContent("N");
    expect(screen.queryByAltText("Nova avatar")).not.toBeInTheDocument();
  });

  it("resets the failure state when the source changes", () => {
    const { rerender } = renderWithProviders(
      <SafeAvatar name="Nova" src="bad.png" />,
    );
    fireEvent.error(screen.getByAltText("Nova avatar"));
    expect(screen.queryByAltText("Nova avatar")).not.toBeInTheDocument();
    rerender(<SafeAvatar name="Nova" src="good.png" />);
    expect(screen.getByAltText("Nova avatar")).toBeInTheDocument();
  });
});
