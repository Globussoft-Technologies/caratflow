import { render, type RenderOptions } from "@testing-library/react";
import { createElement, type ReactElement } from "react";
import StoreProvider from "@/components/StoreProvider";

function AllProviders({ children }: { children: React.ReactNode }) {
  return createElement(StoreProvider, null, children);
}

export function renderWithStore(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export { render };
