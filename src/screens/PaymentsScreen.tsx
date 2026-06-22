import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Colors, FontSize, Radius, Spacing } from "../constants/theme"

const METRICS = [
  { label: "Total Revenue", value: "$94,200", delta: "↑ 8.4%", color: Colors.green },
  { label: "Collected", value: "$81,800", delta: "87%", color: Colors.blueBright },
  { label: "Balance Due", value: "$12,400", delta: "13%", color: Colors.gold },
  { label: "Overdue", value: "$3,200", delta: "3 clients", color: Colors.red },
]

const TABS = ["All", "Plans", "Today", "Overdue", "Paid"]

const PAYMENTS = [
  { id: "1", name: "Marcus Thompson", case: "BWP-001", bond: "$15,000", paid: 10000, remaining: 5000, nextDue: "Jun 24", status: "On Track", daysOverdue: null },
  { id: "2", name: "James Rivera", case: "BWP-002", bond: "$25,000", paid: 10000, remaining: 15000, nextDue: "Jun 20", status: "Overdue", daysOverdue: 2 },
  { id: "3", name: "Sara Mitchell", case: "BWP-003", bond: "$10,000", paid: 10000, remaining: 0, nextDue: null, status: "Paid in Full", daysOverdue: null },
  { id: "4", name: "David Kim", case: "BWP-004", bond: "$8,500", paid: 4250, remaining: 4250, nextDue: "Jul 1", status: "On Track", daysOverdue: null },
  { id: "5", name: "Angela Foster", case: "BWP-005", bond: "$12,000", paid: 6000, remaining: 6000, nextDue: "Jun 18", status: "Overdue", daysOverdue: 4 },
]

const STATUS_COLORS: Record<string, string> = {
  "On Track": Colors.green,
  "Overdue": Colors.red,
  "Paid in Full": Colors.blueBright,
}

export function PaymentsScreen() {
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>Payments</Text>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Metrics */}
      <View style={s.metricsRow}>
        {METRICS.map((m) => (
          <View key={m.label} style={s.metricCard}>
            <Text style={[s.metricValue, { color: m.color }]}>{m.value}</Text>
            <Text style={s.metricLabel}>{m.label}</Text>
            <Text style={[s.metricDelta, { color: m.color }]}>{m.delta}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} style={[s.tab, i === 0 && s.tabActive]}>
            <Text style={[s.tabText, i === 0 && s.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
        <TextInput style={s.searchInput} placeholder="Search payments..." placeholderTextColor={Colors.mutedDim} />
      </View>

      <FlatList
        data={PAYMENTS}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const pct = Math.round((item.paid / (item.paid + item.remaining)) * 100)
          const sc = STATUS_COLORS[item.status] ?? Colors.muted
          return (
            <View style={[s.card, item.status === "Overdue" && s.cardOverdue]}>
              <View style={s.cardTop}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{item.name[0]}</Text>
                </View>
                <View style={s.info}>
                  <Text style={s.cname}>{item.name}</Text>
                  <Text style={s.sub}>{item.case} · Bond: {item.bond}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: sc + "22" }]}>
                  <Text style={[s.badgeText, { color: sc }]}>{item.status}</Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={s.progressWrap}>
                <View style={s.progressBar}>
                  <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: sc }]} />
                </View>
                <Text style={s.progressPct}>{pct}% paid</Text>
              </View>

              <View style={s.amountRow}>
                <View style={s.amountBlock}>
                  <Text style={s.amountLabel}>Paid</Text>
                  <Text style={[s.amountValue, { color: Colors.green }]}>${item.paid.toLocaleString()}</Text>
                </View>
                <View style={s.amountBlock}>
                  <Text style={s.amountLabel}>Remaining</Text>
                  <Text style={[s.amountValue, { color: item.remaining > 0 ? Colors.gold : Colors.mutedDim }]}>${item.remaining.toLocaleString()}</Text>
                </View>
                <View style={s.amountBlock}>
                  <Text style={s.amountLabel}>{item.daysOverdue ? "Overdue" : "Next Due"}</Text>
                  <Text style={[s.amountValue, { color: item.daysOverdue ? Colors.red : Colors.text }]}>
                    {item.daysOverdue ? `${item.daysOverdue}d overdue` : item.nextDue ?? "—"}
                  </Text>
                </View>
              </View>

              <View style={s.actionRow}>
                <TouchableOpacity style={s.actionBtn}>
                  <Ionicons name="card-outline" size={14} color={Colors.green} />
                  <Text style={[s.actionText, { color: Colors.green }]}>Receive Payment</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtnGhost}>
                  <Text style={s.actionTextGhost}>Send Reminder</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        }}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  title: { fontSize: FontSize.xl, color: Colors.text, fontWeight: "800" },
  addBtn: { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Colors.blue, alignItems: "center", justifyContent: "center" },
  metricsRow: { flexDirection: "row", gap: 8, paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  metricCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: 10, alignItems: "center" },
  metricValue: { fontSize: FontSize.sm, fontWeight: "800" },
  metricLabel: { fontSize: 9, color: Colors.mutedDim, marginTop: 1, textAlign: "center" },
  metricDelta: { fontSize: 9, fontWeight: "600", marginTop: 1 },
  tabRow: { flexDirection: "row", paddingHorizontal: Spacing.xl, marginBottom: Spacing.md, gap: 6 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)" },
  tabActive: { backgroundColor: Colors.blue + "22", borderColor: Colors.blue + "66" },
  tabText: { fontSize: FontSize.xs, color: Colors.mutedDim, fontWeight: "600" },
  tabTextActive: { color: Colors.blueBright },
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)", paddingHorizontal: Spacing.md, height: 42, gap: Spacing.sm },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.lg },
  cardOverdue: { borderColor: Colors.red + "44", borderLeftWidth: 3, borderLeftColor: Colors.red },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(47,147,255,0.15)", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: FontSize.md, color: Colors.blueBright, fontWeight: "700" },
  info: { flex: 1 },
  cname: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700" },
  sub: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  badgeText: { fontSize: 10, fontWeight: "700" },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  progressBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: "rgba(70,120,190,0.15)", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressPct: { fontSize: FontSize.xs, color: Colors.muted, width: 56 },
  amountRow: { flexDirection: "row", marginBottom: Spacing.md },
  amountBlock: { flex: 1 },
  amountLabel: { fontSize: 10, color: Colors.mutedDim, marginBottom: 2 },
  amountValue: { fontSize: FontSize.sm, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: "rgba(70,120,190,0.1)", paddingTop: Spacing.md },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: Colors.green + "18", borderRadius: Radius.sm, paddingVertical: 8, borderWidth: 1, borderColor: Colors.green + "33" },
  actionText: { fontSize: FontSize.xs, fontWeight: "700" },
  actionBtnGhost: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(70,120,190,0.1)", borderRadius: Radius.sm, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)" },
  actionTextGhost: { fontSize: FontSize.xs, color: Colors.muted, fontWeight: "600" },
})
