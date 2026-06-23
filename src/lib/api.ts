import { Platform } from "react-native"

const _configuredBase = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000"
const BASE = Platform.OS === "android" && _configuredBase.includes("127.0.0.1")
  ? _configuredBase.replace("127.0.0.1", "10.0.2.2")
  : _configuredBase
const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? ""
const BRIDGE_KEY = process.env.EXPO_PUBLIC_BRIDGE_KEY ?? ""

let _onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void) { _onUnauthorized = fn }

function headers(extra?: Record<string, string>): Record<string, string> {
  return { "Content-Type": "application/json", "X-API-KEY": API_KEY, ...extra }
}

async function handleRes(res: Response) {
  if (res.status === 401) { _onUnauthorized?.(); throw new Error("Unauthorized") }
  if (!res.ok) {
    let msg = `API error ${res.status}`
    try { const j = await res.json(); msg = j?.detail ?? j?.error ?? msg } catch {}
    throw new Error(msg)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export async function loginApi(identity: string, password: string) {
  const res = await fetch(`${BASE}/api/next-bridge/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-BRIDGE-KEY": BRIDGE_KEY },
    body: JSON.stringify({ identity, password }),
  })
  if (!res.ok) throw new Error("Login failed")
  const json = await res.json()
  if (!json.ok) throw new Error(json.detail ?? "Invalid credentials")
  return json as { ok: boolean; token: string; user: { email: string; username: string; first_name?: string; last_name?: string } }
}

export async function apiGet<T = any>(path: string, identity: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}/api/${path}`)
  url.searchParams.set("identity", identity)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { headers: headers() })
  return handleRes(res)
}

export async function apiPost<T = any>(path: string, identity: string, body: Record<string, any>): Promise<T> {
  const res = await fetch(`${BASE}/api/${path}`, {
    method: "POST",
    headers: headers({ "X-Identity": identity }),
    body: JSON.stringify({ ...body, identity }),
  })
  return handleRes(res)
}

export async function apiPatch<T = any>(path: string, identity: string, body: Record<string, any>): Promise<T> {
  const res = await fetch(`${BASE}/api/${path}`, {
    method: "PATCH",
    headers: headers({ "X-Identity": identity }),
    body: JSON.stringify({ ...body, identity }),
  })
  return handleRes(res)
}

export async function apiDelete(path: string, identity: string): Promise<void> {
  const res = await fetch(`${BASE}/api/${path}`, {
    method: "DELETE",
    headers: headers({ "X-Identity": identity }),
  })
  if (res.status === 401) { _onUnauthorized?.(); throw new Error("Unauthorized") }
  if (!res.ok && res.status !== 204) throw new Error(`API error ${res.status}`)
}

export const api = {
  // ── Dashboard ──────────────────────────────────────────────────────────────
  dashboard: (identity: string) => apiGet("dashboard/", identity),

  // ── Clients ────────────────────────────────────────────────────────────────
  clients: (identity: string, params?: Record<string, string>) => apiGet("clients/", identity, params),
  client: (identity: string, id: string | number) => apiGet(`clients/${id}/`, identity),
  clientNotes: (identity: string, id: string | number) => apiGet(`clients/${id}/notes/`, identity),
  createClient: (identity: string, body: Record<string, any>) => apiPost("clients/", identity, body),
  updateClient: (identity: string, id: string | number, body: Record<string, any>) => apiPatch(`clients/${id}/`, identity, body),
  deleteClient: (identity: string, id: string | number) => apiDelete(`clients/${id}/`, identity),
  addClientNote: (identity: string, id: string | number, body: Record<string, any>) => apiPost(`clients/${id}/notes/`, identity, body),

  // ── Bonds ──────────────────────────────────────────────────────────────────
  bonds: (identity: string, params?: Record<string, string>) => apiGet("bonds/", identity, params),
  bond: (identity: string, id: string | number) => apiGet(`bonds/${id}/`, identity),
  bondTimeline: (identity: string, id: string | number) => apiGet(`bonds/${id}/timeline/`, identity),
  createBond: (identity: string, body: Record<string, any>) => apiPost("bonds/", identity, body),
  updateBond: (identity: string, id: string | number, body: Record<string, any>) => apiPatch(`bonds/${id}/`, identity, body),

  // ── Alerts / Notifications ─────────────────────────────────────────────────
  alerts: (identity: string) => apiGet("notifications/", identity),
  markRead: (identity: string, id: string | number) => apiPost(`notifications/${id}/read/`, identity, {}),
  markAllRead: (identity: string) => apiPost("notifications/read-all/", identity, {}),

  // ── Arrests ────────────────────────────────────────────────────────────────
  arrests: (identity: string, params?: Record<string, string>) => apiGet("inmates/", identity, { page_size: "100", ...params }),
  inmateToClient: (identity: string, body: Record<string, any>) => apiPost("inmates/to-client/", identity, body),

  // ── BondWatch ──────────────────────────────────────────────────────────────
  bondwatch: {
    clients: (identity: string) => apiGet("bondwatch/clients/", identity),
    alerts: (identity: string) => apiGet("bondwatch/alerts/", identity),
    clear: (identity: string, body: Record<string, any>) => apiPost("bondwatch/cleared/", identity, body),
  },

  // ── BondTrack ──────────────────────────────────────────────────────────────
  bondtrack: (identity: string) => apiGet("bondtrack/sessions/", identity),
  bondtrackSession: (identity: string, id: string | number) => apiGet(`bondtrack/sessions/${id}/`, identity),
  bondtrackAlerts: (identity: string, id: string | number) => apiGet(`bondtrack/sessions/${id}/alerts/`, identity),
  bondtrackResolve: (identity: string, id: string | number) => apiPost(`bondtrack/sessions/${id}/resolve/`, identity, {}),
  createBondTrack: (identity: string, body: Record<string, any>) => apiPost("bondtrack/sessions/", identity, body),

  // ── Payments ───────────────────────────────────────────────────────────────
  payments: (identity: string) => apiGet("payments/enterprise/", identity),
  createPayment: (identity: string, body: Record<string, any>) => apiPost("payments/", identity, body),
  updatePayment: (identity: string, id: string | number, body: Record<string, any>) => apiPatch(`payments/${id}/`, identity, body),
  sendPaymentReminder: (identity: string, body: Record<string, any>) => apiPost("payments/remind/", identity, body),
  emailReceipt: (identity: string, body: Record<string, any>) => apiPost("payments/email-receipt/", identity, body),

  // ── Calendar ───────────────────────────────────────────────────────────────
  courtDates: (identity: string, params?: Record<string, string>) => apiGet("calendar/events/", identity, params),
  courtDate: (identity: string, id: string | number) => apiGet(`calendar/events/${id}/`, identity),
  createCourtDate: (identity: string, body: Record<string, any>) => apiPost("calendar/events/", identity, body),
  updateCourtDate: (identity: string, id: string | number, body: Record<string, any>) => apiPatch(`calendar/events/${id}/`, identity, body),
  deleteCourtDate: (identity: string, id: string | number) => apiDelete(`calendar/events/${id}/`, identity),

  // ── Bond Applications ──────────────────────────────────────────────────────
  bondapp: (identity: string) => apiGet("applications/", identity),
  bondappDetail: (identity: string, id: string | number) => apiGet(`applications/${id}/`, identity),
  bondappDecision: (identity: string, id: string | number, decision: "approved" | "denied", notes?: string) =>
    apiPost(`applications/${id}/decision/`, identity, { decision, notes }),
  bondappSendLink: (identity: string, id: string | number) => apiPost(`applications/${id}/send-link/`, identity, {}),
  createBondApp: (identity: string, body: Record<string, any>) => apiPost("applications/", identity, body),

  // ── E-Sign ────────────────────────────────────────────────────────────────
  esign: (identity: string) => apiGet("esign/documents/", identity),
  esignDetail: (identity: string, id: string | number) => apiGet(`esign/documents/${id}/`, identity),
  createESign: (identity: string, body: Record<string, any>) => apiPost("esign/documents/", identity, body),
  updateESign: (identity: string, id: string | number, body: Record<string, any>) => apiPatch(`esign/documents/${id}/`, identity, body),
  resendESign: (identity: string, id: string | number) => apiPost(`esign/documents/${id}/resend/`, identity, {}),

  // ── Reports ───────────────────────────────────────────────────────────────
  reports: {
    kpis: (identity: string, period?: string) => apiGet("reports/kpis/", identity, period ? { period } : undefined),
    counties: (identity: string, period?: string) => apiGet("reports/counties/", identity, period ? { period } : undefined),
    agents: (identity: string, period?: string) => apiGet("reports/agents/", identity, period ? { period } : undefined),
    revenue: (identity: string, period?: string) => apiGet("reports/revenue/", identity, period ? { period } : undefined),
  },

  // ── Powers ────────────────────────────────────────────────────────────────
  powers: (identity: string, params?: Record<string, string>) => apiGet("powers/", identity, params),
  power: (identity: string, id: string | number) => apiGet(`powers/${id}/`, identity),
  createPower: (identity: string, body: Record<string, any>) => apiPost("powers/", identity, body),
  updatePower: (identity: string, id: string | number, body: Record<string, any>) => apiPatch(`powers/${id}/`, identity, body),

  // ── Team ──────────────────────────────────────────────────────────────────
  team: (identity: string) => apiGet("team/", identity),
  inviteUser: (identity: string, body: Record<string, any>) => apiPost("users/invite/", identity, body),
  updateTeamMember: (identity: string, id: string | number, body: Record<string, any>) => apiPatch(`team/${id}/`, identity, body),
  deleteTeamMember: (identity: string, id: string | number) => apiDelete(`team/${id}/`, identity),

  // ── Billing ───────────────────────────────────────────────────────────────
  billing: async (identity: string) => {
    const [invoices, subscription, plans] = await Promise.all([
      apiGet("billing/invoices/", identity).catch(() => []),
      apiGet("billing/subscription/", identity).catch(() => ({})),
      apiGet("billing/plans/", identity).catch(() => []),
    ])
    return {
      invoices: (invoices as any)?.data ?? (invoices as any)?.results ?? invoices ?? [],
      subscription: (subscription as any)?.data ?? subscription ?? {},
      plans: (plans as any)?.data ?? plans ?? [],
    }
  },

  // ── Messages ──────────────────────────────────────────────────────────────
  messages: (identity: string) => apiGet("users/communications/", identity),
  sendMessage: (identity: string, body: Record<string, any>) => apiPost("users/communications/", identity, body),

  // ── County Coverage ───────────────────────────────────────────────────────
  counties: (identity: string) => apiGet("monitored-counties/", identity),
  requestCounty: (identity: string, body: Record<string, any>) => apiPost("monitored-counties/", identity, body),
  deleteCounty: (identity: string, id: string | number) => apiDelete(`monitored-counties/${id}/`, identity),

  // ── Reference ─────────────────────────────────────────────────────────────
  allCounties: (identity: string) => apiGet("counties/all/", identity),
  sureties: (identity: string) => apiGet("sureties/", identity),
  charges: (identity: string) => apiGet("charges/", identity),
}
