import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  AddRounded,
  CheckCircleOutlineRounded,
  DescriptionOutlined,
  HourglassEmptyRounded,
  ReceiptLongRounded,
  RefreshRounded,
  SearchRounded,
  TrendingUpRounded,
} from "@mui/icons-material";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useInvoiceStore } from "./store";
import { formatCurrency, formatDate, summarise } from "./summary";
import type { Invoice, InvoiceStatus } from "./types";

const statusLabels: Record<InvoiceStatus, string> = {
  pending: "Oczekuje",
  approved: "Zatwierdzona",
  rejected: "Odrzucona",
};

const statusColor: Record<InvoiceStatus, "warning" | "success" | "error"> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
};

const schema = z.object({
  vendor: z.string().trim().min(2, "Podaj nazwę kontrahenta (min. 2 znaki)."),
  invoiceNumber: z.string().trim().min(3, "Numer faktury musi mieć co najmniej 3 znaki."),
  amount: z.number().positive("Kwota musi być większa od zera."),
  dueDate: z.iso.date("Podaj prawidłową datę."),
});

type InvoiceForm = z.infer<typeof schema>;

function MetricCard({ title, value, icon, accent }: { title: string; value: string; icon: ReactNode; accent: string }) {
  return (
    <Paper elevation={0} className="metric-card">
      <Box className="metric-icon" sx={{ color: accent, backgroundColor: `${accent}13` }}>
        {icon}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {title}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 750, letterSpacing: "-0.03em", mt: 0.3 }}>
        {value}
      </Typography>
    </Paper>
  );
}

function InvoiceActions({ invoice }: { invoice: Invoice }) {
  const changeStatus = useInvoiceStore((state) => state.changeStatus);
  const updatingId = useInvoiceStore((state) => state.updatingId);

  return (
    <FormControl size="small" sx={{ minWidth: 150 }}>
      <InputLabel id={`status-${invoice.id}`}>Status</InputLabel>
      <Select
        labelId={`status-${invoice.id}`}
        value={invoice.status}
        label="Status"
        disabled={updatingId === invoice.id}
        onChange={(event) => void changeStatus(invoice.id, event.target.value as InvoiceStatus)}
      >
        <MenuItem value="pending">Oczekuje</MenuItem>
        <MenuItem value="approved">Zatwierdzona</MenuItem>
        <MenuItem value="rejected">Odrzucona</MenuItem>
      </Select>
    </FormControl>
  );
}

function InvoiceFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const add = useInvoiceStore((state) => state.add);
  const saving = useInvoiceStore((state) => state.saving);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InvoiceForm>({
    resolver: zodResolver(schema),
    defaultValues: { vendor: "", invoiceNumber: "", amount: 0, dueDate: "" },
  });

  const close = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const submit = handleSubmit(async (values) => {
    if (await add(values)) close();
  });

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby="new-invoice-title">
      <Box component="form" onSubmit={(event) => void submit(event)} noValidate>
        <DialogTitle id="new-invoice-title" sx={{ fontWeight: 750, pt: 3 }}>
          Nowa faktura
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
            Wprowadź podstawowe dane. Nowa faktura trafi do kolejki oczekujących.
          </Typography>
          <Stack spacing={2.5}>
            <TextField
              label="Kontrahent"
              autoFocus
              fullWidth
              {...register("vendor")}
              error={Boolean(errors.vendor)}
              helperText={errors.vendor?.message}
            />
            <TextField
              label="Numer faktury"
              placeholder="FV/2026/014"
              fullWidth
              {...register("invoiceNumber")}
              error={Boolean(errors.invoiceNumber)}
              helperText={errors.invoiceNumber?.message}
            />
            <TextField
              label="Kwota (PLN)"
              type="number"
              fullWidth
              slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
              {...register("amount", { valueAsNumber: true })}
              error={Boolean(errors.amount)}
              helperText={errors.amount?.message}
            />
            <TextField
              label="Termin płatności"
              type="date"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              {...register("dueDate")}
              error={Boolean(errors.dueDate)}
              helperText={errors.dueDate?.message}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 3 }}>
          <Button onClick={close} color="inherit" disabled={saving}>Anuluj</Button>
          <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={15} /> : <AddRounded />}>
            Dodaj fakturę
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default function App() {
  const invoices = useInvoiceStore((state) => state.invoices);
  const load = useInvoiceStore((state) => state.load);
  const loading = useInvoiceStore((state) => state.loading);
  const error = useInvoiceStore((state) => state.error);
  const clearError = useInvoiceStore((state) => state.clearError);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => summarise(invoices), [invoices]);
  const visible = useMemo(() => {
    const phrase = search.trim().toLocaleLowerCase("pl-PL");
    return invoices.filter((invoice) => {
      const matchesStatus = status === "all" || invoice.status === status;
      const matchesSearch =
        invoice.vendor.toLocaleLowerCase("pl-PL").includes(phrase) ||
        invoice.invoiceNumber.toLocaleLowerCase("pl-PL").includes(phrase);
      return matchesStatus && matchesSearch;
    });
  }, [invoices, search, status]);

  return (
    <Box className="app-shell">
      <Box component="header" className="topbar">
        <Container maxWidth="lg" className="topbar-inner">
          <Stack direction="row" alignItems="center" spacing={1.4}>
            <Box className="brand-mark"><ReceiptLongRounded fontSize="small" /></Box>
            <Typography sx={{ fontWeight: 800, letterSpacing: "-0.04em", fontSize: 21 }}>
              invoice<span className="brand-accent">flow</span>
            </Typography>
          </Stack>
          <Chip label="MVP - React + Scala" size="small" variant="outlined" className="top-chip" />
        </Container>
      </Box>

      <Container maxWidth="lg" component="main" sx={{ py: { xs: 4, md: 6 } }}>
        <Box className="hero">
          <Box>
            <Typography className="eyebrow">PANEL DOKUMENTÓW</Typography>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 800, letterSpacing: "-0.05em", fontSize: { xs: 32, md: 43 }, mt: 1 }}>
              Przegląd faktur
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1.2, maxWidth: 580 }}>
              Prosta kolejka faktur. Sprawdzaj dokumenty, zmieniaj ich status i kontroluj terminy płatności w jednym miejscu.
            </Typography>
          </Box>
          <Button variant="contained" size="large" startIcon={<AddRounded />} onClick={() => setDialogOpen(true)} sx={{ px: 2.8, py: 1.4, whiteSpace: "nowrap" }}>
            Nowa faktura
          </Button>
        </Box>

        <Box className="metrics-grid">
          <MetricCard title="Wszystkie faktury" value={String(totals.all)} icon={<DescriptionOutlined />} accent="#3b668f" />
          <MetricCard title="Oczekujące" value={String(totals.pending)} icon={<HourglassEmptyRounded />} accent="#c58931" />
          <MetricCard title="Zatwierdzone" value={String(totals.approved)} icon={<CheckCircleOutlineRounded />} accent="#087f78" />
          <MetricCard title="Łączna wartość" value={formatCurrency(totals.total)} icon={<TrendingUpRounded />} accent="#6f5bb5" />
        </Box>

        {error && (
          <Alert severity="error" onClose={clearError} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={0} className="content-card">
          <Box className="list-header">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 750, letterSpacing: "-0.02em" }}>Lista faktur</Typography>
              <Typography variant="body2" color="text.secondary">{visible.length} dokumentów w bieżącym widoku</Typography>
            </Box>
            <Button startIcon={<RefreshRounded />} color="inherit" onClick={() => void load()} disabled={loading}>
              Odśwież
            </Button>
          </Box>
          <Divider />
          <Box className="filters">
            <TextField
              size="small"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Szukaj firmy lub numeru..."
              aria-label="Szukaj faktur"
              slotProps={{ input: { startAdornment: <SearchRounded sx={{ color: "#8a9ca8", mr: 1, fontSize: 21 }} /> } }}
              sx={{ width: { xs: "100%", sm: 280 } }}
            />
            <ToggleButtonGroup
              exclusive
              size="small"
              value={status}
              onChange={(_, value: InvoiceStatus | "all" | null) => { if (value) setStatus(value); }}
              aria-label="Filtr statusu faktur"
              className="status-tabs"
            >
              <ToggleButton value="all">Wszystkie</ToggleButton>
              <ToggleButton value="pending">Oczekujące</ToggleButton>
              <ToggleButton value="approved">Zatwierdzone</ToggleButton>
              <ToggleButton value="rejected">Odrzucone</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {loading ? (
            <Box className="empty-state"><CircularProgress size={30} /><Typography color="text.secondary">Pobieranie faktur...</Typography></Box>
          ) : visible.length === 0 ? (
            <Box className="empty-state">
              <DescriptionOutlined sx={{ fontSize: 42, color: "#9cb2bd" }} />
              <Typography fontWeight={700}>Brak faktur</Typography>
              <Typography color="text.secondary" variant="body2">Zmień filtr albo dodaj nową fakturę.</Typography>
            </Box>
          ) : (
            <>
              <TableContainer className="desktop-table">
                <Table sx={{ minWidth: 780 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>KONTRAHENT</TableCell>
                      <TableCell>NR FAKTURY</TableCell>
                      <TableCell>KWOTA</TableCell>
                      <TableCell>TERMIN</TableCell>
                      <TableCell>STATUS</TableCell>
                      <TableCell align="right">ZMIEŃ STATUS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visible.map((invoice) => (
                      <TableRow key={invoice.id} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{invoice.vendor}</TableCell>
                        <TableCell sx={{ color: "text.secondary" }}>{invoice.invoiceNumber}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell><Chip label={statusLabels[invoice.status]} color={statusColor[invoice.status]} size="small" variant="outlined" /></TableCell>
                        <TableCell align="right"><InvoiceActions invoice={invoice} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box className="mobile-invoices">
                {visible.map((invoice) => (
                  <Box className="mobile-invoice" key={invoice.id}>
                    <Stack direction="row" justifyContent="space-between" alignItems="start" spacing={1}>
                      <Box>
                        <Typography fontWeight={750}>{invoice.vendor}</Typography>
                        <Typography variant="body2" color="text.secondary">{invoice.invoiceNumber}</Typography>
                      </Box>
                      <Chip label={statusLabels[invoice.status]} color={statusColor[invoice.status]} size="small" variant="outlined" />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="end" sx={{ mt: 2.5 }}>
                      <Box>
                        <Typography fontWeight={750} sx={{ fontSize: 19 }}>{formatCurrency(invoice.amount)}</Typography>
                        <Typography variant="caption" color="text.secondary">Termin: {formatDate(invoice.dueDate)}</Typography>
                      </Box>
                      <InvoiceActions invoice={invoice} />
                    </Stack>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Paper>

        <Typography textAlign="center" color="text.secondary" variant="caption" sx={{ display: "block", mt: 4 }}>
          InvoiceFlow - projekt edukacyjny React + TypeScript + Scala. Dane demonstracyjne, bez prawdziwych faktur.
        </Typography>
      </Container>
      <InvoiceFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Box>
  );
}

