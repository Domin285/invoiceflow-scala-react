import type { Invoice, InvoiceStatus, NewInvoice } from "./types";

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new Error("Nie można połączyć się z API. Sprawdź, czy backend Scala działa na porcie 8080.");
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : `Wystąpił błąd HTTP ${response.status}.`;
    throw new Error(message);
  }

  return payload as T;
}

export const api = {
  getInvoices: () => jsonRequest<Invoice[]>("/invoices"),
  addInvoice: (invoice: NewInvoice) =>
    jsonRequest<Invoice>("/invoices", { method: "POST", body: JSON.stringify(invoice) }),
  changeStatus: (id: number, status: InvoiceStatus) =>
    jsonRequest<Invoice>(`/invoices/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

