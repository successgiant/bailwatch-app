import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Colors, FontSize, Radius, Spacing } from "../constants/theme"

const STATS = [
  { label: "Active Bonds", value: "128", delta: "+12", color: Colors.blueBright, icon: "shield-outline" as const },
  { label: "Alerts", value: "3", delta: "+1", color: Colors.red, icon: "warning-outline" as const },
  { label: "Clients", value: "214", delta: "+5", color: Colors.text, icon: "people-outline" as const },
  { label: "Court Dates", value: "17", delta: "Next: Jun 24", color: Colors.gold, icon: "calendar-outline" as const },
  { label: "Collected", value: "$94k", delta: "↑ 8.4%", color: Colors.green, icon: "cash-outline" as const },
  { label: "Balance Due", value: "$12.4k", delta: "3 overdue", color: Colors.gold, icon: "alert-circle-outline" as const },
]

const LIVE_ALERTS = [
  { name: "Marcus Thompson", county: "Dallas County", charge: "Assault", time: "2h ago", type: "RE-ARREST" },
  { name: "James Rivera", county: "Tarrant County", charge: "DWI", time: "4h ago", type: "NEW BOOKING" },
  { name: "Angela Foster", county: "Harris County", charge: "Theft", time: "6h ago", type: "RE-ARREST" },
]

const ACTIVITY = [
  { icon: "person-add-outline" as const, title: "New client added", sub: "Marcus Thompson – Dallas County", time: "10m ago", color: Colors.blue },
  { icon: "card-outline" as const, title: "Payment received", sub: "$1,500 – Sara Mitchell", time: "1h ago", color: Colors.green },
  { icon: "document-text-outline" as const, title: "BondApp sent", sub: "David Kim – bond application", time: "2h ago", color: Colors.blueBright },
  { icon: "calendar-outline" as const, title: "Court date added", sub: "James Rivera – Jun 27", time: "3h ago", color: Colors.gold },
]

const COURT_DATES = [
  { name: "Marcus T.", court: "Dallas County", date: "Jun 24", color: Colors.gold },
  { name: "James R.", court: "Tarrant County", date: "Jun 27", color: Colors.red },
  { name: "Sara M.", court: "Travis County", date: "Jul 3", color: Colors.blueBright },
]

const TASKS = [
  { label: "Follow up with James Rivera on payment plan", due: "Today", urgency: "critical" },
  { label: "Send BondApp to new lead: Robert Hayes", due: "Tomorrow", urgency: "warning" },
  { label: "Update bond for Angela Foster – new charges", due: "Jun 25", urgency: "normal" },
]

const QUICK_ACTIONS = [
  { icon: "person-add-outline" as const, label: "Add Client", color: Colors.blue },
  { icon: "send-outline" as const, label: "Send BondApp", color: Colors.blueBright },
  { icon: "card-outline" as const, label: "Record Payment", color: Colors.green },
  { icon: "calendar-outline" as const, label: "Court Date", color: Colors.gold },
  { icon: "search-outline" as const, label: "Search Client", color: Colors.muted },
  { icon: "add-circle-outline" as const, label: "New Bond", color: Colors.blue },
]

const TASK_COLORS: Record<string, string> = { critical: Colors.red, warning: Colors.gold, normal: Colors.green }

