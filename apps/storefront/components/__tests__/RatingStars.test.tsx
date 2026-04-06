import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RatingStars from "@/components/RatingStars";
import { render } from "./test-utils";

describe("RatingStars", () => {
  it("renders 5 star buttons by default", () => {
    render(<RatingStars rating={3} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(5);
  });

  it("renders custom number of stars", () => {
    render(<RatingStars rating={3} maxRating={10} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(10);
  });

  it("shows review count when provided", () => {
    render(<RatingStars rating={4.5} reviewCount={42} />);
    expect(screen.getByText("(42)")).toBeInTheDocument();
  });

  it("calls onChange in interactive mode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RatingStars rating={2} interactive onChange={onChange} />);
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[3]!); // click 4th star
    expect(onChange).toHaveBeenCalledWith(4);
  });
});
