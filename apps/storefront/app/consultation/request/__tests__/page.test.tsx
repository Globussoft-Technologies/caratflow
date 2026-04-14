import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/components/__tests__/test-utils";
import RequestConsultationPage from "../page";

describe("RequestConsultationPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    }));
  });

  it("renders the request form with language picker and submit button", () => {
    render(<RequestConsultationPage />);
    expect(screen.getByText(/Book a Live Consultation/i)).toBeInTheDocument();
    expect(screen.getByText(/Preferred Language/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Request Consultation/i })).toBeInTheDocument();
  });

  it("submits the form and calls the API, showing confirmation", async () => {
    const user = userEvent.setup();
    render(<RequestConsultationPage />);
    await user.click(screen.getByRole("button", { name: /Request Consultation/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/crm/video-consultation/request"),
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText(/Request Received/i)).toBeInTheDocument();
    });
  });
});
