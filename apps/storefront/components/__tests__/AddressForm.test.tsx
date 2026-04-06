import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddressForm from "@/components/AddressForm";
import { render } from "./test-utils";

const onSave = vi.fn();
const onCancel = vi.fn();

describe("AddressForm", () => {
  it("renders all required fields", () => {
    render(<AddressForm onSave={onSave} onCancel={onCancel} />);
    expect(screen.getByText("Full Name *")).toBeInTheDocument();
    expect(screen.getByText("Phone *")).toBeInTheDocument();
    expect(screen.getByText("Address Line 1 *")).toBeInTheDocument();
    expect(screen.getByText("City *")).toBeInTheDocument();
    expect(screen.getByText("State *")).toBeInTheDocument();
    expect(screen.getByText("Pincode *")).toBeInTheDocument();
  });

  it("renders state dropdown with Indian states", () => {
    render(<AddressForm onSave={onSave} onCancel={onCancel} />);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    // Check some states
    expect(screen.getByText("Maharashtra")).toBeInTheDocument();
    expect(screen.getByText("Karnataka")).toBeInTheDocument();
    expect(screen.getByText("Delhi")).toBeInTheDocument();
  });

  it("renders Save Address button for new address", () => {
    render(<AddressForm onSave={onSave} onCancel={onCancel} />);
    expect(screen.getByText("Save Address")).toBeInTheDocument();
  });

  it("renders Update Address button when editing", () => {
    render(
      <AddressForm
        address={{
          id: "addr-1",
          label: "Home",
          fullName: "Test User",
          phone: "+91 12345",
          addressLine1: "123 St",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001",
          country: "India",
          isDefault: false,
        }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    expect(screen.getByText("Update Address")).toBeInTheDocument();
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const cancelFn = vi.fn();
    render(<AddressForm onSave={onSave} onCancel={cancelFn} />);
    await user.click(screen.getByText("Cancel"));
    expect(cancelFn).toHaveBeenCalled();
  });

  it("has default address checkbox", () => {
    render(<AddressForm onSave={onSave} onCancel={onCancel} />);
    expect(screen.getByText("Set as default address")).toBeInTheDocument();
  });
});
