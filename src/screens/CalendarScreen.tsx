import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

function fmtDate(d: string): string {
  if (!d) return "—"
  try {
    const dt = new Date(d)
    return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
  } catch { return d }
}

function fmtTime(t: string): string {
  if (!t) return ""
  try {
    const [h, m] = t.split(":").map(Number)
    const ampm = h >= 12 ? "PM" : "AM"
    const hr = h % 12 || 12
    return `${hr}:${String(m).padStart(2, "0")} ${ampm}`
  } catch { return t }
}

function daysUntil(d: string): number {
  if (!d) return Infinity
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const target = new Date(d); target.setHours(0, 0, 0, 0)
    return Math.ceil((target.getTime() - today.getTime()) / 86400000)
  } catch { return Infinity }
}

const COURT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  hearing: { bg: Colors.blue + "18", text: Colors.blueBright },
  Hearing: { bg: Colors.blue + "18", text: Colors.blueBright },
  trial: { bg: Colors.purple + "18", text: Colors.purple },
  Trial: { bg: Colors.purple + "18", text: Colors.purple },
  arraignment: { bg: Colors.gold + "18", text: Colors.gold },
  Arraignment: { bg: Colors.gold + "18", text: Colors.gold },
  sentencing: { bg: Colors.orange + "18", text: Colors.orange },
  Sentencing: { bg: Colors.orange + "18", text: Colors.orange },
  bond_review: { bg: Colors.green + "18", text: Colors.green },
  "Bond Review": { bg: Colors.green + "18", text: Colors.green },
}

