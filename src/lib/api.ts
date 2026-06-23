import { Platform } from "react-native"

const _configuredBase = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000"
// Android emulator routes localhost traffic to the host machine via 10.0.2.2
const BASE = Platform.OS === "android" && _configuredBase.includes("127.0.0.1")
  ? _configuredBase.replace("127.0.0.1", "10.0.2.2")
  : _configuredBase
const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? ""
const BRIDGE_KEY = process.env.EXPO_PUBLIC_BRIDGE_KEY ?? ""

function headers(extra?: Record<string, string>): Record<string, string> {
  return { "Content-Type": "application/json", "X-API-KEY": API_KEY, ...extra }
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
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function apiPost<T = any>(path: string, identity: string, body: Record<string, any>): Promise<T> {
  const res = await fetch(`${BASE}/api/${path}`, {
    method: "POST",
    headers: headers({ "X-Identity": identity }),
    body: JSON.stringify({ ...body, identity }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

// ── Typed helpers ─────────────────────────────────────────────────────────────

export const api = {
  dashboard: (identity: string) => apiGet("dashboard/", identity),
  clients: (identity: string, params?: Record<string, string>) => apiGet("clients/", identity, params),
  client: (identity: string, id: string) => apiGet(`clients/${id}/`, identity),
  bonds: (identity: string, params?: Record<string, string>) => apiGet("bonds/", identity, params),
  alerts: (identity: string) => apiGet("notifications/", identity),
  arrests: (identity: string, params?: Record<string, string>) => apiGet("inmates/", identity, { page_size: "100", ...params }),
  bondwatch: {
    clients: (identity: string) => apiGet("bondwatch/clients/", identity),
    alerts: (identity: string) => apiGet("bondwatch/alerts/", identity),
  },
  bondtrack: (identity: string) => apiGet("bondtrack/sessions/", identity),
  payments: (identity: string) => apiGet("payments/enterprise/", identity),
  courtDates: (identity: string, params?: Record<string, string>) => apiGet("calendar/events/", identity, params),
  bondapp: (identity: string) => apiGet("applications/", identity),
  esign: (identity: string) => apiGet("esign/documents/", identity),
  reports: {
    kpis: (identity: string) => apiGet("reports/kpis/", identity),
    counties: (identity: string) => apiGet("reports/counties/", identity),
    agents: (identity: string) => apiGet("reports/agents/", identity),
    revenue: (identity: string) => apiGet("reports/revenue/", identity),
  },
  powers: (identity: string, params?: Record<string, string>) => apiGet("powers/", identity, params),
  team: (identity: string) => apiGet("team/", identity),
  billing: async (identity: string) => {
    const [invoices, subscription, plans] = await Promise.all([
      apiGet("billing/invoices/", identity).catch(() => []),
      apiGet("billing/subscription/", identity).catch(() => ({})),
      apiGet("billing/plans/", identity).catch(() => []),
    ])
    return {
      invoices: (invoices as any)?.data ?? (invoices as any)?.results ?? invoices,
      subscription: (subscription as any)?.data ?? subscription,
      plans: (plans as any)?.data ?? plans,
    }
  },
  messages: (identity: string) => apiGet("sms-consent/", identity),
  counties: (identity: string) => apiGet("monitored-counties/", identity),
}
