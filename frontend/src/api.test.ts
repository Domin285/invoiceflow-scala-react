import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("invoice API", () => {
  it("loads invoices from the Scala endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, vendor: "Demo", status: "pending" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await api.getInvoices();
    expect(fetchMock).toHaveBeenCalledWith("/api/invoices", expect.any(Object));
    expect(result).toHaveLength(1);
  });

  it("sends the selected status in a PATCH request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 7, status: "approved" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await api.changeStatus(7, "approved");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/invoices/7/status",
      expect.objectContaining({ method: "PATCH", body: '{"status":"approved"}' }),
    );
  });

  it("surfaces the backend validation message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: "Duplicate invoice number" }) }),
    );

    await expect(
      api.addInvoice({ vendor: "Demo", invoiceNumber: "1", amount: 25, dueDate: "2026-11-01" }),
    ).rejects.toThrow("Duplicate invoice number");
  });
});

