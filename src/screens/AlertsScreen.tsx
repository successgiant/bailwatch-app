import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView, RefreshControl, Alert,
} from "react-native"
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

const ICON_MAP: Record<string, string> = {
  shield: "shield-outline",
  lock: "lock-closed-outline",
  link: "link-outline",
  calendar: "calendar-outline",
  dollar: "cash-outline",
  info: "information-circle-outline",
  "shield-alert": "warning-outline",
  gear: "settings-outline",
}

const BADGE_COLOR_MAP: Record<string, string> = {
  red: Colors.red,
  amber: Colors.gold,
  blue: Colors.blueBright,
  purple: Colors.purple,
  green: Colors.green,
  gray: Colors.mutedDim,
}

const ICON_CATEGORY_MAP: Record<string, string> = {
  shield: "arrests",
  "shield-alert": "arrests",
  dollar: "payments",
  calendar: "court",
  info: "system",
  gear: "system",
}

function resolveCategory(item: any): string {
  if (item.icon && ICON_CATEGORY_MAP[item.icon]) return ICON_CATEGORY_MAP[item.icon]
  const type = (item.alert_type ?? item.type ?? "").toLowerCase()
  if (type.includes("arrest") || type.includes("booking") || type.includes("re_arrest")) return "arrests"
  if (type.includes("court")) return "court"
  if (type.includes("payment") || type.includes("overdue")) return "payments"
  return "system"
}

function resolveIconName(item: any): string {
  if (item.icon && ICON_MAP[item.icon]) return ICON_MAP[item.icon]
  const type = (item.alert_type ?? item.type ?? "").toLowerCase()
  if (type.includes("arrest") || type.includes("booking")) return "warning-outline"
  if (type.includes("court")) return "calendar-outline"
  if (type.includes("payment") || type.includes("overdue")) return "cash-outline"
  return "information-circle-outline"
}

function resolveIconColor(item: any): string {
  if (item.badgeStyle && BADGE_COLOR_MAP[item.badgeStyle]) return BADGE_COLOR_MAP[item.badgeStyle]
  if (item.iconBg) return item.iconBg
  const type = (item.alert_type ?? item.type ?? "").toLowerCase()
  if (type.includes("arrest") || type.includes("booking")) return Colors.red
  if (type.includes("court")) return Colors.blue
  if (type.includes("payment")) return Colors.green
  if (type.includes("overdue")) return Colors.gold
  return Colors.mutedDim
}

function isUnread(item: any): boolean {
  return !item.is_read && item.read !== true
}

const TABS = [
  { key: "all", label: "All" },
  { key: "arrests", label: "Arrests" },
  { key: "payments", label: "Payments" },
  { key: "court", label: "Court" },
  { key: "system", label: "System" },
]

