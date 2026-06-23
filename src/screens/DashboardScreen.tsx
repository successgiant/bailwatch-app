import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"
import Svg, { Path, Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg"

// ── helpers ──────────────────────────────────────────────────────────────────
function timeAgo(str: string): string {
  if (!str) return ""
  try {
    const diff = Date.now() - new Date(str).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return "just now"
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  } catch { return "" }
}

const ICON_COLOR: Record<string, string> = {
  FileText: Colors.blue, AlertTriangle: Colors.red, Users: Colors.blueBright,
  Circle: Colors.purple, Calendar: Colors.blue, ClipboardList: Colors.blue,
  TrendingUp: Colors.emerald, CreditCard: Colors.green, UserPlus: Colors.blue,
  Send: Colors.blueBright, CalendarPlus: Colors.gold,
}
const ICON_NAME: Record<string, string> = {
  FileText: "document-text-outline", AlertTriangle: "warning-outline", Users: "people-outline",
  Circle: "ellipse-outline", Calendar: "calendar-outline", ClipboardList: "clipboard-outline",
  TrendingUp: "trending-up-outline", CreditCard: "card-outline", UserPlus: "person-add-outline",
  Send: "send-outline", CalendarPlus: "calendar-outline",
}

// ── Donut Chart (SVG) ─────────────────────────────────────────────────────────
function DonutChart({ data }: { data: any[] }) {
  const total = data.reduce((s: number, d: any) => s + (Number(d.count) || 0), 0)
  if (!data.length || total === 0) {
    return (
      <View style={chart.emptyBox}>
        <Ionicons name="people-outline" size={26} color={Colors.blue} />
        <Text style={chart.emptyTitle}>No County Data</Text>
        <Text style={chart.emptyText}>County breakdown will appear here.</Text>
      </View>
    )
  }
  const size = 140, cx = size / 2, cy = size / 2, r = 52, ir = 34
  let angle = -Math.PI / 2
  const slices: { path: string; color: string }[] = []
  data.forEach((d: any) => {
    const pct = (Number(d.count) || 0) / total
    const sweep = pct * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle)
    const x2 = cx + r * Math.cos(angle + sweep), y2 = cy + r * Math.sin(angle + sweep)
    const ix1 = cx + ir * Math.cos(angle), iy1 = cy + ir * Math.sin(angle)
    const ix2 = cx + ir * Math.cos(angle + sweep), iy2 = cy + ir * Math.sin(angle + sweep)
    const large = sweep > Math.PI ? 1 : 0
    slices.push({
      path: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ir} ${ir} 0 ${large} 0 ${ix1} ${iy1} Z`,
      color: d.color,
    })
    angle += sweep
  })
  return (
    <View>
      <View style={{ alignItems: "center", marginBottom: 12 }}>
        <Svg width={size} height={size}>
          {slices.map((s, i) => (
            <Path key={i} d={s.path} fill={s.color} stroke={Colors.bg} strokeWidth={1.5} />
          ))}
          <SvgText x={String(cx)} y={String(cy - 8)} textAnchor="middle" fontSize={22} fontWeight="bold" fill={Colors.text}>{total}</SvgText>
          <SvgText x={String(cx)} y={String(cy + 12)} textAnchor="middle" fontSize={9} fill={Colors.muted}>Total</SvgText>
        </Svg>
      </View>
      <View style={{ gap: 10 }}>
        {data.map((d: any, i: number) => {
          const pct = total > 0 ? Math.round((Number(d.count) || 0) / total * 100) : 0
          return (
            <View key={i}>
              <View style={chart.legendRow}>
                <View style={[chart.dot, { backgroundColor: d.color }]} />
                <Text style={chart.legendLabel} numberOfLines={1}>{d.county}</Text>
                <Text style={chart.legendPct}>{pct}%</Text>
                <Text style={chart.legendCount}>{d.count}</Text>
              </View>
              <View style={chart.barBg}>
                <View style={[chart.barFill, { width: `${pct}%` as any, backgroundColor: d.color }]} />
              </View>
            </View>
          )
        })}
      </View>
      <View style={chart.footer}>
        <Text style={chart.footerText}>{data.length} active {data.length === 1 ? "county" : "counties"}</Text>
        <Text style={chart.footerVal}>{total} total clients</Text>
      </View>
    </View>
  )
}

// ── Area Chart (SVG) ──────────────────────────────────────────────────────────
function AreaChart({ data }: { data: any[] }) {
  if (!data.length) {
    return (
      <View style={chart.emptyBox}>
        <Ionicons name="trending-up-outline" size={26} color={Colors.blue} />
        <Text style={chart.emptyTitle}>No Trend Data</Text>
        <Text style={chart.emptyText}>Bookings trend will appear here.</Text>
      </View>
    )
  }
  const totalBookings = data.reduce((s: number, d: any) => s + (d.bookings || 0), 0)
  const avgBookings = data.length ? Math.round(totalBookings / data.length) : 0
  const last = data[data.length - 1]?.bookings || 0
  const prev = data[data.length - 2]?.bookings || 0
  const trend = last - prev

  const W = 280, H = 110
  const maxB = Math.max(...data.map((d: any) => d.bookings || 0), 1)
  const pts = data.map((d: any, i: number) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((d.bookings || 0) / maxB) * (H - 10) - 5,
  }))
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${H} L 0 ${H} Z`
  // show every 3rd label
  const labels = data.filter((_: any, i: number) => i % Math.max(1, Math.floor(data.length / 4)) === 0 || i === data.length - 1)

  return (
    <View>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <View style={[chart.pill, { borderColor: Colors.blueBorder, backgroundColor: Colors.blueSubtle }]}>
          <View style={[chart.pillDot, { backgroundColor: Colors.blueBright }]} />
          <Text style={chart.pillLabel}>Bookings</Text>
          <Text style={[chart.pillVal, { color: Colors.text }]}>{totalBookings}</Text>
        </View>
        <View style={[chart.pill, { borderColor: Colors.border, backgroundColor: "rgba(255,255,255,0.03)" }]}>
          <View style={[chart.pillDot, { backgroundColor: Colors.mutedDim }]} />
          <Text style={chart.pillLabel}>Avg/Day</Text>
          <Text style={[chart.pillVal, { color: Colors.muted }]}>{avgBookings}</Text>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "flex-end" }}>
          <Text style={{ fontSize: FontSize.xs, color: trend > 0 ? Colors.green : trend < 0 ? Colors.red : Colors.muted }}>
            {trend > 0 ? "↑" : trend < 0 ? "↓" : "→"} {Math.abs(trend)} vs prev
          </Text>
        </View>
      </View>
      <Svg width={W} height={H + 18}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={Colors.blueBright} stopOpacity={0.4} />
            <Stop offset="100%" stopColor={Colors.blueBright} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill={Colors.blueBright} fillOpacity={0.15} />
        <Path d={linePath} fill="none" stroke={Colors.blueBright} strokeWidth={2} />
        {labels.map((d: any, i: number) => {
          const idx = data.indexOf(d)
          const x = (idx / (data.length - 1)) * W
          return (
            <SvgText key={i} x={String(x)} y={String(H + 14)} textAnchor="middle" fontSize={8} fill={Colors.mutedDim}>{d.date}</SvgText>
          )
        })}
      </Svg>
      <View style={chart.footer}>
        <Text style={chart.footerText}>Last {data.length} days</Text>
        <Text style={chart.footerVal}>{totalBookings} total bookings</Text>
      </View>
    </View>
  )
}

// ── Top Charges (progress bars) ───────────────────────────────────────────────
function TopChargesChart({ data }: { data: any[] }) {
  if (!data.length) {
    return (
      <View style={chart.emptyBox}>
        <Ionicons name="warning-outline" size={26} color={Colors.gold} />
        <Text style={chart.emptyTitle}>No Charge Data</Text>
        <Text style={chart.emptyText}>Top charges will appear here.</Text>
      </View>
    )
  }
  const total = data.reduce((s: number, d: any) => s + d.count, 0)
  const maxCount = Math.max(...data.map((d: any) => d.count), 1)
  return (
    <View>
      <View style={{ gap: 10, marginBottom: 12 }}>
        {data.slice(0, 8).map((item: any, i: number) => {
          const pct = Math.round((item.count / maxCount) * 100)
          const hue = 210 + i * 20
          const lightness = Math.max(40, 60 - i * 4)
          const color = `hsl(${hue}, 70%, ${lightness}%)`
          return (
            <View key={i}>
              <View style={chart.legendRow}>
                <View style={[chart.squareDot, { backgroundColor: color }]} />
                <Text style={[chart.legendLabel, { flex: 1 }]} numberOfLines={1}>
                  {item.charge.length > 30 ? item.charge.slice(0, 30) + "…" : item.charge}
                </Text>
                <Text style={[chart.legendCount, { marginRight: 4 }]}>{item.count}</Text>
                <Text style={chart.legendPct}>({item.percentage}%)</Text>
              </View>
              <View style={chart.barBg}>
                <View style={[chart.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
              </View>
            </View>
          )
        })}
      </View>
      <View style={chart.footer}>
        <Text style={chart.footerText}>{data.length} charge types</Text>
        <Text style={chart.footerVal}>{total} total cases</Text>
      </View>
    </View>
  )
}

// ── Quick Action palette ──────────────────────────────────────────────────────
const QA_PALETTE = [
  { bg: Colors.blueSubtle, border: Colors.blueBorder, icon: Colors.blue, text: Colors.blueLight },
  { bg: "rgba(139,92,246,0.10)", border: "rgba(139,92,246,0.28)", icon: Colors.purple, text: Colors.purple },
  { bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.28)", icon: Colors.emerald, text: Colors.emerald },
  { bg: "rgba(139,92,246,0.10)", border: "rgba(139,92,246,0.28)", icon: Colors.purple, text: Colors.purple },
  { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.28)", icon: Colors.gold, text: Colors.gold },
  { bg: "rgba(56,189,248,0.10)", border: "rgba(56,189,248,0.28)", icon: Colors.blueSky, text: Colors.blueSky },
]

const QA_NAV: Record<string, { tab: string; screen: string | null }> = {
  "add-client":       { tab: "Clients", screen: null },
  "send-bondapp":     { tab: "More", screen: "BondApp" },
  "record-payment":   { tab: "More", screen: "Payments" },
  "add-court-date":   { tab: "More", screen: "Calendar" },
  "new-bond":         { tab: "Bonds", screen: null },
  "upload-doc":       { tab: "More", screen: "ESign" },
  "search-client":    { tab: "Clients", screen: null },
}

// ── Priority → color ──────────────────────────────────────────────────────────
function taskColor(priority: string): string {
  if (!priority) return Colors.muted
  const p = priority.toLowerCase()
  if (p === "critical" || p === "high") return Colors.red
  if (p === "warning" || p === "medium") return Colors.gold
  return Colors.muted
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export function DashboardScreen() {
  const { identity, user } = useAuth()
  const navigation = useNavigation<any>()
  const [dash, setDash] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const res: any = await api.dashboard(identity)
      const d = res?.data ?? res
      setDash(d)
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const statCards: any[] = Array.isArray(dash?.statCards) ? dash.statCards : []
  const alerts: any[]    = Array.isArray(dash?.alerts)    ? dash.alerts.slice(0, 8) : []
  const activities: any[]= Array.isArray(dash?.activities)? dash.activities.slice(0, 9) : []
  const courtDates: any[]= Array.isArray(dash?.courtDates)? dash.courtDates : []
  const tasks: any[]     = Array.isArray(dash?.tasks)     ? dash.tasks : []
  const countyData: any[]= Array.isArray(dash?.countyData)? dash.countyData : []
  const trendData: any[] = Array.isArray(dash?.trendData) ? dash.trendData : []
  const topCharges: any[]= Array.isArray(dash?.topCharges)? dash.topCharges : []
  const quickActions: any[]=Array.isArray(dash?.quickActions)?dash.quickActions : []

  const displayName = user?.name ?? user?.full_name ?? user?.username ?? identity?.split("@")[0] ?? "Agent"

  const handleQA = (action: any) => {
    const nav = QA_NAV[action.id] ?? QA_NAV[action.label?.toLowerCase().replace(/ /g, "-")]
    if (!nav) return
    if (nav.screen) navigation.navigate(nav.tab as any, { screen: nav.screen })
    else navigation.navigate(nav.tab as any)
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={Colors.blue} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>Welcome back,</Text>
            <Text style={s.userName}>{displayName}</Text>
            <Text style={s.headerSub}>Your daily overview of bookings, alerts, and activity.</Text>
          </View>
          <TouchableOpacity style={s.notifBtn} onPress={() => navigation.navigate("Alerts")}>
            <Ionicons name="notifications-outline" size={20} color={Colors.text} />
            {alerts.length > 0 && <View style={s.notifDot} />}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 80 }}>
            <ActivityIndicator size="large" color={Colors.blue} />
          </View>
        ) : (
          <>
            {/* Stat Cards */}
            {statCards.length > 0 && (
              <View style={s.statGrid}>
                {statCards.map((card: any) => {
                  const color = ICON_COLOR[card.icon] ?? Colors.blue
                  const iconName = ICON_NAME[card.icon] ?? "ellipse-outline"
                  const isUp = card.delta?.direction === "up"
                  return (
                    <View key={card.id} style={s.statCard}>
                      <View style={[s.statIconWrap, { backgroundColor: color + "18" }]}>
                        <Ionicons name={iconName as any} size={18} color={color} />
                      </View>
                      <Text style={s.statLabel}>{card.label}</Text>
                      <Text style={[s.statValue, { color }]}>{card.value}</Text>
                      {card.delta?.value != null && (
                        <View style={s.deltaRow}>
                          <Ionicons name={isUp ? "arrow-up" : "arrow-down"} size={9} color={isUp ? Colors.green : Colors.red} />
                          <Text style={[s.deltaText, { color: isUp ? Colors.green : Colors.red }]}>
                            {card.delta.value}%
                          </Text>
                          <Text style={s.deltaPeriod}>{card.delta.period}</Text>
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            )}

            {/* Live Alerts Feed */}
            <Widget
              title="Live Alerts Feed"
              icon="radio-outline"
              iconColor={Colors.red}
              badge={alerts.length > 0 ? { count: alerts.length, color: Colors.red } : undefined}
              actionLabel="View All"
              onAction={() => navigation.navigate("More" as any, { screen: "ArrestAlert" })}
            >
              {alerts.length === 0 ? (
                <EmptyState icon="shield-checkmark-outline" color={Colors.green} title="No Alerts Right Now" text="New arrest alerts will appear here in real-time." />
              ) : (
                <>
                  {alerts.map((alert: any, i: number) => {
                    const isRearrest = (alert.type ?? "").toUpperCase().includes("RE")
                    const badgeColor = isRearrest ? Colors.red : Colors.gold
                    const badgeLabel = isRearrest ? "RE-ARREST" : "NEW"
                    return (
                      <View key={alert.id ?? i} style={[s.alertRow, i < alerts.length - 1 && s.rowBorder]}>
                        <View style={[s.typeBadge, { backgroundColor: badgeColor + "18" }]}>
                          <Text style={[s.typeBadgeText, { color: badgeColor }]}>{badgeLabel}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.alertName}>{alert.person?.name ?? "Unknown"}</Text>
                          <Text style={s.alertMeta}>
                            {[alert.person?.county, alert.charge].filter(Boolean).join(" · ")}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 4 }}>
                          <Text style={s.timeAgo}>{alert.timeAgo}</Text>
                          <View style={[s.ctaBtn, { borderColor: Colors.blueBorder, backgroundColor: Colors.blueSubtle }]}>
                            <Text style={[s.ctaBtnText, { color: Colors.blueLight }]}>{alert.cta?.label ?? "View"}</Text>
                          </View>
                        </View>
                      </View>
                    )
                  })}
                  <Text style={s.alertFooter}>Showing latest {alerts.length} alerts</Text>
                </>
              )}
            </Widget>

            {/* Activity Overview */}
            <Widget
              title="Activity Overview"
              icon="trending-up-outline"
              iconColor={Colors.blueBright}
              actionLabel="View All"
              onAction={() => navigation.navigate("Alerts")}
            >
              {activities.length === 0 ? (
                <EmptyState icon="pulse-outline" color={Colors.blue} title="No Recent Activity" text="Activity will appear here as actions are taken." />
              ) : activities.map((act: any, i: number) => {
                const bgColor = act.iconBg?.includes("blue") ? Colors.blueSubtle
                  : act.iconBg?.includes("emerald") ? "rgba(16,185,129,0.10)"
                  : act.iconBg?.includes("red") ? "rgba(239,68,68,0.10)"
                  : Colors.blueSubtle
                const iconCol = act.iconColor?.includes("emerald") ? Colors.emerald
                  : act.iconColor?.includes("red") ? Colors.red
                  : Colors.blueBright
                const iName = ICON_NAME[act.icon] ?? "ellipse-outline"
                return (
                  <View key={act.id ?? i} style={[s.actRow, i < activities.length - 1 && s.rowBorder]}>
                    <View style={[s.actIconWrap, { backgroundColor: bgColor }]}>
                      <Ionicons name={iName as any} size={14} color={iconCol} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.actTitle}>{act.title}</Text>
                      {!!act.subtitle && <Text style={s.actSub}>{act.subtitle}</Text>}
                    </View>
                    {!!act.time && <Text style={s.timeAgo}>{act.time}</Text>}
                  </View>
                )
              })}
            </Widget>

            {/* Upcoming Court Dates */}
            <Widget
              title="Upcoming Court Dates"
              icon="calendar-outline"
              iconColor={Colors.blue}
              actionLabel="View Calendar"
              onAction={() => navigation.navigate("More" as any, { screen: "Calendar" })}
            >
              {courtDates.length === 0 ? (
                <EmptyState icon="calendar-outline" color={Colors.mutedDim} title="No Court Dates" text="Add court dates to see them here." />
              ) : courtDates.map((cd: any, i: number) => (
                <View key={cd.id ?? i} style={[s.courtRow, i < courtDates.length - 1 && s.rowBorder]}>
                  <Text style={s.courtDate}>{cd.displayDate}</Text>
                  <Text style={s.courtName}>{cd.clientName}</Text>
                  <Text style={s.courtCourt} numberOfLines={1}>{cd.court}</Text>
                </View>
              ))}
            </Widget>

            {/* Tasks & Follow Ups */}
            <Widget
              title="Tasks & Follow Ups"
              icon="checkmark-circle-outline"
              iconColor={Colors.emerald}
              actionLabel="View All"
              onAction={() => {}}
            >
              {tasks.length === 0 ? (
                <EmptyState icon="checkmark-circle-outline" color={Colors.emerald} title="All Caught Up!" text="No pending tasks. Great job!" />
              ) : tasks.map((task: any, i: number) => (
                <View key={task.id ?? i} style={[s.taskRow, i < tasks.length - 1 && s.rowBorder]}>
                  <View style={s.taskCircle} />
                  <Text style={s.taskTitle}>{task.title ?? task.description ?? "Task"}</Text>
                  <Text style={[s.taskDue, { color: taskColor(task.priority) }]}>
                    {task.dueDate ?? task.due_label ?? ""}
                  </Text>
                </View>
              ))}
            </Widget>

            {/* Quick Actions */}
            <View style={s.sectionPad}>
              <View style={[s.widgetCard, { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg }]}>
                <WidgetHeader title="Quick Actions" icon="flash-outline" iconColor={Colors.blueBright} />
                <View style={s.qaGrid}>
                  {(quickActions.length > 0 ? quickActions : [
                    { id: "add-client", label: "Add Client", icon: "UserPlus" },
                    { id: "send-bondapp", label: "Send BondApp", icon: "Send" },
                    { id: "record-payment", label: "Record Payment", icon: "CreditCard" },
                    { id: "add-court-date", label: "Add Court Date", icon: "CalendarPlus" },
                    { id: "new-bond", label: "New Bond", icon: "FileText" },
                    { id: "upload-doc", label: "Upload Document", icon: "FileText" },
                  ]).map((a: any, i: number) => {
                    const p = QA_PALETTE[i % QA_PALETTE.length]
                    const iName = ICON_NAME[a.icon] ?? "flash-outline"
                    return (
                      <TouchableOpacity
                        key={a.id ?? i}
                        style={[s.qaBtn, { backgroundColor: p.bg, borderColor: p.border }]}
                        onPress={() => handleQA(a)}
                      >
                        <View style={[s.qaIconWrap, { backgroundColor: p.bg }]}>
                          <Ionicons name={iName as any} size={16} color={p.icon} />
                        </View>
                        <Text style={[s.qaLabel, { color: p.text }]}>{a.label}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            </View>

            {/* Clients by County */}
            <Widget title="Clients by County" icon="map-outline" iconColor={Colors.blue}>
              <DonutChart data={countyData} />
            </Widget>

            {/* Bookings Trend */}
            <Widget title="Bookings Trend" icon="trending-up-outline" iconColor={Colors.blueBright}>
              <AreaChart data={trendData} />
            </Widget>

            {/* Top Charges */}
            <Widget title="Top Charges (This Week)" icon="warning-outline" iconColor={Colors.gold}>
              <TopChargesChart data={topCharges} />
            </Widget>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Shared widget components ──────────────────────────────────────────────────
function WidgetHeader({ title, icon, iconColor, badge, actionLabel, onAction }: {
  title: string; icon: string; iconColor: string
  badge?: { count: number; color: string }
  actionLabel?: string; onAction?: () => void
}) {
  return (
    <View style={s.widgetHeader}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={s.widgetIconWrap}>
          <Ionicons name={icon as any} size={13} color={Colors.blueLight} />
        </View>
        <Text style={s.widgetTitle}>{title}</Text>
        {badge && badge.count > 0 && (
          <View style={[s.badgePill, { backgroundColor: badge.color + "18" }]}>
            <Text style={[s.badgePillText, { color: badge.color }]}>{badge.count} New</Text>
          </View>
        )}
      </View>
      {actionLabel && (
        <TouchableOpacity style={s.actionBtn} onPress={onAction}>
          <Text style={s.actionBtnText}>{actionLabel} →</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function Widget({ title, icon, iconColor, badge, actionLabel, onAction, children }: {
  title: string; icon: string; iconColor: string
  badge?: { count: number; color: string }
  actionLabel?: string; onAction?: () => void
  children: React.ReactNode
}) {
  return (
    <View style={s.sectionPad}>
      <View style={s.widgetCard}>
        <WidgetHeader title={title} icon={icon} iconColor={iconColor} badge={badge} actionLabel={actionLabel} onAction={onAction} />
        <View style={s.widgetBody}>{children}</View>
      </View>
    </View>
  )
}

function EmptyState({ icon, color, title, text }: { icon: string; color: string; title: string; text: string }) {
  return (
    <View style={s.emptyWrap}>
      <View style={[s.emptyIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "flex-start", backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, margin: Spacing.xl, padding: Spacing.lg },
  greeting: { fontSize: FontSize.xs, color: Colors.muted },
  userName: { fontSize: FontSize.xl, color: Colors.text, fontFamily: Font.extrabold },
  headerSub: { fontSize: 10, color: Colors.mutedDim, marginTop: 2 },
  notifBtn: { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  notifDot: { position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.red },

  // Stat cards
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  statCard: { width: "48%", backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  statIconWrap: { width: 36, height: 36, borderRadius: Radius.md, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statLabel: { fontSize: 10, color: Colors.muted, marginBottom: 4 },
  statValue: { fontSize: FontSize.xxl, fontFamily: Font.extrabold, marginBottom: 4 },
  deltaRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  deltaText: { fontSize: 10, fontFamily: Font.bold },
  deltaPeriod: { fontSize: 10, color: Colors.mutedDim },

  // Section
  sectionPad: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },

  // Widget
  widgetCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  widgetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(15,27,53,0.40)", borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: 10 },
  widgetIconWrap: { width: 26, height: 26, borderRadius: 6, borderWidth: 1, borderColor: Colors.blueIconBorder, backgroundColor: Colors.blueIconBg, alignItems: "center", justifyContent: "center" },
  widgetTitle: { fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.semibold },
  widgetBody: { padding: Spacing.lg },
  actionBtn: { borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.blueBorder, backgroundColor: Colors.blueSubtle, paddingHorizontal: 8, paddingVertical: 4 },
  actionBtnText: { fontSize: 11, color: Colors.blueLight, fontFamily: Font.semibold },
  badgePill: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgePillText: { fontSize: 10, fontFamily: Font.bold },

  // Alert rows
  alertRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  typeBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  typeBadgeText: { fontSize: 9, fontFamily: Font.bold },
  alertName: { fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.semibold },
  alertMeta: { fontSize: 11, color: Colors.muted, marginTop: 1 },
  alertFooter: { textAlign: "center", fontSize: 10, color: Colors.mutedDim, paddingTop: 8 },
  timeAgo: { fontSize: 10, color: Colors.mutedDim },
  ctaBtn: { borderRadius: Radius.sm, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 3 },
  ctaBtnText: { fontSize: 10, fontFamily: Font.semibold },

  // Activity
  actRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10 },
  actIconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  actTitle: { fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.semibold },
  actSub: { fontSize: 11, color: Colors.muted, marginTop: 1 },

  // Court dates
  courtRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  courtDate: { fontSize: FontSize.sm, color: Colors.blueBright, fontFamily: Font.bold, width: 54 },
  courtName: { fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.medium, flex: 1 },
  courtCourt: { fontSize: 11, color: Colors.muted, maxWidth: 100 },

  // Tasks
  taskRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  taskCircle: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: Colors.border },
  taskTitle: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  taskDue: { fontSize: 11 },

  // Quick actions
  qaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  qaBtn: { width: "31%", flexDirection: "row", alignItems: "center", gap: 8, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 10 },
  qaIconWrap: { width: 30, height: 30, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
  qaLabel: { fontSize: 11, fontFamily: Font.semibold, flex: 1 },

  // Empty state
  emptyWrap: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.semibold },
  emptyText: { fontSize: 11, color: Colors.muted, textAlign: "center" },
})

const chart = StyleSheet.create({
  emptyBox: { alignItems: "center", paddingVertical: 28, gap: 8, borderRadius: Radius.md, borderWidth: 2, borderStyle: "dashed", borderColor: Colors.border },
  emptyTitle: { fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.semibold },
  emptyText: { fontSize: 11, color: Colors.muted, textAlign: "center" },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  squareDot: { width: 8, height: 8, borderRadius: 2, flexShrink: 0 },
  legendLabel: { fontSize: 11, color: Colors.muted, maxWidth: 140 },
  legendPct: { fontSize: 10, color: Colors.mutedDim },
  legendCount: { fontSize: 11, fontFamily: Font.semibold, color: Colors.text, width: 32, textAlign: "right" },
  barBg: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.05)", overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  footer: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 8 },
  footerText: { fontSize: 10, color: Colors.muted },
  footerVal: { fontSize: 10, color: Colors.text, fontFamily: Font.semibold },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillLabel: { fontSize: 10, color: Colors.muted },
  pillVal: { fontSize: 14, fontFamily: Font.bold },
})