export function DashboardScreen() {
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Good morning,</Text>
          <Text style={s.name}>BailWatch Pro</Text>
        </View>
        <TouchableOpacity style={s.notifBtn}>
          <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          <View style={s.notifDot} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* KPI Grid */}
        <View style={s.kpiGrid}>
          {STATS.map((k) => (
            <View key={k.label} style={s.kpiCard}>
              <View style={s.kpiTop}>
                <View style={[s.kpiIcon, { backgroundColor: k.color + "18" }]}>
                  <Ionicons name={k.icon} size={16} color={k.color} />
                </View>
                <Text style={[s.kpiDelta, { color: k.color }]}>{k.delta}</Text>
              </View>
              <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={s.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.quickGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity key={a.label} style={s.quickBtn}>
              <View style={[s.quickIcon, { backgroundColor: a.color + "18" }]}>
                <Ionicons name={a.icon} size={20} color={a.color} />
              </View>
              <Text style={s.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Live Alerts */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Live Alerts</Text>
          <View style={s.liveDot}><View style={s.livePulse} /><Text style={s.liveText}>LIVE</Text></View>
        </View>
        <View style={s.card}>
          {LIVE_ALERTS.map((a, i) => (
            <View key={a.name} style={[s.alertRow, i < LIVE_ALERTS.length - 1 && s.rowBorder]}>
              <View style={[s.alertBadge, { backgroundColor: a.type === "RE-ARREST" ? Colors.red + "22" : Colors.gold + "22" }]}>
                <Text style={[s.alertBadgeText, { color: a.type === "RE-ARREST" ? Colors.red : Colors.gold }]}>{a.type}</Text>
              </View>
              <View style={s.alertInfo}>
                <Text style={s.alertName}>{a.name}</Text>
                <Text style={s.alertSub}>{a.charge} · {a.county}</Text>
              </View>
              <Text style={s.alertTime}>{a.time}</Text>
            </View>
          ))}
        </View>

        {/* Upcoming Court Dates */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Upcoming Court Dates</Text>
          <TouchableOpacity><Text style={s.link}>View All</Text></TouchableOpacity>
        </View>
        <View style={s.card}>
          {COURT_DATES.map((d, i) => (
            <View key={d.name} style={[s.courtRow, i < COURT_DATES.length - 1 && s.rowBorder]}>
              <View style={[s.courtDateBox, { borderColor: d.color + "66" }]}>
                <Ionicons name="calendar-outline" size={12} color={d.color} />
                <Text style={[s.courtDate, { color: d.color }]}>{d.date}</Text>
              </View>
              <View style={s.courtInfo}>
                <Text style={s.courtName}>{d.name}</Text>
                <Text style={s.courtSub}>{d.court}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.mutedDim} />
            </View>
          ))}
        </View>

        {/* Tasks */}
        <Text style={s.sectionTitle}>Tasks & Follow-Ups</Text>
        <View style={s.card}>
          {TASKS.map((t, i) => (
            <View key={t.label} style={[s.taskRow, i < TASKS.length - 1 && s.rowBorder]}>
              <View style={[s.taskDot, { backgroundColor: TASK_COLORS[t.urgency] }]} />
              <View style={s.taskInfo}>
                <Text style={s.taskLabel}>{t.label}</Text>
                <Text style={[s.taskDue, { color: TASK_COLORS[t.urgency] }]}>Due: {t.due}</Text>
              </View>
              <TouchableOpacity style={s.checkBtn}>
                <Ionicons name="checkmark-circle-outline" size={22} color={Colors.mutedDim} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity><Text style={s.link}>View All</Text></TouchableOpacity>
        </View>
        <View style={s.card}>
          {ACTIVITY.map((a, i) => (
            <View key={a.title + i} style={[s.actRow, i < ACTIVITY.length - 1 && s.rowBorder]}>
              <View style={[s.actIcon, { backgroundColor: a.color + "18" }]}>
                <Ionicons name={a.icon} size={16} color={a.color} />
              </View>
              <View style={s.actInfo}>
                <Text style={s.actTitle}>{a.title}</Text>
                <Text style={s.actSub}>{a.sub}</Text>
              </View>
              <Text style={s.actTime}>{a.time}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  greeting: { fontSize: FontSize.sm, color: Colors.mutedDim, fontWeight: "500" },
  name: { fontSize: FontSize.xl, color: Colors.text, fontWeight: "800", letterSpacing: 0.3 },
  notifBtn: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: "rgba(70,120,190,0.1)", borderWidth: 1, borderColor: "rgba(70,120,190,0.2)", alignItems: "center", justifyContent: "center" },
  notifDot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.red, borderWidth: 1.5, borderColor: Colors.bg },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 32 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: Spacing.xl },
  kpiCard: { width: "31%", flexGrow: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.md },
  kpiTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  kpiIcon: { width: 28, height: 28, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
  kpiDelta: { fontSize: 9, fontWeight: "600" },
  kpiValue: { fontSize: FontSize.xxl, fontWeight: "800", lineHeight: 28 },
  kpiLabel: { fontSize: 10, color: Colors.mutedDim, marginTop: 2 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700", marginBottom: Spacing.sm },
  link: { fontSize: FontSize.sm, color: Colors.blueBright, fontWeight: "600" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: Spacing.xl },
  quickBtn: { width: "30%", flexGrow: 1, alignItems: "center", gap: 8, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.15)", padding: Spacing.md },
  quickIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 10, color: Colors.muted, fontWeight: "600", textAlign: "center" },
  liveDot: { flexDirection: "row", alignItems: "center", gap: 5 },
  livePulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.red },
  liveText: { fontSize: 10, color: Colors.red, fontWeight: "700" },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", marginBottom: Spacing.xl, overflow: "hidden" },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(70,120,190,0.1)" },
  alertRow: { flexDirection: "row", alignItems: "center", padding: Spacing.md, gap: Spacing.sm },
  alertBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, minWidth: 90 },
  alertBadgeText: { fontSize: 9, fontWeight: "800", textAlign: "center" },
  alertInfo: { flex: 1 },
  alertName: { fontSize: FontSize.sm, color: Colors.text, fontWeight: "600" },
  alertSub: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  alertTime: { fontSize: 10, color: Colors.mutedDim },
  courtRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  courtDateBox: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1, minWidth: 72 },
  courtDate: { fontSize: FontSize.xs, fontWeight: "700" },
  courtInfo: { flex: 1 },
  courtName: { fontSize: FontSize.md, color: Colors.text, fontWeight: "600" },
  courtSub: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  taskRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  taskDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0, marginTop: 2 },
  taskInfo: { flex: 1 },
  taskLabel: { fontSize: FontSize.sm, color: Colors.text, fontWeight: "500", lineHeight: 18 },
  taskDue: { fontSize: FontSize.xs, fontWeight: "600", marginTop: 2 },
  checkBtn: { padding: 4 },
  actRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  actIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  actInfo: { flex: 1 },
  actTitle: { fontSize: FontSize.sm, color: Colors.text, fontWeight: "600" },
  actSub: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  actTime: { fontSize: 10, color: Colors.mutedDim },
})
