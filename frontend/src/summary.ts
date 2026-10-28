import type { Invoice } from "./types";

export function summarise(invoices: Invoice[]) {
  return {
    all: invoices.length,
    pending: invoices.filter((invoice) => invoice.status === "pending").length,
    approved: invoices.filter((invoice) => invoice.status === "approved").length,
    total: invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(amount);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("pl-PL").format(new Date(`${date}T12:00:00`));
}

