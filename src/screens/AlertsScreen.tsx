import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

function timeAgo(d: string): string {
  if (!d) return ""
  try {
    const diff = Date.now() - new Date(d).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return "just now"
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  } catch { return "" }
}

const ALERT_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  arrest: { icon: "warning-outline", color: Colors.red, label: "Arrest Alert" },
  re_arrest: { icon: "alert-circle-outline", color: Colors.red, label: "Re-Arrest" },
  new_booking: { icon: "person-outline", color: Colors.green, label: "New Booking" },
  court_date: { icon: "calendar-outline", color: Colors.blue, label: "Court Date" },
  payment: { icon: "card-outline", color: Colors.green, label: "Payment" },
  overdue: { icon: "time-outline", color: Colors.gold, label: "Overdue" },
  system: { icon: "information-circle-outline", color: Colors.mutedDim, label: "System" },
}

export function AlertsScreen() {
  const navigation = useNavigation<any>()
  const { identity } = useAuth()
  const [alerts, setAlerts] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [activeFilter, setActiveFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const res: any = await api.alerts(identity)
      const raw = res?.results ?? res?.data ?? res
      const list = Array.isArray(raw) ? raw : []
      setAlerts(list)
      applyFilter(activeFilter, list)
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const applyFilter = (filter: string, source = alerts) => {
    setActiveFilter(filter)
    if (filter === "all") { setFiltered(source); return }
    if (filter === "unread") { setFiltered(source.filter((a) => !a.is_read && a.read !== true)); return }
    setFiltered(source.filter((a) => (a.alert_type ?? a.type ?? "").toLowerCase().includes(filter)))
  }

  const handleMarkAllRead = async () => {
    if (!identity) return
    setMarkingAll(true)
    try {
      await api.markAllRead(identity)
      const updated = alerts.map((a) => ({ ...a, is_read: true }))
      setAlerts(updated)
      applyFilter(activeFilter, updated)
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not mark all read")
    } finally { setMarkingAll(false) }
  }

  const handleMarkRead = async (item: any) => {
    if (!identity || item.is_read) return
    try {
      await api.markRead(identity, item.id)
      const updated = alerts.map((a) => a.id === item.id ? { ...a, is_read: true } : a)
      setAlerts(updated)
      applyFilter(activeFilter, updated)
    } catch {}
  }

  const unreadCount = alerts.filter((a) => !a.is_read && a.read !== true).length

  const filterTabs = [
    { key: "all", label: `All (${alerts.length})` },
    { key: "unread", label: `Unread (${unreadCount})` },
    { key: "arrest", label: "Arrests" },
    { key: "court_date", label: "Court" },
    { key: "payment", label: "Payments" },
  ]

  const kpis = [
    { label: "Total", value: String(alerts.length), color: Colors.text },
    { label: "Unread", value: String(unreadCount), color: Colors.blue },
    { label: "Arrest", value: String(alerts.filter((a) => (a.alert_type ?? a.type ?? "").toLowerCase().includes("arrest")).length), color: Colors.red },
    { label: "Court", value: String(alerts.filter((a) => (a.alert_type ?? a.type ?? "").toLowerCase().includes("court")).length), color: Colors.gold },
  ]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.orange + "18", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="notifications-outline" size={17} color={Colors.orange} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Alerts</Text>
          {unreadCount > 0 && (
            <Text style={s.subtitle}>{unreadCount} unread notification{unreadCount > 1 ? "s" : ""}</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={s.clearBtn} onPress={handleMarkAllRead} disabled={markingAll}>
            {markingAll
              ? <ActivityIndicator size="small" color={Colors.muted} />
              : <Text style={s.clearBtnText}>Mark all read</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      {/* KPI Row */}
      <View style={s.kpiRow}>
        {kpis.map((k) => (
          <View key={k.label} style={s.kpiCard}>
            <Text style={s.kpiValue}>{k.value}</Text>
            <Text style={[s.kpiLabel, { color: k.color }]}>{k.label}</Text>
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
        <View style={s.center}><ActivityIndicator size="large" color={Colors.blue} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id ?? Math.random())}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={Colors.blue} />}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="checkmark-circle-outline" size={48} color={Colors.green} />
              <Text style={s.emptyTitle}>All caught up!</Text>
              <Text style={s.emptyText}>No alerts to show.</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={s.separator} />}
          renderItem={({ item }) => {
            const type = (item.alert_type ?? item.type ?? "system").toLowerCase()
            const config = Object.entries(ALERT_TYPE_CONFIG).find(([k]) => type.includes(k))?.[1] ?? ALERT_TYPE_CONFIG.system
            const isUnread = !item.is_read && item.read !== true
            const title = item.title ?? item.message ?? config.label
            const body = item.body ?? item.description ?? item.detail ?? ""
            const time = timeAgo(item.created_at ?? item.timestamp ?? "")

            return (
              <TouchableOpacity
                style={[s.alertRow, isUnread && s.alertRowUnread]}
                activeOpacity={0.7}
                onPress={() => {
                  handleMarkRead(item)
                  if (type.includes("arrest")) navigation.navigate("More" as any, { screen: "ArrestAlert" })
                  else if (type.includes("court")) navigation.navigate("More" as any, { screen: "Calendar" })
                  else if (type.includes("payment")) navigation.navigate("More" as any, { screen: "Payments" })
                }}
              >
                <View style={[s.alertIcon, { backgroundColor: config.color + "18" }]}>
                  <Ionicons name={config.icon as any} size={20} color={config.color} />
                  {isUnread && <View style={[s.unreadDot, { backgroundColor: config.color }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.alertTitle, isUnread && s.alertTitleUnread]}>{title}</Text>
                  {!!body && <Text style={s.alertBody} numberOfLines={2}>{body}</Text>}
                  <View style={s.alertMeta}>
                    <View style={[s.typeBadge, { backgroundColor: config.color + "14" }]}>
                      <Text style={[s.typeBadgeText, { color: config.color }]}>{config.label}</Text>
                    </View>
                    {!!time && <Text style={s.alertTime}>{time}</Text>}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.mutedDim} />
              </TouchableOpacity>
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
  subtitle: { fontSize: FontSize.xs, color: Colors.blue, marginTop: 2 },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  clearBtnText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold, color: Colors.text },
  kpiLabel: { fontSize: 9, fontFamily: Font.semibold, marginTop: 3, textAlign: "center" },
  tabsScroll: { marginBottom: Spacing.sm, height: 38 },
  tabsRow: { paddingHorizontal: Spacing.xl, gap: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.xl, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  tabText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  tabTextActive: { color: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.bold },
  emptyText: { fontSize: FontSize.sm, color: Colors.mutedDim },
  alertRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, gap: Spacing.md },
  alertRowUnread: { backgroundColor: Colors.blue + "06" },
  alertIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  unreadDot: { position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: Colors.bg },
  alertTitle: { fontSize: FontSize.sm, color: Colors.muted, fontFamily: Font.medium, marginBottom: 3 },
  alertTitleUnread: { color: Colors.text, fontFamily: Font.bold },
  alertBody: { fontSize: FontSize.xs, color: Colors.mutedDim, marginBottom: 6 },
  alertMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.sm },
  typeBadgeText: { fontSize: 9, fontFamily: Font.bold },
  alertTime: { fontSize: FontSize.xs, color: Colors.mutedDim },
  separator: { height: 1, backgroundColor: Colors.borderFaint, marginLeft: Spacing.xl + 44 + Spacing.md },
})