export function CalendarScreen() {
  const { identity } = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [activeFilter, setActiveFilter] = useState("upcoming")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!identity) return
    api.courtDates(identity, { page_size: "50" }).then((res: any) => {
      const raw = res?.data ?? res?.results ?? res
      const arr = Array.isArray(raw) ? raw : []
      const sorted = arr.sort((a: any, b: any) => {
        const da = new Date(a.court_date ?? a.date ?? "").getTime()
        const db = new Date(b.court_date ?? b.date ?? "").getTime()
        return da - db
      })
      setEvents(sorted)
      applyFilter("upcoming", sorted)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [identity])

  const applyFilter = (filter: string, source = events) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    let out = source
    if (filter === "upcoming") {
      out = source.filter((e) => new Date(e.court_date ?? e.date ?? "") >= today)
    } else if (filter === "today") {
      out = source.filter((e) => daysUntil(e.court_date ?? e.date ?? "") === 0)
    } else if (filter === "week") {
      out = source.filter((e) => { const d = daysUntil(e.court_date ?? e.date ?? ""); return d >= 0 && d <= 7 })
    } else if (filter === "past") {
      out = source.filter((e) => new Date(e.court_date ?? e.date ?? "") < today)
    }
    setFiltered(out)
    setActiveFilter(filter)
  }

  const thisWeek = events.filter((e) => { const d = daysUntil(e.court_date ?? e.date ?? ""); return d >= 0 && d <= 7 }).length
  const today = events.filter((e) => daysUntil(e.court_date ?? e.date ?? "") === 0).length
  const upcoming = events.filter((e) => daysUntil(e.court_date ?? e.date ?? "") > 0).length

  const kpis = [
    { label: "Today", value: String(today), color: Colors.red },
    { label: "This Week", value: String(thisWeek), color: Colors.gold },
    { label: "Upcoming", value: String(upcoming), color: Colors.blueBright },
    { label: "Total", value: String(events.length), color: Colors.text },
  ]

  const filterTabs = [
    { key: "upcoming", label: "Upcoming" },
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "past", label: "Past" },
    { key: "all", label: "All" },
  ]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.gold + "18", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="calendar-outline" size={17} color={Colors.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Court Calendar</Text>
          <Text style={s.subtitle}>Upcoming hearing dates</Text>
        </View>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="calendar-outline" size={16} color="#fff" />
          <Text style={s.addBtnText}>Add Date</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Row */}
      <View style={s.kpiRow}>
        {kpis.map((k) => (
          <View key={k.label} style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsRow}>
        {filterTabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, activeFilter === t.key && s.tabActive]}
            onPress={() => applyFilter(t.key)}
          >
            <Text style={[s.tabText, activeFilter === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id ?? Math.random())}
          contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32, gap: 10 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="calendar-outline" size={48} color={Colors.mutedDim} />
              <Text style={s.emptyTitle}>No court dates</Text>
              <Text style={s.emptyText}>No dates match the selected filter.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const name = item.client_name ?? item.defendant_name ?? item.full_name ?? "Unknown"
            const dateStr = item.court_date ?? item.date ?? ""
            const timeStr = item.court_time ?? item.time ?? ""
            const courtName = item.court_name ?? item.court ?? ""
            const county = item.county ?? item.location ?? ""
            const caseNum = item.case_number ?? item.booking_number ?? ""
            const courtType = item.hearing_type ?? item.court_type ?? "Hearing"
            const typeColor = COURT_TYPE_COLORS[courtType] ?? COURT_TYPE_COLORS.hearing
            const days = daysUntil(dateStr)
            const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"

            let urgencyColor = Colors.mutedDim
            let urgencyText = ""
            if (days === 0) { urgencyColor = Colors.red; urgencyText = "TODAY" }
            else if (days === 1) { urgencyColor = Colors.orange; urgencyText = "TOMORROW" }
            else if (days <= 7) { urgencyColor = Colors.gold; urgencyText = `${days}d` }
            else if (days > 0) { urgencyText = `${days}d` }

            return (
              <View style={[s.card, days === 0 && s.cardToday, days === 1 && s.cardTomorrow]}>
                <View style={s.cardTop}>
                  <View style={s.dateBox}>
                    {dateStr ? (
                      <>
                        <Text style={s.dateMonth}>{new Date(dateStr).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</Text>
                        <Text style={[s.dateDay, days <= 1 && { color: urgencyColor }]}>
                          {new Date(dateStr).getDate()}
                        </Text>
                      </>
                    ) : (
                      <Text style={s.dateTbd}>TBD</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.clientName}>{name}</Text>
                    {!!courtName && <Text style={s.courtName}>{courtName}</Text>}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 5 }}>
                    {!!urgencyText && (
                      <View style={[s.urgencyBadge, { backgroundColor: urgencyColor + "18", borderColor: urgencyColor + "40" }]}>
                        <Text style={[s.urgencyText, { color: urgencyColor }]}>{urgencyText}</Text>
                      </View>
                    )}
                    <View style={[s.typeBadge, { backgroundColor: typeColor.bg }]}>
                      <Text style={[s.typeText, { color: typeColor.text }]}>{courtType}</Text>
                    </View>
                  </View>
                </View>

                <View style={s.metaRow}>
                  {!!timeStr && (
                    <View style={s.metaItem}>
                      <Ionicons name="time-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>{fmtTime(timeStr)}</Text>
                    </View>
                  )}
                  {!!county && (
                    <View style={s.metaItem}>
                      <Ionicons name="location-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>{county}</Text>
                    </View>
                  )}
                  {!!caseNum && (
                    <View style={s.metaItem}>
                      <Ionicons name="document-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>#{caseNum}</Text>
                    </View>
                  )}
                </View>

                <View style={s.cardFooter}>
                  <TouchableOpacity style={s.footerAction}>
                    <Ionicons name="notifications-outline" size={14} color={Colors.blueBright} />
                    <Text style={s.footerActionText}>Remind</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.footerAction}>
                    <Ionicons name="create-outline" size={14} color={Colors.mutedDim} />
                    <Text style={[s.footerActionText, { color: Colors.mutedDim }]}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginHorizontal: Spacing.xl, marginVertical: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  subtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: Radius.sm, backgroundColor: Colors.blue },
  addBtnText: { fontSize: FontSize.xs, color: "#fff", fontFamily: Font.bold },
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold },
  kpiLabel: { fontSize: 9, color: Colors.mutedDim, marginTop: 2, textAlign: "center" },
  tabsScroll: { marginBottom: Spacing.md, height: 38 },
  tabsRow: { paddingHorizontal: Spacing.xl, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.xl, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  tabText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  tabTextActive: { color: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.bold },
  emptyText: { fontSize: FontSize.sm, color: Colors.mutedDim },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  cardToday: { borderColor: Colors.red + "50", borderLeftWidth: 3, borderLeftColor: Colors.red },
  cardTomorrow: { borderColor: Colors.orange + "40" },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md, marginBottom: Spacing.md },
  dateBox: { width: 48, alignItems: "center", backgroundColor: Colors.blue + "14", borderRadius: Radius.md, paddingVertical: 6, borderWidth: 1, borderColor: Colors.blue + "25" },
  dateMonth: { fontSize: 9, color: Colors.blueBright, fontFamily: Font.bold, letterSpacing: 0.5 },
  dateDay: { fontSize: FontSize.xxl, color: Colors.text, fontFamily: Font.extrabold, lineHeight: 28 },
  dateTbd: { fontSize: FontSize.xs, color: Colors.mutedDim, fontFamily: Font.semibold },
  clientName: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  courtName: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 3 },
  urgencyBadge: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 7, paddingVertical: 3 },
  urgencyText: { fontSize: 10, fontFamily: Font.bold, letterSpacing: 0.5 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  typeText: { fontSize: 10, fontFamily: Font.bold },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: Spacing.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.muted },
  cardFooter: { flexDirection: "row", alignItems: "center", paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderFaint, gap: 4 },
  footerAction: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8 },
  footerActionText: { fontSize: FontSize.xs, color: Colors.blueBright, fontFamily: Font.semibold },
})
