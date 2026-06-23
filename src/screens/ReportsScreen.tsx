import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
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

export function ReportsScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("month")

  useEffect(() => {
    if (!identity) return
    Promise.all([
      api.reports.kpis(identity).catch(() => null),
      api.reports.counties(identity).catch(() => null),
      api.reports.agents(identity).catch(() => null),
      api.reports.revenue(identity).catch(() => null),
    ]).then(([kpis, counties, agents, revenue]) => {
      setData({ kpis, counties, agents, revenue })
    }).finally(() => setLoading(false))
  }, [identity, period])

  const kpis = data?.kpis?.data ?? data?.kpis ?? {}
  const counties: any[] = Array.isArray(data?.counties?.data) ? data.counties.data : Array.isArray(data?.counties) ? data.counties : []
  const agents: any[] = Array.isArray(data?.agents?.data) ? data.agents.data : Array.isArray(data?.agents) ? data.agents : []
  const revenue = data?.revenue?.data ?? data?.revenue ?? {}

  const statCards = [
    { label: "Total Revenue", value: fmtMoney(kpis.total_revenue ?? revenue.total_revenue), icon: "cash-outline" as const, color: Colors.green, delta: kpis.revenue_change },
    { label: "Active Bonds", value: kpis.active_bonds ?? "—", icon: "shield-checkmark-outline" as const, color: Colors.blue },
    { label: "New Clients", value: kpis.new_clients ?? "—", icon: "person-add-outline" as const, color: Colors.blueBright },
    { label: "Total Bond Value", value: fmtMoney(kpis.total_bond_value ?? kpis.bond_value), icon: "trending-up-outline" as const, color: Colors.purple },
    { label: "Avg Bond Size", value: fmtMoney(kpis.avg_bond_amount ?? kpis.average_bond), icon: "calculator-outline" as const, color: Colors.gold },
    { label: "Forfeiture Rate", value: kpis.forfeiture_rate != null ? `${kpis.forfeiture_rate}%` : "—", icon: "alert-circle-outline" as const, color: Colors.red },
  ]

  const periods = [
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "quarter", label: "Quarter" },
    { key: "year", label: "Year" },
  ]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.emerald + "18", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="bar-chart-outline" size={17} color={Colors.emerald} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Analytics & Reports</Text>
          <Text style={s.subtitle}>Performance overview</Text>
        </View>
        <TouchableOpacity style={s.exportBtn}>
          <Ionicons name="download-outline" size={16} color={Colors.blueBright} />
        </TouchableOpacity>
      </View>

      {/* Period selector */}
      <View style={s.periodRow}>
        {periods.map((p) => (
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32 }}>
          {/* KPI Grid */}
          <View style={s.kpiGrid}>
            {statCards.map((c) => (
              <View key={c.label} style={s.kpiCard}>
                <View style={s.kpiTop}>
                  <View style={[s.kpiIcon, { backgroundColor: c.color + "18" }]}>
                    <Ionicons name={c.icon} size={16} color={c.color} />
                  </View>
                </View>
                <Text style={[s.kpiValue, { color: c.color }]}>{c.value}</Text>
                <Text style={s.kpiLabel}>{c.label}</Text>
                {c.delta != null && (
                  <View style={s.deltaRow}>
                    <Ionicons name={c.delta >= 0 ? "arrow-up" : "arrow-down"} size={10} color={c.delta >= 0 ? Colors.green : Colors.red} />
                    <Text style={[s.deltaText, { color: c.delta >= 0 ? Colors.green : Colors.red }]}>{Math.abs(c.delta)}%</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Top Counties */}
          {counties.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Top Counties</Text>
              <View style={s.table}>
                <View style={[s.tableHeader, s.tableRow]}>
                  <Text style={[s.tableHeaderText, { flex: 2 }]}>County</Text>
                  <Text style={[s.tableHeaderText, { flex: 1, textAlign: "center" }]}>Bonds</Text>
                  <Text style={[s.tableHeaderText, { flex: 1.5, textAlign: "right" }]}>Revenue</Text>
                </View>
                {counties.slice(0, 8).map((c: any, i: number) => (
                  <View key={c.id ?? i} style={[s.tableRow, i < counties.length - 1 && s.rowBorder]}>
                    <View style={{ flex: 2, flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={s.rankBadge}>
                        <Text style={s.rankText}>{i + 1}</Text>
                      </View>
                      <Text style={s.tableCell} numberOfLines={1}>{c.name ?? c.county ?? "Unknown"}</Text>
                    </View>
                    <Text style={[s.tableCell, { flex: 1, textAlign: "center" }]}>{c.bond_count ?? c.bonds ?? "—"}</Text>
                    <Text style={[s.tableCellGreen, { flex: 1.5, textAlign: "right" }]}>{fmtMoney(c.revenue ?? c.total_revenue)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Top Agents */}
          {agents.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Top Agents</Text>
              <View style={s.table}>
                <View style={[s.tableHeader, s.tableRow]}>
                  <Text style={[s.tableHeaderText, { flex: 2 }]}>Agent</Text>
                  <Text style={[s.tableHeaderText, { flex: 1, textAlign: "center" }]}>Bonds</Text>
                  <Text style={[s.tableHeaderText, { flex: 1.5, textAlign: "right" }]}>Commission</Text>
                </View>
                {agents.slice(0, 8).map((a: any, i: number) => (
                  <View key={a.id ?? i} style={[s.tableRow, i < agents.length - 1 && s.rowBorder]}>
                    <View style={{ flex: 2, flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={[s.agentAvatar, { backgroundColor: Colors.blue + "22" }]}>
                        <Text style={s.agentInitials}>
                          {(a.name ?? a.agent_name ?? "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={s.tableCell} numberOfLines={1}>{a.name ?? a.agent_name ?? "Unknown"}</Text>
                    </View>
                    <Text style={[s.tableCell, { flex: 1, textAlign: "center" }]}>{a.bond_count ?? a.bonds ?? "—"}</Text>
                    <Text style={[s.tableCellGreen, { flex: 1.5, textAlign: "right" }]}>{fmtMoney(a.commission ?? a.total_commission)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Revenue Summary */}
          {(revenue.total_revenue || revenue.monthly_revenue) && (
            <>
              <Text style={s.sectionTitle}>Revenue Summary</Text>
              <View style={s.revenueCard}>
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
          )}
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
  exportBtn: { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  periodRow: { flexDirection: "row", marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 3, gap: 2 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: Radius.sm - 2, alignItems: "center" },
  periodBtnActive: { backgroundColor: Colors.blue },
  periodText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  periodTextActive: { color: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: Spacing.xl },
  kpiCard: { width: "31%", backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  kpiTop: { marginBottom: Spacing.sm },
  kpiIcon: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
  kpiValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold, marginBottom: 2 },
  kpiLabel: { fontSize: 9, color: Colors.mutedDim },
  deltaRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  deltaText: { fontSize: 10 },
  sectionTitle: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold, marginBottom: Spacing.md, marginTop: Spacing.sm },
  table: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: "hidden", marginBottom: Spacing.xl },
  tableHeader: { backgroundColor: Colors.bgPanel },
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.lg, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.borderFaint },
  tableHeaderText: { fontSize: 10, color: Colors.mutedDim, fontFamily: Font.bold, textTransform: "uppercase", letterSpacing: 0.5 },
  tableCell: { fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.medium },
  tableCellGreen: { fontSize: FontSize.sm, color: Colors.green, fontFamily: Font.bold },
  rankBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.blue + "22", alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 10, color: Colors.blueBright, fontFamily: Font.bold },
  agentAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  agentInitials: { fontSize: 10, color: Colors.blueBright, fontFamily: Font.bold },
  revenueCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: "hidden", marginBottom: Spacing.xl },
  revenueRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: Spacing.lg },
  revenueLabel: { fontSize: FontSize.sm, color: Colors.muted },
  revenueValue: { fontSize: FontSize.md, fontFamily: Font.bold },
})
