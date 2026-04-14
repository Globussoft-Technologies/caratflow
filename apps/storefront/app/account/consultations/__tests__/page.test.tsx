import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { render } from "@/components/__tests__/test-utils";
import ConsultationsPage from "../page";

describe("AccountConsultationsPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          items: [
            {
              id: "consult-1",
              status: "SCHEDULED",
              scheduledAt: new Date().toISOString(),
              meetingUrl: "https://meet.jit.si/caratflow-abc",
              preferredLang: "en",
            },
          ],
        },
      }),
    }));
  });

  it("renders the page with a new-request CTA", async () => {
    render(<ConsultationsPage />);
    expect(screen.getByText(/My Consultations/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /New Request/i })).toBeInTheDocument();
  });

  it("loads consultations from API and shows Join Meeting button for SCHEDULED", async () => {
    render(<ConsultationsPage />);
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Join Meeting/i })).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalled();
  });
});
