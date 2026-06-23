import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

function fmtMoney(v: any): string {
  if (v == null) return "—"
  const n = typeof v === "string" ? parseFloat(v) : v
  if (isNaN(n)) return "—"
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return ""
  try {
    const diff = Date.now() - new Date(dateStr).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return "just now"
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  } catch { return "" }
}

const QUICK_ACTIONS = [
  { icon: "person-add-outline" as const, label: "Add Client", color: Colors.blue },
  { icon: "send-outline" as const, label: "Send BondApp", color: Colors.blueBright },
  { icon: "card-outline" as const, label: "Record Payment", color: Colors.green },
  { icon: "calendar-outline" as const, label: "Court Date", color: Colors.gold },
  { icon: "add-circle-outline" as const, label: "New Bond", color: Colors.blue },
  { icon: "search-outline" as const, label: "Search", color: Colors.muted },
]

export function DashboardScreen() {
  const { identity, user } = useAuth()
  const navigation = useNavigation<any>()
  const [dash, setDash] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!identity) return
    Promise.all([
      api.dashboard(identity).catch(() => null),
      api.arrests(identity, { page_size: "5" }).catch(() => null),
      api.courtDates(identity, { upcoming: "true", page_size: "5" }).catch(() => null),
    ]).then(([d, arr, cd]) => {
      const data = d?.data ?? d
      const bookings = arr?.bookings ?? arr?.results ?? []
      const courts = cd?.data ?? cd?.results ?? cd
      setDash({
        ...data,
        recentArrests: Array.isArray(bookings) ? bookings.slice(0, 3) : [],
        upcomingCourts: Array.isArray(courts) ? courts.slice(0, 4) : [],
      })
    }).finally(() => setLoading(false))
  }, [identity])

  const stats = dash?.stats ?? dash
  const statCards = [
    {
      label: "Active Bonds",
      value: stats?.active_bonds ?? stats?.activeBonds ?? "—",
      delta: stats?.new_bonds_today != null ? `+${stats.new_bonds_today} today` : null,
      up: true, icon: "shield-checkmark-outline" as const, color: Colors.blue,
    },
    {
      label: "Arrest Alerts",
      value: stats?.arrest_alerts ?? stats?.new_bookings ?? "—",
      delta: stats?.new_alerts_today != null ? `+${stats.new_alerts_today} today` : null,
      up: false, icon: "warning-outline" as const, color: Colors.red,
    },
    {
      label: "Total Clients",
      value: stats?.total_clients ?? stats?.totalClients ?? "—",
      delta: stats?.new_clients_week != null ? `+${stats.new_clients_week} this week` : null,
      up: true, icon: "people-outline" as const, color: Colors.blueBright,
    },
    {
      label: "Revenue",
      value: stats?.monthly_revenue != null ? fmtMoney(stats.monthly_revenue) : "—",
      delta: stats?.revenue_change != null ? `${stats.revenue_change > 0 ? "+" : ""}${stats.revenue_change}%` : null,
      up: (stats?.revenue_change ?? 0) >= 0, icon: "cash-outline" as const, color: Colors.green,
    },
  ]

  const alerts = dash?.recentArrests ?? []
  const courts = dash?.upcomingCourts ?? []
  const activities: any[] = Array.isArray(dash?.activities) ? dash.activities.slice(0, 5) : []
  const displayName = user?.name ?? user?.full_name ?? user?.username ?? identity?.split("@")[0] ?? "Agent"

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Image source={require("../../assets/bailwatchpro-icon.png")} style={s.logo} resizeMode="contain" />
            <View>
              <Text style={s.greeting}>Welcome back,</Text>
              <Text style={s.userName}>{displayName}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.notifBtn} onPress={() => navigation.navigate("Alerts")}>
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
            {alerts.length > 0 && <View style={s.notifDot} />}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.blue} />
          </View>
        ) : (
          <>
            {/* Stat Cards */}
            <View style={s.statGrid}>
              {statCards.map((c) => (
                <View key={c.label} style={s.statCard}>
                  <View style={s.statTop}>
                    <View style={[s.statIcon, { backgroundColor: c.color + "18" }]}>
                      <Ionicons name={c.icon} size={18} color={c.color} />
                    </View>
                    <Text style={s.statLabel}>{c.label}</Text>
                  </View>
                  <Text style={[s.statValue, { color: c.color }]}>{c.value}</Text>
                  {!!c.delta && (
                    <View style={s.deltaRow}>
                      <Ionicons name={c.up ? "arrow-up" : "arrow-down"} size={10} color={c.up ? Colors.green : Colors.red} />
                      <Text style={[s.deltaText, { color: c.up ? Colors.green : Colors.red }]}>{c.delta}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Quick Actions */}
            <View style={s.section}>
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.sectionTitleRow}>
                    <Ionicons name="flash-outline" size={14} color={Colors.blueBright} />
                    <Text style={s.sectionTitle}>Quick Actions</Text>
                  </View>
                </View>
                <View style={s.qaGrid}>
                  {QUICK_ACTIONS.map((a) => (
                    <TouchableOpacity key={a.label} style={s.qaBtn}>
                      <View style={[s.qaIcon, { backgroundColor: a.color + "18" }]}>
                        <Ionicons name={a.icon} size={20} color={a.color} />
                      </View>
                      <Text style={s.qaLabel}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Live Alerts Feed */}
            <View style={s.section}>
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.sectionTitleRow}>
                    <Ionicons name="radio-outline" size={14} color={Colors.red} />
                    <Text style={s.sectionTitle}>Live Alerts Feed</Text>
                    {alerts.length > 0 && (
                      <View style={s.countBadge}>
                        <Text style={s.countBadgeText}>{alerts.length}</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate("ArrestAlert")}>
                    <Text style={s.viewAll}>View All</Text>
                  </TouchableOpacity>
                </View>
                {alerts.length === 0 ? (
                  <View style={s.emptyState}>
                    <Ionicons name="checkmark-circle-outline" size={28} color={Colors.green} />
                    <Text style={s.emptyText}>No new alerts right now</Text>
                  </View>
                ) : alerts.map((alert: any, i: number) => {
                  const name = alert.full_name ?? alert.name ?? "Unknown"
                  const county = alert.arresting_agency ?? alert.county ?? ""
                  const timeStr = timeAgo(alert.booking_date ? `${alert.booking_date}T${alert.booking_time ?? "00:00:00"}` : alert.created_at ?? "")
                  const bondAmt = alert.bond_amount ? fmtMoney(parseFloat(String(alert.bond_amount))) : null
                  return (
                    <View key={alert.id ?? i} style={[s.alertRow, i < alerts.length - 1 && s.borderBottom]}>
                      <View style={s.alertDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.alertName}>{name}</Text>
                        <Text style={s.alertMeta}>{[county, timeStr].filter(Boolean).join(" · ")}</Text>
                      </View>
                      {bondAmt && <Text style={s.alertBond}>{bondAmt}</Text>}
                      <View style={s.newBadge}><Text style={s.newBadgeText}>NEW</Text></View>
                    </View>
                  )
                })}
              </View>
            </View>

            {/* Upcoming Court Dates */}
            <View style={s.section}>
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.sectionTitleRow}>
                    <Ionicons name="calendar-outline" size={14} color={Colors.blue} />
                    <Text style={s.sectionTitle}>Upcoming Court Dates</Text>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate("Calendar")}>
                    <Text style={s.viewAll}>View All</Text>
                  </TouchableOpacity>
                </View>
                {courts.length === 0 ? (
                  <View style={s.emptyState}>
                    <Ionicons name="calendar-outline" size={28} color={Colors.mutedDim} />
                    <Text style={s.emptyText}>No upcoming court dates</Text>
                  </View>
                ) : courts.map((cd: any, i: number) => {
                  const name = cd.client_name ?? cd.defendant_name ?? cd.full_name ?? "Unknown"
                  const court = cd.court_name ?? cd.court ?? ""
                  const dateStr = cd.court_date ?? cd.date ?? ""
                  const displayDate = dateStr ? new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""
                  const county = cd.county ?? cd.location ?? ""
                  return (
                    <View key={cd.id ?? i} style={[s.courtRow, i < courts.length - 1 && s.borderBottom]}>
                      <View style={s.courtDateChip}>
                        <Text style={s.courtDateText}>{displayDate}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.courtName}>{name}</Text>
                        {!!court && <Text style={s.courtMeta}>{court}</Text>}
                      </View>
                      {!!county && <Text style={s.courtCounty}>{county}</Text>}
                    </View>
                  )
                })}
              </View>
            </View>

            {/* Recent Activity */}
            {activities.length > 0 && (
              <View style={s.section}>
                <View style={s.card}>
                  <View style={s.cardHeader}>
                    <View style={s.sectionTitleRow}>
                      <Ionicons name="pulse-outline" size={14} color={Colors.blueBright} />
                      <Text style={s.sectionTitle}>Recent Activity</Text>
                    </View>
                  </View>
                  {activities.map((act: any, i: number) => {
                    const label = act.message ?? act.description ?? act.label ?? "Activity"
                    const time = timeAgo(act.created_at ?? act.timestamp ?? "")
                    return (
                      <View key={act.id ?? i} style={[s.actRow, i < activities.length - 1 && s.borderBottom]}>
                        <View style={s.actIconWrap}>
                          <Ionicons name="ellipse" size={8} color={Colors.blue} />
                        </View>
                        <Text style={s.actLabel} numberOfLines={2}>{label}</Text>
                        {!!time && <Text style={s.actTime}>{time}</Text>}
                      </View>
                    )
                  })}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  loadingWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.md, marginHorizontal: Spacing.xl, marginVertical: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 36, height: 36 },
  greeting: { fontSize: FontSize.xs, color: Colors.muted },
  userName: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.extrabold },
  notifBtn: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  notifDot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.red },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  statCard: { width: "48.5%", backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  statTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  statIcon: { width: 28, height: 28, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
  statLabel: { fontSize: 10, color: Colors.muted, flex: 1 },
  statValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold, marginBottom: 2 },
  deltaRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  deltaText: { fontSize: FontSize.xs },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.md },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  countBadge: { backgroundColor: Colors.red + "18", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  countBadgeText: { fontSize: 10, color: Colors.red, fontFamily: Font.bold },
  viewAll: { fontSize: FontSize.xs, color: Colors.blueBright, fontFamily: Font.semibold },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: Colors.borderFaint },
  emptyState: { alignItems: "center", paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.sm, color: Colors.mutedDim },
  alertRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, padding: Spacing.lg },
  alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.red },
  alertName: { fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.semibold },
  alertMeta: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  alertBond: { fontSize: FontSize.xs, color: Colors.green, fontFamily: Font.semibold },
  newBadge: { backgroundColor: Colors.red + "18", borderRadius: 4, borderWidth: 1, borderColor: Colors.red + "40", paddingHorizontal: 5, paddingVertical: 2 },
  newBadgeText: { fontSize: 9, color: Colors.red, fontFamily: Font.bold, letterSpacing: 0.5 },
  courtRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, padding: Spacing.lg },
  courtDateChip: { backgroundColor: Colors.blue + "18", borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4, minWidth: 52, alignItems: "center" },
  courtDateText: { fontSize: FontSize.xs, color: Colors.blueBright, fontFamily: Font.bold },
  courtName: { fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.semibold },
  courtMeta: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 1 },
  courtCounty: { fontSize: FontSize.xs, color: Colors.mutedDim },
  actRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, padding: Spacing.lg },
  actIconWrap: { width: 20, height: 20, alignItems: "center", justifyContent: "center" },
  actLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.muted },
  actTime: { fontSize: FontSize.xs, color: Colors.mutedDim },
  qaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: Spacing.lg },
  qaBtn: { alignItems: "center", gap: 6, width: "31%" },
  qaIcon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  qaLabel: { fontSize: FontSize.xs, color: Colors.muted, textAlign: "center" },
})
