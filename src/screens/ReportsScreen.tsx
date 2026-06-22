import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Colors, FontSize, Radius, Spacing } from "../constants/theme"

const KPI = [
  { label: "Bookings", value: "342", delta: "↑ 12%", color: Colors.red, icon: "alert-circle-outline" as const },
  { label: "Prospects", value: "89", delta: "↑ 6%", color: Colors.gold, icon: "person-outline" as const },
  { label: "Apps Sent", value: "54", delta: "↑ 18%", color: Colors.blueBright, icon: "send-outline" as const },
  { label: "Apps Rec'd", value: "41", delta: "76%", color: Colors.blue, icon: "document-text-outline" as const },
  { label: "Bonds Posted", value: "36", delta: "↑ 9%", color: Colors.green, icon: "shield-outline" as const },
  { label: "Conversion", value: "40.4%", delta: "↑ 2.1%", color: Colors.green, icon: "trending-up-outline" as const },
  { label: "Collected", value: "$94.2k", delta: "↑ 8.4%", color: Colors.green, icon: "cash-outline" as const },
  { label: "Outstanding", value: "$12.4k", delta: "13.1%", color: Colors.gold, icon: "card-outline" as const },
]

const COUNTIES = [
  { name: "Dallas County", bookings: 98, clients: 24, revenue: "$28,400" },
  { name: "Harris County", bookings: 76, clients: 19, revenue: "$22,100" },
  { name: "Tarrant County", bookings: 54, clients: 14, revenue: "$16,800" },
  { name: "Travis County", bookings: 41, clients: 10, revenue: "$12,300" },
  { name: "Bexar County", bookings: 38, clients: 9, revenue: "$11,200" },
]

const AGENTS = [
  { name: "John Smith", bonds: 18, revenue: "$42,000", avg: "$2,333", conv: "44%" },
  { name: "Maria Garcia", bonds: 12, revenue: "$31,200", avg: "$2,600", conv: "39%" },
  { name: "David Lee", bonds: 6, revenue: "$20,800", avg: "$3,467", conv: "33%" },
]

const DATE_RANGES = ["Today", "Week", "Month", "Quarter", "YTD"]

