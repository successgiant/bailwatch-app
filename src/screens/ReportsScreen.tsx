import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

function fmtMoney(v: any): string {
  const n = parseFloat(String(v ?? "0").replace(/[$,]/g, ""))
  if (!n && n !== 0) return "—"
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const PERIODS = [
  { key: "week", label: "7 Days" },
  { key: "month", label: "30 Days" },
  { key: "quarter", label: "90 Days" },
  { key: "year", label: "Year" },
]

export function ReportsScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState("month")

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const [kpis, counties, agents, revenue] = await Promise.all([
        api.reports.kpis(identity, period).catch(() => null),
        api.reports.counties(identity, period).catch(() => null),
        api.reports.agents(identity, period).catch(() => null),
        api.reports.revenue(identity, period).catch(() => null),
      ])
      setData({ kpis, counties, agents, revenue })
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity, period])

  const kpis = data?.kpis?.data ?? data?.kpis ?? {}
  const countiesRaw: any[] = Array.isArray(data?.counties?.results) ? data.counties.results : Array.isArray(data?.counties?.data) ? data.counties.data : Array.isArray(data?.counties) ? data.counties : []
  const agentsRaw: any[] = Array.isArray(data?.agents?.results) ? data.agents.results : Array.isArray(data?.agents?.data) ? data.agents.data : Array.isArray(data?.agents) ? data.agents : []
  const revenue = data?.revenue?.data ?? data?.revenue ?? {}

  const kpiCards = [
    { label: "ArrestAlert Bookings", value: String(kpis?.arrest_alert_bookings ?? kpis?.new_bookings ?? "—"), icon: "shield-outline" as const, color: Colors.red },
    { label: "Prospects", value: String(kpis?.prospects ?? kpis?.total_prospects ?? "—"), icon: "people-outline" as const, color: Colors.blueBright },
    { label: "Applications Sent", value: String(kpis?.applications_sent ?? "—"), icon: "paper-plane-outline" as const, color: Colors.blue },
    { label: "Applications Received", value: String(kpis?.applications_received ?? "—"), icon: "document-text-outline" as const, color: Colors.purple },
    { label: "Bond Posted", value: String(kpis?.bond_posted ?? kpis?.bonds_posted ?? "—"), icon: "checkmark-circle-outline" as const, color: Colors.green },
    { label: "Clients Converted", value: String(kpis?.clients_converted ?? "—"), icon: "person-add-outline" as const, color: Colors.emerald },
    { label: "Conversion Rate", value: kpis?.conversion_rate != null ? `${kpis.conversion_rate}%` : "—", icon: "trending-up-outline" as const, color: Colors.gold },
    { label: "Total Revenue", value: fmtMoney(kpis?.total_revenue ?? revenue?.total_revenue), icon: "cash-outline" as const, color: Colors.green },
    { label: "Active Bonds", value: String(kpis?.active_bonds ?? "—"), icon: "shield-checkmark-outline" as const, color: Colors.blue },
    { label: "Total Bond Value", value: fmtMoney(kpis?.total_bond_value ?? kpis?.bond_value), icon: "calculator-outline" as const, color: Colors.blueBright },
  ]

  const maxCount = countiesRaw.reduce((mx, c) => Math.max(mx, c.bond_count ?? c.bonds ?? c.count ?? c.bookings ?? 0), 1)

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.blueIconBg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.blueIconBorder }}>
          <Ionicons name="bar-chart-outline" size={17} color={Colors.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Analytics & Reports</Text>
          <Text style={s.subtitle}>Performance overview</Text>
        </View>
        <TouchableOpacity style={s.exportBtn}>
          <Ionicons name="download-outline" size={16} color={Colors.blueLight} />
        </TouchableOpacity>
      </View>

      <View style={s.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[s.periodBtn, period === p.key && s.periodBtnActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[s.periodText, period === p.key && s.periodTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={Colors.blue} />}
        >
          <View style={s.sectionHeader}>
            <View style={s.sectionIconWrap}>
              <Ionicons name="stats-chart-outline" size={14} color={Colors.blue} />
            </View>
            <Text style={s.sectionHeaderTitle}>Key Performance Indicators</Text>
          </View>
          <View style={s.kpiGrid}>
            {kpiCards.map((c) => (
              <View key={c.label} style={s.kpiCard}>
                <View style={[s.kpiIcon, { backgroundColor: c.color + "18" }]}>
                  <Ionicons name={c.icon} size={16} color={c.color} />
                </View>
                <Text style={[s.kpiValue, { color: c.color }]}>{c.value}</Text>
                <Text style={s.kpiLabel}>{c.label}</Text>
              </View>
            ))}
          </View>

          {countiesRaw.length > 0 && (
            <>
              <View style={s.sectionHeader}>
                <View style={s.sectionIconWrap}>
                  <Ionicons name="flag-outline" size={14} color={Colors.blue} />
                </View>
                <Text style={s.sectionHeaderTitle}>County Breakdown</Text>
              </View>
              <View style={s.card}>
                {countiesRaw.slice(0, 8).map((c: any, i: number) => {
                  const name = c.name ?? c.county ?? c.county_name ?? "Unknown"
                  const count = c.bond_count ?? c.bonds ?? c.count ?? c.bookings ?? 0
                  const pct = c.percentage ?? (maxCount > 0 ? Math.round((count / maxCount) * 100) : 0)
                  return (
                    <View key={c.id ?? i} style={[s.countyRow, i < countiesRaw.length - 1 && s.rowBorder]}>
                      <View style={s.countyTop}>
                        <View style={s.rankBadge}>
                          <Text style={s.rankText}>{i + 1}</Text>
                        </View>
                        <Text style={s.countyName} numberOfLines={1}>{name}</Text>
                        <Text style={s.countyCount}>{count}</Text>
                        <Text style={s.countyPct}>{pct}%</Text>
                      </View>
                      <View style={s.progressBar}>
                        <View style={[s.progressFill, { width: `${Math.min(pct, 100)}%` as any }]} />
                      </View>
                    </View>
                  )
                })}
              </View>
            </>
          )}

          {agentsRaw.length > 0 && (
            <>
              <View style={s.sectionHeader}>
                <View style={s.sectionIconWrap}>
                  <Ionicons name="shield-outline" size={14} color={Colors.blue} />
                </View>
                <Text style={s.sectionHeaderTitle}>Agent Performance</Text>
              </View>
              <View style={s.card}>
                <View style={[s.tableHeader, s.tableRow]}>
                  <Text style={[s.tableHeaderText, { flex: 2 }]}>Agent</Text>
                  <Text style={[s.tableHeaderText, { flex: 1, textAlign: "center" }]}>Bonds</Text>
                  <Text style={[s.tableHeaderText, { flex: 1.5, textAlign: "right" }]}>Revenue</Text>
                  <Text style={[s.tableHeaderText, { flex: 1, textAlign: "right" }]}>Conv.</Text>
                </View>
                {agentsRaw.slice(0, 8).map((a: any, i: number) => {
                  const name = a.name ?? a.agent_name ?? "Unknown"
                  const bonds = a.bond_count ?? a.bonds ?? "—"
                  const rev = fmtMoney(a.revenue ?? a.total_revenue)
                  const conv = a.conversion ?? a.conversion_rate
                  return (
                    <View key={a.id ?? i} style={[s.tableRow, i < agentsRaw.length - 1 && s.rowBorder]}>
                      <View style={{ flex: 2, flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={s.agentAvatar}>
                          <Text style={s.agentInitials}>
                            {name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={s.tableCell} numberOfLines={1}>{name}</Text>
                      </View>
                      <Text style={[s.tableCell, { flex: 1, textAlign: "center" }]}>{bonds}</Text>
                      <Text style={[s.tableCellGreen, { flex: 1.5, textAlign: "right" }]}>{rev}</Text>
                      <Text style={[s.tableCell, { flex: 1, textAlign: "right" }]}>{conv != null ? `${conv}%` : "—"}</Text>
                    </View>
                  )
                })}
              </View>
            </>
          )}

          {(revenue.total_revenue || revenue.premium_collected || revenue.fees_collected) ? (
            <>
              <View style={s.sectionHeader}>
                <View style={s.sectionIconWrap}>
                  <Ionicons name="cash-outline" size={14} color={Colors.blue} />
                </View>
                <Text style={s.sectionHeaderTitle}>Revenue Summary</Text>
              </View>
              <View style={s.card}>
                {[
                  { label: "Total Revenue", value: fmtMoney(revenue.total_revenue), color: Colors.green },
                  { label: "Premium Collected", value: fmtMoney(revenue.premium_collected ?? revenue.premiums), color: Colors.blueBright },
                  { label: "Fees Collected", value: fmtMoney(revenue.fees_collected ?? revenue.fees), color: Colors.blue },
                  { label: "Outstanding", value: fmtMoney(revenue.outstanding ?? revenue.total_outstanding), color: Colors.gold },
                ].filter((r) => r.value !== "—").map((r, i, arr) => (
                  <View key={r.label} style={[s.revenueRow, i < arr.length - 1 && s.rowBorder]}>
                    <Text style={s.revenueLabel}>{r.label}</Text>
                    <Text style={[s.revenueValue, { color: r.color }]}>{r.value}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginHorizontal: Spacing.xl, marginVertical: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  subtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  exportBtn: { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Colors.blueSubtle, borderWidth: 1, borderColor: Colors.blueBorder, alignItems: "center", justifyContent: "center" },
  periodRow: { flexDirection: "row", marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 3, gap: 2 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: Radius.sm - 2, alignItems: "center" },
  periodBtnActive: { backgroundColor: Colors.blue },
  periodText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  periodTextActive: { color: Colors.text },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: Spacing.md, marginTop: Spacing.sm },
  sectionIconWrap: { width: 28, height: 28, borderRadius: Radius.sm, backgroundColor: Colors.blueIconBg, borderWidth: 1, borderColor: Colors.blueIconBorder, alignItems: "center", justifyContent: "center" },
  sectionHeaderTitle: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: Spacing.lg },
  kpiCard: { width: "48%", backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  kpiIcon: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center", marginBottom: Spacing.sm },
  kpiValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold, marginBottom: 2 },
  kpiLabel: { fontSize: 9, color: Colors.mutedDim },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: "hidden", marginBottom: Spacing.lg },
  tableHeader: { backgroundColor: Colors.bgPanel },
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.lg, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.rowDivider },
  tableHeaderText: { fontSize: 10, color: Colors.mutedDim, fontFamily: Font.bold, textTransform: "uppercase", letterSpacing: 0.5 },
  tableCell: { fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.medium },
  tableCellGreen: { fontSize: FontSize.sm, color: Colors.green, fontFamily: Font.bold },
  rankBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.blue + "22", alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 10, color: Colors.blueBright, fontFamily: Font.bold },
  agentAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.blue + "22", alignItems: "center", justifyContent: "center" },
  agentInitials: { fontSize: 10, color: Colors.blueBright, fontFamily: Font.bold },
  countyRow: { paddingHorizontal: Spacing.lg, paddingVertical: 10 },
  countyTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  countyName: { flex: 1, fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.medium },
  countyCount: { fontSize: FontSize.sm, color: Colors.muted },
  countyPct: { fontSize: FontSize.xs, color: Colors.mutedDim, width: 32, textAlign: "right" },
  progressBar: { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: Colors.blue, borderRadius: 2 },
  revenueRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: Spacing.lg },
  revenueLabel: { fontSize: FontSize.sm, color: Colors.muted },
  revenueValue: { fontSize: FontSize.md, fontFamily: Font.bold },
})
