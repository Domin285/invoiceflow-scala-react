# InvoiceFlow

A small invoice review workflow built to learn Scala while applying familiar React and TypeScript skills. The goal is to cover one complete user flow, from a validated form to a Scala API and back to the UI.

> **Portfolio learning project.** All companies and invoice numbers are demo data. It does not connect to KSeF or process real invoices.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Material UI, Zustand, React Hook Form, Zod, Vitest
- **Backend:** Scala 3, [Cask](https://com-lihaoyi.github.io/cask/) HTTP micro-framework, uJSON
- **Storage (MVP):** thread-safe in-memory repository seeded with sample invoices

## Features

- View all invoices and summary cards
- Search by vendor or invoice number
- Filter by approval status
- Add an invoice with frontend and backend validation
- Approve or reject invoices through a Scala REST endpoint
- View clear API/network errors
- Responsive desktop table and mobile cards

## Local setup

**Requirements:** Node.js 22+, npm, Java 17+ (Java 21 recommended), and [Scala CLI](https://www.scala-lang.org/download/).

Check your installations:

```bash
node --version
npm --version
java -version
scala -version
```

Open the `invoiceflow` folder in VS Code. You will need two terminals running at the same time: one for Scala and one for Vite.

### 1. Start the Scala API

From the repository root:

```bash
scala run backend --main-class InvoiceApi
```

The backend starts at `http://localhost:8080`. Check it with:

```bash
curl http://localhost:8080/api/health
```

You should see `{"status":"ok","service":"invoiceflow-api"}`.

### 2. Start React

In a second terminal, from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Vite will print a local address, usually `http://127.0.0.1:5173/`. Open that address in your browser. Vite proxies `/api` requests to the Scala server, so no separate CORS configuration is needed for local development.

The frontend uses Vite for development and bundling. The `frontend/src/vite-env.d.ts` file loads Vite's TypeScript definitions, including support for imports such as `import "./styles.css"` in `main.tsx`.

### 3. Run checks

From `frontend/`, run:

```bash
npm test
npm run build
```

To exercise the Scala repository logic from the repository root:

```bash
scala run backend --main-class InvoiceStoreChecks
```

The frontend, backend and test commands can run in separate terminals. There is no need to stop the development servers to run tests.

### Troubleshooting on Windows

**Vite reports `EBUSY` when renaming `node_modules/.vite/deps_temp_*`:** Stop the Vite terminal with `Ctrl+C`, ensure you do not have another Vite process running, and from `frontend/` run:

```powershell
Remove-Item -Recurse -Force .\node_modules\.vite
npm run dev -- --force
```

Only Vite's temporary dependency cache is removed. If the cache folder does not exist, skip the removal command. The `--force` option makes Vite rebuild that cache.

**TypeScript reports `TS2882` for `import "./styles.css"`:** Confirm `frontend/src/vite-env.d.ts` exists and contains:

```typescript
/// <reference types="vite/client" />
```

In VS Code, use `TypeScript: Restart TS Server` from the command palette (`Ctrl+Shift+P`) if the editor still shows an error.

**The Scala terminal seems stuck:** On its first run, Scala may download dependencies and compile the code. Once the API is running, the terminal stays occupied because it is hosting the server. Open `http://localhost:8080/api/health` to check whether the API is responding. Stop it with `Ctrl+C` when needed.

## REST API

| Method  | Path                       | Purpose                                               |
| ------- | -------------------------- | ----------------------------------------------------- |
| `GET`   | `/api/health`              | Health check                                          |
| `GET`   | `/api/invoices`            | List all invoices                                     |
| `POST`  | `/api/invoices`            | Create invoice (status defaults to `pending`)         |
| `PATCH` | `/api/invoices/:id/status` | Change status to `pending`, `approved`, or `rejected` |

Example create request:

```bash
curl -X POST http://localhost:8080/api/invoices \
  -H 'Content-Type: application/json' \
  -d '{"vendor":"Example Studio","invoiceNumber":"FV/2026/019","amount":399.90,"dueDate":"2026-11-30"}'
```

Example status update:

```bash
curl -X PATCH http://localhost:8080/api/invoices/1/status \
  -H 'Content-Type: application/json' \
  -d '{"status":"approved"}'
```

## Why Scala?

This project is deliberately small so that I can focus on learning the language rather than wiring up infrastructure. The backend demonstrates:

1. `case class` for invoice data models
2. `enum` for valid statuses
3. `Option` and `Either` for expected outcomes and validation
4. Collection transformations (`map`, `find`, `exists`, `sortBy`)
5. REST route handling with Cask

The code currently keeps data in memory. Restarting the Scala server restores the initial demo invoices. That limitation is intentional for the first iteration and will be replaced by persistent storage.

## Validation completed for this MVP

- `npm run build` - passing
- `npm test` - 5 tests passing
- Scala CLI compile - passing
- Scala repository assertions - passing
- HTTP checks - `GET /api/health`, `GET /api/invoices`, `POST /api/invoices`, `PATCH /api/invoices/:id/status`, duplicate-number validation
- Vite development proxy - `GET /api/invoices` successfully reaches the running Scala API

## Roadmap

InvoiceFlow is a working MVP. The next steps focus on making it more reliable and easier to run outside a local development environment:

- [ ] Replace the in-memory store with PostgreSQL so invoices survive backend restarts.
- [ ] Add backend integration tests for the API routes, validation and error responses.
- [ ] Set up Docker Compose for the API, frontend and database.
- [ ] Add a live demo and screenshots of the main screens.
- [ ] Extend invoice management with editing, deletion and pagination.

These are planned improvements, not features of the current MVP.

## Project structure

```text
invoiceflow/
  backend/
    project.scala          # Scala version and dependencies
    InvoiceStore.scala     # Models, validation and in-memory repository
    InvoiceApi.scala       # HTTP endpoints
    InvoiceStoreChecks.scala
  frontend/
    src/
      App.tsx              # UI, filters, form and status updates
      main.tsx             # React entry point and styles import
      styles.css           # Global styles
      vite-env.d.ts        # Vite TypeScript definitions
      api.ts               # Typed HTTP calls
      store.ts             # Zustand state and async actions
      types.ts             # Shared frontend contracts
      summary.ts           # Derived metrics
      summary.test.ts      # Vitest checks
```