export function ReportsScreen() {
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>Reports</Text>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.actionBtn}>
            <Ionicons name="download-outline" size={18} color={Colors.blueBright} />
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn}>
            <Ionicons name="refresh-outline" size={18} color={Colors.muted} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Date Range */}
        <View style={s.dateRow}>
          {DATE_RANGES.map((d, i) => (
            <TouchableOpacity key={d} style={[s.dateChip, i === 2 && s.dateChipActive]}>
              <Text style={[s.dateText, i === 2 && s.dateTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPI Grid */}
        <View style={s.kpiGrid}>
          {KPI.map((k) => (
            <View key={k.label} style={s.kpiCard}>
              <View style={[s.kpiIcon, { backgroundColor: k.color + "18" }]}>
                <Ionicons name={k.icon} size={16} color={k.color} />
              </View>
              <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={s.kpiLabel}>{k.label}</Text>
              <Text style={[s.kpiDelta, { color: k.color }]}>{k.delta}</Text>
            </View>
          ))}
        </View>

        {/* Lead Funnel */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Lead Funnel</Text>
          <View style={s.card}>
            {[
              { label: "New Bookings", value: 342, pct: 100 },
              { label: "Prospects", value: 89, pct: 26 },
              { label: "Apps Sent", value: 54, pct: 16 },
              { label: "Apps Received", value: 41, pct: 12 },
              { label: "Bond Posted", value: 36, pct: 11 },
            ].map((f) => (
              <View key={f.label} style={s.funnelRow}>
                <Text style={s.funnelLabel}>{f.label}</Text>
                <View style={s.funnelBar}>
                  <View style={[s.funnelFill, { width: `${f.pct}%` as any }]} />
                </View>
                <Text style={s.funnelValue}>{f.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Counties */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Top Counties</Text>
          <View style={s.card}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHead, { flex: 2 }]}>County</Text>
              <Text style={s.tableHead}>Bookings</Text>
              <Text style={s.tableHead}>Clients</Text>
              <Text style={s.tableHead}>Revenue</Text>
            </View>
            {COUNTIES.map((c, i) => (
              <View key={c.name} style={[s.tableRow, i < COUNTIES.length - 1 && s.rowBorder]}>
                <Text style={[s.tableCell, { flex: 2, color: Colors.text }]}>{c.name}</Text>
                <Text style={s.tableCell}>{c.bookings}</Text>
                <Text style={s.tableCell}>{c.clients}</Text>
                <Text style={[s.tableCell, { color: Colors.green }]}>{c.revenue}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Agents */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Agent Performance</Text>
          <View style={s.card}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHead, { flex: 2 }]}>Agent</Text>
              <Text style={s.tableHead}>Bonds</Text>
              <Text style={s.tableHead}>Revenue</Text>
              <Text style={s.tableHead}>Conv.</Text>
            </View>
            {AGENTS.map((a, i) => (
              <View key={a.name} style={[s.tableRow, i < AGENTS.length - 1 && s.rowBorder]}>
                <View style={[{ flex: 2, flexDirection: "row", alignItems: "center", gap: 8 }]}>
                  <View style={s.agentAvatar}>
                    <Text style={s.agentAvatarText}>{a.name[0]}</Text>
                  </View>
                  <Text style={[s.tableCell, { color: Colors.text }]}>{a.name}</Text>
                </View>
                <Text style={s.tableCell}>{a.bonds}</Text>
                <Text style={[s.tableCell, { color: Colors.green }]}>{a.revenue}</Text>
                <Text style={[s.tableCell, { color: Colors.blueBright }]}>{a.conv}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  title: { fontSize: FontSize.xl, color: Colors.text, fontWeight: "800" },
  headerActions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)", alignItems: "center", justifyContent: "center" },
  dateRow: { flexDirection: "row", paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg, gap: 8 },
  dateChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.sm, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)" },
  dateChipActive: { backgroundColor: Colors.blue + "22", borderColor: Colors.blue + "66" },
  dateText: { fontSize: FontSize.xs, color: Colors.mutedDim, fontWeight: "600" },
  dateTextActive: { color: Colors.blueBright },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  kpiCard: { width: "22%", flexGrow: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.md, alignItems: "center" },
  kpiIcon: { width: 28, height: 28, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  kpiValue: { fontSize: FontSize.lg, fontWeight: "800" },
  kpiLabel: { fontSize: 9, color: Colors.mutedDim, marginTop: 2, textAlign: "center" },
  kpiDelta: { fontSize: 9, fontWeight: "600", marginTop: 1 },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700", marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", overflow: "hidden" },
  funnelRow: { flexDirection: "row", alignItems: "center", padding: Spacing.md, gap: Spacing.md },
  funnelLabel: { fontSize: FontSize.xs, color: Colors.muted, width: 110 },
  funnelBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(70,120,190,0.15)", overflow: "hidden" },
  funnelFill: { height: "100%", borderRadius: 3, backgroundColor: Colors.blue },
  funnelValue: { fontSize: FontSize.xs, color: Colors.text, fontWeight: "600", width: 30, textAlign: "right" },
  tableHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: "rgba(70,120,190,0.15)" },
  tableHead: { flex: 1, fontSize: 10, color: Colors.mutedDim, fontWeight: "700", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(70,120,190,0.08)" },
  tableCell: { flex: 1, fontSize: FontSize.xs, color: Colors.muted, fontWeight: "500" },
  agentAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(47,147,255,0.15)", alignItems: "center", justifyContent: "center" },
  agentAvatarText: { fontSize: 10, color: Colors.blueBright, fontWeight: "700" },
})
