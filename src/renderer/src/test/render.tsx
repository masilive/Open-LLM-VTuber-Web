import { render, RenderOptions } from "@testing-library/react";
import { ReactElement, ReactNode } from "react";
import { Provider } from "@/components/ui/provider";

function TestProviders({ children }: { children: ReactNode }) {
  return <Provider>{children}</Provider>;
}

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: TestProviders, ...options });
}
