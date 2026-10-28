import { describe, expect, it } from "vitest";
import { summarise } from "./summary";
import type { Invoice } from "./types";

const invoices: Invoice[] = [
  { id: 1, vendor: "A", invoiceNumber: "1", amount: 120, dueDate: "2026-11-01", status: "pending" },
  { id: 2, vendor: "B", invoiceNumber: "2", amount: 80, dueDate: "2026-11-02", status: "approved" },
  { id: 3, vendor: "C", invoiceNumber: "3", amount: 25, dueDate: "2026-11-03", status: "rejected" },
];

describe("summarise", () => {
  it("counts invoices by status and sums their amounts", () => {
    expect(summarise(invoices)).toEqual({ all: 3, pending: 1, approved: 1, total: 225 });
  });

  it("handles an empty list", () => {
    expect(summarise([])).toEqual({ all: 0, pending: 0, approved: 0, total: 0 });
  });
});

