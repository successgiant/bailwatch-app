import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Colors, FontSize, Radius, Spacing } from "../constants/theme"

const KPI = [
  { label: "Today", value: "2", color: Colors.gold },
  { label: "Upcoming", value: "15", color: Colors.blueBright },
  { label: "Missed", value: "1", color: Colors.red },
  { label: "Completed", value: "43", color: Colors.green },
]

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const DATES = Array.from({ length: 30 }, (_, i) => i + 1)

const EVENTS: Record<number, { type: string; color: string }[]> = {
  24: [{ type: "court", color: Colors.gold }],
  27: [{ type: "court", color: Colors.red }],
  3: [{ type: "court", color: Colors.blueBright }],
  12: [{ type: "court", color: Colors.green }],
  18: [{ type: "court", color: Colors.gold }],
}

const UPCOMING = [
  { name: "Marcus Thompson", court: "Dallas County District Court", time: "9:00 AM", date: "Jun 24", days: "Tomorrow", color: Colors.gold },
  { name: "James Rivera", court: "Tarrant County Court", time: "10:30 AM", date: "Jun 27", days: "4 days", color: Colors.red },
  { name: "Sara Mitchell", court: "Travis County Court", time: "2:00 PM", date: "Jul 3", days: "10 days", color: Colors.blueBright },
  { name: "David Kim", court: "Harris County Court", time: "9:00 AM", date: "Jul 8", days: "15 days", color: Colors.blue },
]

const MISSED = [
  { name: "Angela Foster", court: "Bexar County Court", date: "Jun 18", days: 4 },
]

export function CalendarScreen() {
  const today = 23

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Calendar</Text>
          <Text style={s.subtitle}>Court Dates & Schedule</Text>
        </View>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* KPI */}
        <View style={s.kpiRow}>
          {KPI.map((k) => (
            <View key={k.label} style={s.kpiCard}>
              <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={s.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* Month + Nav */}
        <View style={s.monthNav}>
          <TouchableOpacity style={s.navBtn}><Ionicons name="chevron-back" size={18} color={Colors.muted} /></TouchableOpacity>
          <Text style={s.monthLabel}>June 2026</Text>
          <TouchableOpacity style={s.navBtn}><Ionicons name="chevron-forward" size={18} color={Colors.muted} /></TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={s.dayHeader}>
          {DAYS.map((d) => (
            <View key={d} style={s.dayCell}>
              <Text style={s.dayName}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={s.calGrid}>
          {/* Offset (Jun 1 = Mon = index 1) */}
          <View style={s.dateCell} />
          {DATES.map((d) => {
            const isToday = d === today
            const hasEvent = EVENTS[d]
            return (
              <TouchableOpacity key={d} style={[s.dateCell, isToday && s.dateCellToday]}>
                <Text style={[s.dateNum, isToday && s.dateNumToday]}>{d}</Text>
                {hasEvent && (
                  <View style={s.eventDots}>
                    {hasEvent.map((e, i) => (
                      <View key={i} style={[s.eventDot, { backgroundColor: e.color }]} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Missed Court */}
        {MISSED.length > 0 && (
          <>
            <View style={[s.sectionRow, { paddingHorizontal: Spacing.xl }]}>
              <View style={s.missedLabel}>
                <Ionicons name="warning" size={14} color={Colors.red} />
                <Text style={s.missedTitle}>Missed Court</Text>
              </View>
            </View>
            <View style={[s.card, { marginHorizontal: Spacing.xl }]}>
              {MISSED.map((m) => (
                <View key={m.name} style={s.row}>
                  <View style={[s.courtDate, { borderColor: Colors.red + "66" }]}>
                    <Text style={[s.courtDateText, { color: Colors.red }]}>{m.date}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cname}>{m.name}</Text>
                    <Text style={s.sub}>{m.court} · {m.days} days missed</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.mutedDim} />
                </View>
              ))}
            </View>
          </>
        )}

        {/* Upcoming */}
        <View style={[s.sectionRow, { paddingHorizontal: Spacing.xl, marginTop: Spacing.lg }]}>
          <Text style={s.sectionTitle}>Upcoming Court Dates</Text>
          <TouchableOpacity><Text style={s.link}>See All</Text></TouchableOpacity>
        </View>
        <View style={[s.card, { marginHorizontal: Spacing.xl }]}>
          {UPCOMING.map((u, i) => (
            <View key={u.name} style={[s.row, i < UPCOMING.length - 1 && s.rowBorder]}>
              <View style={[s.courtDate, { borderColor: u.color + "66" }]}>
                <Text style={[s.courtDateText, { color: u.color }]}>{u.date}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cname}>{u.name}</Text>
                <Text style={s.sub}>{u.time} · {u.court}</Text>
              </View>
              <View style={[s.daysBadge, { backgroundColor: u.color + "18" }]}>
                <Text style={[s.daysText, { color: u.color }]}>{u.days}</Text>
              </View>
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
  title: { fontSize: FontSize.xl, color: Colors.text, fontWeight: "800" },
  subtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  addBtn: { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Colors.blue, alignItems: "center", justifyContent: "center" },
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.xl, fontWeight: "800" },
  kpiLabel: { fontSize: 9, color: Colors.mutedDim, marginTop: 1 },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  navBtn: { padding: 6 },
  monthLabel: { fontSize: FontSize.lg, color: Colors.text, fontWeight: "700" },
  dayHeader: { flexDirection: "row", paddingHorizontal: Spacing.xl, marginBottom: 4 },
  dayCell: { flex: 1, alignItems: "center", paddingVertical: 4 },
  dayName: { fontSize: 10, color: Colors.mutedDim, fontWeight: "600" },
  calGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  dateCell: { width: "14.28%", alignItems: "center", paddingVertical: 6, borderRadius: Radius.sm },
  dateCellToday: { backgroundColor: Colors.blue + "22" },
  dateNum: { fontSize: FontSize.sm, color: Colors.muted, fontWeight: "500" },
  dateNumToday: { color: Colors.blueBright, fontWeight: "800" },
  eventDots: { flexDirection: "row", gap: 2, marginTop: 2 },
  eventDot: { width: 5, height: 5, borderRadius: 3 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700" },
  link: { fontSize: FontSize.xs, color: Colors.blueBright, fontWeight: "600" },
  missedLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  missedTitle: { fontSize: FontSize.md, color: Colors.red, fontWeight: "700" },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", overflow: "hidden", marginBottom: Spacing.md },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(70,120,190,0.1)" },
  courtDate: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: Radius.sm, borderWidth: 1, minWidth: 56, alignItems: "center" },
  courtDateText: { fontSize: FontSize.xs, fontWeight: "700" },
  cname: { fontSize: FontSize.md, color: Colors.text, fontWeight: "600" },
  sub: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  daysBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  daysText: { fontSize: 10, fontWeight: "700" },
})
