import { create } from "zustand";
import { api } from "./api";
import type { Invoice, InvoiceStatus, NewInvoice } from "./types";

interface InvoiceState {
  invoices: Invoice[];
  loading: boolean;
  saving: boolean;
  updatingId: number | null;
  error: string | null;
  load: () => Promise<void>;
  add: (newInvoice: NewInvoice) => Promise<boolean>;
  changeStatus: (id: number, status: InvoiceStatus) => Promise<void>;
  clearError: () => void;
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd.";

export const useInvoiceStore = create<InvoiceState>((set) => ({
  invoices: [],
  loading: false,
  saving: false,
  updatingId: null,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const invoices = await api.getInvoices();
      set({ invoices });
    } catch (error) {
      set({ error: messageOf(error) });
    } finally {
      set({ loading: false });
    }
  },

  add: async (newInvoice) => {
    set({ saving: true, error: null });
    try {
      const created = await api.addInvoice(newInvoice);
      set((state) => ({ invoices: [created, ...state.invoices] }));
      return true;
    } catch (error) {
      set({ error: messageOf(error) });
      return false;
    } finally {
      set({ saving: false });
    }
  },

  changeStatus: async (id, status) => {
    set({ updatingId: id, error: null });
    try {
      const updated = await api.changeStatus(id, status);
      set((state) => ({
        invoices: state.invoices.map((invoice) => (invoice.id === updated.id ? updated : invoice)),
      }));
    } catch (error) {
      set({ error: messageOf(error) });
    } finally {
      set({ updatingId: null });
    }
  },

  clearError: () => set({ error: null }),
}));

