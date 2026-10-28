export const STATUSES = ["pending", "approved", "rejected"] as const;

export type InvoiceStatus = (typeof STATUSES)[number];

export interface Invoice {
  id: number;
  vendor: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
}

export interface NewInvoice {
  vendor: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
}

