import { NextResponse } from "next/server";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Debt Sucker API",
    version: "1.0.0",
    description: "Personal finance API. Auth via session cookie (browser) or bearer API token.",
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      bearer: { type: "http", scheme: "bearer", bearerFormat: "fw_pat_*" },
      cookie: { type: "apiKey", in: "cookie", name: "fw_session" },
    },
    schemas: {
      Error: { type: "object", properties: { error: { type: "string" }, fields: { type: "object" } } },
      Account: {
        type: "object",
        properties: { id: { type: "string" }, name: { type: "string" }, type: { type: "string", enum: ["checking", "savings", "credit", "investment"] }, balance: { type: "number" } },
      },
      Transaction: {
        type: "object",
        properties: { id: { type: "string" }, accountId: { type: "string" }, amount: { type: "number" }, type: { type: "string", enum: ["income", "expense"] }, category: { type: "string" }, description: { type: "string" }, date: { type: "string", format: "date-time" } },
      },
      Budget: { type: "object", properties: { id: { type: "string" }, category: { type: "string" }, limit: { type: "number" }, month: { type: "string" } } },
      Goal: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, targetAmount: { type: "number" }, currentAmount: { type: "number" }, deadline: { type: "string", format: "date-time" } } },
      Rule: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, pattern: { type: "string" }, categoryOut: { type: "string" }, priority: { type: "integer" }, active: { type: "boolean" } } },
    },
  },
  security: [{ bearer: [] }, { cookie: [] }],
  tags: [
    { name: "auth" }, { name: "accounts" }, { name: "transactions" },
    { name: "budgets" }, { name: "goals" }, { name: "rules" },
    { name: "recurring" }, { name: "categories" }, { name: "holdings" },
    { name: "notifications" }, { name: "insights" }, { name: "stats" }, { name: "reports" },
  ],
  paths: {
    "/api/auth/login": { post: { tags: ["auth"], summary: "Login with email/password", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { email: { type: "string" }, password: { type: "string" } } } } } }, responses: { "200": { description: "OK" }, "401": { description: "Unauthorized" } } } },
    "/api/auth/signup": { post: { tags: ["auth"], summary: "Create account", responses: { "200": { description: "OK" } } } },
    "/api/auth/logout": { post: { tags: ["auth"], summary: "Logout", responses: { "200": { description: "OK" } } } },
    "/api/auth/me": { get: { tags: ["auth"], summary: "Current user", responses: { "200": { description: "OK" } } } },
    "/api/accounts": {
      get: { tags: ["accounts"], summary: "List accounts", responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Account" } } } } } } },
      post: { tags: ["accounts"], summary: "Create account", responses: { "200": { description: "OK" } } },
    },
    "/api/accounts/{id}": {
      patch: { tags: ["accounts"], summary: "Update account", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
      delete: { tags: ["accounts"], summary: "Delete account", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
    },
    "/api/transactions": {
      get: { tags: ["transactions"], summary: "List transactions (cursor-paginated)", parameters: [
        { name: "category", in: "query", schema: { type: "string" } },
        { name: "type", in: "query", schema: { type: "string", enum: ["income", "expense"] } },
        { name: "q", in: "query", schema: { type: "string" } },
        { name: "from", in: "query", schema: { type: "string", format: "date" } },
        { name: "to", in: "query", schema: { type: "string", format: "date" } },
        { name: "cursor", in: "query", schema: { type: "string" } },
        { name: "pageSize", in: "query", schema: { type: "integer", maximum: 100 } },
      ], responses: { "200": { description: "OK" } } },
      post: { tags: ["transactions"], summary: "Create transaction", responses: { "200": { description: "OK" } } },
    },
    "/api/transactions/{id}": {
      patch: { tags: ["transactions"], summary: "Update transaction", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
      delete: { tags: ["transactions"], summary: "Delete transaction", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
    },
    "/api/transactions/bulk": { post: { tags: ["transactions"], summary: "Bulk delete/recategorize/move", responses: { "200": { description: "OK" } } } },
    "/api/transactions/import": { post: { tags: ["transactions"], summary: "Import from CSV rows", responses: { "200": { description: "OK" } } } },
    "/api/transactions/export": { get: { tags: ["transactions"], summary: "CSV export", responses: { "200": { description: "OK" } } } },
    "/api/budgets": {
      get: { tags: ["budgets"], summary: "List budgets", responses: { "200": { description: "OK" } } },
      post: { tags: ["budgets"], summary: "Upsert budget", responses: { "200": { description: "OK" } } },
    },
    "/api/budgets/{id}": {
      patch: { tags: ["budgets"], summary: "Update", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
      delete: { tags: ["budgets"], summary: "Delete", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
    },
    "/api/goals": {
      get: { tags: ["goals"], summary: "List goals", responses: { "200": { description: "OK" } } },
      post: { tags: ["goals"], summary: "Create goal", responses: { "200": { description: "OK" } } },
    },
    "/api/goals/{id}": {
      patch: { tags: ["goals"], summary: "Update goal", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
      delete: { tags: ["goals"], summary: "Delete goal", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
    },
    "/api/goals/{id}/projection": { get: { tags: ["goals"], summary: "Forecast progress", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } } },
    "/api/goals/{id}/contributions": {
      get: { tags: ["goals"], summary: "List contributions", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
      post: { tags: ["goals"], summary: "Add contribution", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
    },
    "/api/goals/{id}/contributions/{cid}": { delete: { tags: ["goals"], summary: "Delete contribution", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "cid", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } } },
    "/api/rules": {
      get: { tags: ["rules"], summary: "List rules", responses: { "200": { description: "OK" } } },
      post: { tags: ["rules"], summary: "Create rule", responses: { "200": { description: "OK" } } },
    },
    "/api/rules/{id}": {
      patch: { tags: ["rules"], summary: "Update rule", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
      delete: { tags: ["rules"], summary: "Delete rule", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
    },
    "/api/rules/apply": { post: { tags: ["rules"], summary: "Backfill rules against existing transactions", responses: { "200": { description: "OK" } } } },
    "/api/recurring": {
      get: { tags: ["recurring"], summary: "List recurring", responses: { "200": { description: "OK" } } },
      post: { tags: ["recurring"], summary: "Create recurring", responses: { "200": { description: "OK" } } },
    },
    "/api/recurring/{id}": {
      patch: { tags: ["recurring"], summary: "Update", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
      delete: { tags: ["recurring"], summary: "Delete", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
    },
    "/api/categories": {
      get: { tags: ["categories"], summary: "List categories", responses: { "200": { description: "OK" } } },
      post: { tags: ["categories"], summary: "Create category", responses: { "200": { description: "OK" } } },
    },
    "/api/categories/{id}": {
      patch: { tags: ["categories"], summary: "Update", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
      delete: { tags: ["categories"], summary: "Delete", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
    },
    "/api/holdings": {
      get: { tags: ["holdings"], summary: "List holdings + quotes", responses: { "200": { description: "OK" } } },
      post: { tags: ["holdings"], summary: "Add holding", responses: { "200": { description: "OK" } } },
    },
    "/api/holdings/{id}": {
      patch: { tags: ["holdings"], summary: "Update", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
      delete: { tags: ["holdings"], summary: "Delete", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
    },
    "/api/notifications": { get: { tags: ["notifications"], summary: "List notifications", responses: { "200": { description: "OK" } } } },
    "/api/notifications/{id}/read": { post: { tags: ["notifications"], summary: "Mark read", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } } },
    "/api/notifications/read-all": { post: { tags: ["notifications"], summary: "Mark all read", responses: { "200": { description: "OK" } } } },
    "/api/insights/projection": { get: { tags: ["insights"], summary: "Net worth projection", responses: { "200": { description: "OK" } } } },
    "/api/insights/subscriptions": { get: { tags: ["insights"], summary: "Subscription detection", responses: { "200": { description: "OK" } } } },
    "/api/insights/cashflow": { get: { tags: ["insights"], summary: "90-day cash flow forecast", responses: { "200": { description: "OK" } } } },
    "/api/stats/overview": { get: { tags: ["stats"], summary: "Dashboard overview", responses: { "200": { description: "OK" } } } },
    "/api/stats/insights": { get: { tags: ["stats"], summary: "MoM / anomalies / heatmap", responses: { "200": { description: "OK" } } } },
    "/api/reports/monthly": { get: { tags: ["reports"], summary: "Monthly PDF statement", parameters: [{ name: "month", in: "query", schema: { type: "string", pattern: "^\\d{4}-\\d{2}$" } }], responses: { "200": { description: "PDF stream", content: { "application/pdf": {} } } } } },
  },
};

export function GET() {
  return NextResponse.json(spec);
}
