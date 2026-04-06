import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import OrderTimeline from "@/components/OrderTimeline";
import { mockOrders } from "@/lib/mock-data";
import { render } from "./test-utils";

const deliveredOrder = mockOrders.find((o) => o.status === "delivered")!;
const shippedOrder = mockOrders.find((o) => o.status === "shipped")!;

describe("OrderTimeline", () => {
  it("shows all status steps", () => {
    render(
      <OrderTimeline timeline={deliveredOrder.timeline} currentStatus={deliveredOrder.status} />
    );
    expect(screen.getByText("Placed")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("Shipped")).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
  });

  it("shows completed steps with dates", () => {
    render(
      <OrderTimeline timeline={deliveredOrder.timeline} currentStatus={deliveredOrder.status} />
    );
    // All steps should have dates for delivered order
    const dates = screen.getAllByText(/\d{1,2}\s\w+\s\d{4}/);
    expect(dates.length).toBeGreaterThan(0);
  });

  it("shows cancelled state correctly", () => {
    render(
      <OrderTimeline
        timeline={[{ status: "cancelled", timestamp: "2026-03-05T14:30:00Z", description: "Order cancelled by user" }]}
        currentStatus="cancelled"
      />
    );
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("partially completed timeline for shipped order", () => {
    render(
      <OrderTimeline timeline={shippedOrder.timeline} currentStatus={shippedOrder.status} />
    );
    expect(screen.getByText("Shipped")).toBeInTheDocument();
    expect(screen.getByText("Out for Delivery")).toBeInTheDocument();
  });
});