export function AlertsScreen() {
  const navigation = useNavigation<any>()
  const { identity } = useAuth()
  const [alerts, setAlerts] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const res: any = await api.alerts(identity)
      const raw = res?.data?.results ?? res?.results ?? res?.data ?? res
      const list = Array.isArray(raw) ? raw : []
      setAlerts(list)
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const filtered = activeTab === "all"
    ? alerts
    : alerts.filter((a) => resolveCategory(a) === activeTab)

  const countForTab = (key: string) =>
    key === "all" ? alerts.length : alerts.filter((a) => resolveCategory(a) === key).length

  const unreadCount = alerts.filter(isUnread).length

  const handleMarkAllRead = async () => {
    if (!identity) return
    setMarkingAll(true)
    try {
      await api.markAllRead(identity)
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true, read: true })))
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not mark all read")
    } finally { setMarkingAll(false) }
  }

  const handleMarkRead = async (item: any) => {
    if (!identity || !isUnread(item)) return
    try {
      await api.markRead(identity, item.id)
      setAlerts((prev) => prev.map((a) => a.id === item.id ? { ...a, is_read: true, read: true } : a))
    } catch {}
  }

  const handleTap = (item: any) => {
    handleMarkRead(item)
    const cat = resolveCategory(item)
    if (cat === "arrests") navigation.navigate("More", { screen: "ArrestAlert" })
    else if (cat === "court") navigation.navigate("More", { screen: "Calendar" })
    else if (cat === "payments") navigation.navigate("More", { screen: "Payments" })
  }

  const kpis = [
    { label: "Total", value: String(alerts.length), color: Colors.text },
    { label: "Unread", value: String(unreadCount), color: Colors.blue },
    { label: "Arrests", value: String(alerts.filter((a) => resolveCategory(a) === "arrests").length), color: Colors.red },
    { label: "Payments", value: String(alerts.filter((a) => resolveCategory(a) === "payments").length), color: Colors.green },
  ]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View style={s.headerIcon}>
          <Ionicons name="notifications-outline" size={17} color={Colors.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Alerts</Text>
          {unreadCount > 0 && (
            <Text style={s.subtitle}>{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={s.markAllBtn} onPress={handleMarkAllRead} disabled={markingAll}>
            {markingAll
              ? <ActivityIndicator size="small" color={Colors.blueLight} />
              : (
                <>
                  <Ionicons name="checkmark-done-outline" size={13} color={Colors.blueLight} />
                  <Text style={s.markAllText}>Mark all read</Text>
                </>
              )
            }
          </TouchableOpacity>
        )}
      </View>

      <View style={s.kpiRow}>
        {kpis.map((k) => (
          <View key={k.label} style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabsScroll}
        contentContainerStyle={s.tabsRow}
      >
        {TABS.map((t) => {
          const count = countForTab(t.key)
          const active = activeTab === t.key
          return (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
              <View style={[s.tabCount, active && s.tabCountActive]}>
                <Text style={[s.tabCountText, active && s.tabCountTextActive]}>{count}</Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.blue} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id ?? Math.random())}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true) }}
              tintColor={Colors.blue}
            />
          }
          ListEmptyComponent={
            <View style={s.center}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="notifications-off-outline" size={32} color={Colors.blue} />
              </View>
              <Text style={s.emptyTitle}>No Notifications</Text>
              <Text style={s.emptyText}>You're all caught up. No notifications to show.</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={s.separator} />}
          renderItem={({ item }) => {
            const unread = isUnread(item)
            const iconName = resolveIconName(item)
            const iconColor = resolveIconColor(item)
            const title = item.title ?? item.message ?? "Notification"
            const subtitle = item.subtitle ?? item.body ?? item.description ?? item.detail ?? ""
            const badge = item.badge ?? ""
            const badgeColor = item.badgeStyle
              ? BADGE_COLOR_MAP[item.badgeStyle] ?? Colors.mutedDim
              : iconColor
            const time = timeAgo(item.created_at ?? item.timestamp ?? "")

            return (
              <TouchableOpacity
                style={[s.row, unread && s.rowUnread]}
                activeOpacity={0.75}
                onPress={() => handleTap(item)}
              >
                <View style={s.iconWrap}>
                  <View style={[
                    s.iconContainer,
                    { backgroundColor: iconColor + "18", borderColor: iconColor + "35" },
                  ]}>
                    <Ionicons name={iconName as any} size={20} color={iconColor} />
                  </View>
                  {unread && <View style={[s.unreadDot, { backgroundColor: iconColor }]} />}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[s.rowTitle, unread && s.rowTitleUnread]} numberOfLines={1}>
                    {title}
                  </Text>
                  {!!subtitle && (
                    <Text style={s.rowSubtitle} numberOfLines={2}>{subtitle}</Text>
                  )}
                  <View style={s.rowMeta}>
                    {!!badge && (
                      <View style={[s.badgeWrap, { backgroundColor: badgeColor + "18", borderColor: badgeColor + "40" }]}>
                        <Text style={[s.badgeText, { color: badgeColor }]}>{badge}</Text>
                      </View>
                    )}
                    {!!time && <Text style={s.rowTime}>{time}</Text>}
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
  header: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    marginHorizontal: Spacing.xl, marginVertical: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  headerIcon: {
    width: 34, height: 34, borderRadius: Radius.sm,
    backgroundColor: Colors.gold + "18",
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  subtitle: { fontSize: FontSize.xs, color: Colors.blue, marginTop: 2 },
  markAllBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm,
    backgroundColor: Colors.blueSubtle, borderWidth: 1, borderColor: Colors.blueBorder,
  },
  markAllText: { fontSize: FontSize.xs, color: Colors.blueLight, fontFamily: Font.semibold },
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  kpiCard: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: "center",
  },
  kpiValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold },
  kpiLabel: { fontSize: 9, fontFamily: Font.semibold, color: Colors.muted, marginTop: 3, textAlign: "center" },
  tabsScroll: { marginBottom: Spacing.sm, height: 38 },
  tabsRow: { paddingHorizontal: Spacing.xl, gap: 8, alignItems: "center" },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.xl, backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  tabText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  tabTextActive: { color: "#fff" },
  tabCount: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.bgPanel, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabCountActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  tabCountText: { fontSize: 9, color: Colors.mutedDim, fontFamily: Font.bold },
  tabCountTextActive: { color: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: Spacing.md },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.blueIconBg, alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.bold },
  emptyText: { fontSize: FontSize.sm, color: Colors.mutedDim, textAlign: "center", paddingHorizontal: 32 },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: Spacing.xl, paddingVertical: 14, gap: Spacing.md,
  },
  rowUnread: { backgroundColor: Colors.blue + "07" },
  iconWrap: { position: "relative" },
  iconContainer: {
    width: 46, height: 46, borderRadius: Radius.md,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  unreadDot: {
    position: "absolute", top: 3, right: 3,
    width: 8, height: 8, borderRadius: 4,
    borderWidth: 2, borderColor: Colors.bg,
  },
  rowTitle: { fontSize: FontSize.sm, color: Colors.muted, fontFamily: Font.medium, marginBottom: 2 },
  rowTitleUnread: { color: Colors.text, fontFamily: Font.bold },
  rowSubtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginBottom: 5 },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  badgeWrap: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.sm, borderWidth: 1 },
  badgeText: { fontSize: 9, fontFamily: Font.bold },
  rowTime: { fontSize: FontSize.xs, color: Colors.mutedDim },
  separator: {
    height: 1, backgroundColor: Colors.rowDivider,
    marginLeft: Spacing.xl + 46 + Spacing.md,
  },
})
