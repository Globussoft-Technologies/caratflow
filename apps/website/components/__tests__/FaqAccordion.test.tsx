import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import FaqAccordion from "../FaqAccordion";

const faqItems = [
  { question: "Is there a free trial?", answer: "Yes! Every plan comes with a 14-day free trial." },
  { question: "Can I switch plans?", answer: "Absolutely. Upgrade or downgrade anytime." },
];

describe("FaqAccordion", () => {
  it("renders all questions", () => {
    render(<FaqAccordion items={faqItems} />);
    expect(screen.getByText("Is there a free trial?")).toBeInTheDocument();
    expect(screen.getByText("Can I switch plans?")).toBeInTheDocument();
  });

  it("expands the answer when a question is clicked", () => {
    render(<FaqAccordion items={faqItems} />);
    const questionButton = screen.getByText("Is there a free trial?");
    fireEvent.click(questionButton);

    const answerContainer = screen.getByText("Yes! Every plan comes with a 14-day free trial.")
      .closest(".accordion-content");
    expect(answerContainer).toHaveClass("open");
  });

  it("collapses the answer when the same question is clicked again", () => {
    render(<FaqAccordion items={faqItems} />);
    const questionButton = screen.getByText("Is there a free trial?");

    // Open
    fireEvent.click(questionButton);
    let answerContainer = screen.getByText("Yes! Every plan comes with a 14-day free trial.")
      .closest(".accordion-content");
    expect(answerContainer).toHaveClass("open");

    // Close
    fireEvent.click(questionButton);
    answerContainer = screen.getByText("Yes! Every plan comes with a 14-day free trial.")
      .closest(".accordion-content");
    expect(answerContainer).not.toHaveClass("open");
  });
});
