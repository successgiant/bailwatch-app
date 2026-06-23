import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert, Linking } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

const RISK_COLORS: Record<string, string> = {
  Low: Colors.green, low: Colors.green,
  Medium: Colors.orange, medium: Colors.orange,
  High: Colors.red, high: Colors.red,
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Active: { bg: Colors.green + "18", text: Colors.green },
  active: { bg: Colors.green + "18", text: Colors.green },
  ALERT: { bg: Colors.red + "18", text: Colors.red },
  alert: { bg: Colors.red + "18", text: Colors.red },
  "Re-Arrested": { bg: Colors.red + "22", text: Colors.red },
  Inactive: { bg: Colors.mutedDim + "18", text: Colors.mutedDim },
  inactive: { bg: Colors.mutedDim + "18", text: Colors.mutedDim },
}

const AVATAR_COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2"]
function avatarColor(s: string): string {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function BondWatchScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [clients, setClients] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [alertItems, setAlertItems] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [resolvingId, setResolvingId] = useState<number | null>(null)

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const [cl, al] = await Promise.all([
        api.bondwatch.clients(identity).catch(() => null),
        api.bondwatch.alerts(identity).catch(() => null),
      ])
      const clientList = cl?.results ?? cl?.data ?? cl
      const arr = Array.isArray(clientList) ? clientList : []
      setClients(arr)
      setFiltered(arr)
      const alertList = al?.results ?? al?.data ?? al
      setAlertItems(Array.isArray(alertList) ? alertList : [])
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const handleResolve = async (item: any) => {
    if (!identity) return
    Alert.alert("Resolve Alert", `Mark re-arrest alert for ${item.full_name ?? item.name ?? "this client"} as resolved?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Resolve", onPress: async () => {
        setResolvingId(item.id)
        try {
          await api.bondwatch.clear(identity, { client_id: item.id })
          const updated = clients.map((c) => c.id === item.id ? { ...c, status: "Active", is_rearrested: false } : c)
          setClients(updated)
          const q = query
          setFiltered(q ? updated.filter((c) => (c.full_name ?? c.name ?? "").toLowerCase().includes(q.toLowerCase())) : updated)
        } catch (e: any) {
          Alert.alert("Error", e?.message ?? "Could not resolve alert")
        } finally { setResolvingId(null) }
      }},
    ])
  }

  const handleCall = (phone: string) => {
    if (!phone) return
    Linking.openURL(`tel:${phone}`)
  }

  const handleSearch = (text: string) => {
    setQuery(text)
    if (!text.trim()) { setFiltered(clients); return }
    const q = text.toLowerCase()
    setFiltered(clients.filter((c) =>
      (c.full_name ?? c.name ?? "").toLowerCase().includes(q) ||
      (c.case_number ?? "").toLowerCase().includes(q) ||
      (c.county ?? "").toLowerCase().includes(q)
    ))
  }

  const reArrested = clients.filter((c) => c.status === "ALERT" || c.status === "Re-Arrested" || c.is_rearrested)
  const active = clients.filter((c) => ["Active", "active"].includes(c.status ?? ""))

  const kpis = [
    { label: "Monitored", value: String(clients.length), color: Colors.text },
    { label: "Active", value: String(active.length), color: Colors.green },
    { label: "Alerts", value: String(reArrested.length), color: Colors.red },
    { label: "Low Risk", value: String(clients.filter((c) => (c.risk_level ?? "low").toLowerCase() === "low").length), color: Colors.green },
  ]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.blueIconBg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.blueIconBorder }}>
          <Ionicons name="shield-outline" size={17} color={Colors.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>BondWatch</Text>
          <Text style={s.subtitle}>Client Monitoring</Text>
        </View>
        <View style={s.liveIndicator}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE</Text>
        </View>
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

      {/* Alert Banner */}
      {reArrested.length > 0 && (
        <View style={s.alertBanner}>
          <Ionicons name="warning" size={16} color={Colors.red} />
          <View style={{ flex: 1 }}>
            <Text style={s.alertBannerTitle}>{reArrested.length} Re-Arrest Alert{reArrested.length > 1 ? "s" : ""}</Text>
            <Text style={s.alertBannerText} numberOfLines={1}>
              {reArrested.map((c) => c.full_name ?? c.name ?? "Unknown").join(", ")}
            </Text>
          </View>
          <TouchableOpacity style={s.alertBannerBtn} onPress={() => Alert.alert("Alerts", reArrested.map((c) => c.full_name ?? c.name ?? "Unknown").join("\n"))}>
            <Text style={s.alertBannerBtnText}>View All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
        <TextInput
          style={s.searchInput}
          placeholder="Search clients..."
          placeholderTextColor={Colors.mutedDim}
          value={query}
          onChangeText={handleSearch}
        />
        {!!query && (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <Ionicons name="close-circle" size={16} color={Colors.mutedDim} />
          </TouchableOpacity>
        )}
      </View>

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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={Colors.blue} />}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="shield-checkmark-outline" size={48} color={Colors.green} />
              <Text style={s.emptyTitle}>All Clear</Text>
              <Text style={s.emptyText}>No clients to monitor.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const name = item.full_name ?? item.name ?? "Unknown"
            const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"
            const acColor = avatarColor(name)
            const status = item.status ?? "Active"
            const sc = STATUS_COLORS[status] ?? { bg: Colors.mutedDim + "18", text: Colors.mutedDim }
            const riskLevel = item.risk_level ?? "Low"
            const riskScore = item.risk_score ?? null
            const riskColor = RISK_COLORS[riskLevel] ?? Colors.muted
            const isAlert = ["ALERT", "Re-Arrested"].includes(status) || item.is_rearrested
            const lastCheck = item.last_check ?? item.last_checkin ?? item.updated_at ?? ""
            const coverage: string[] = Array.isArray(item.coverage) ? item.coverage : []

            return (
              <TouchableOpacity style={[s.card, isAlert && s.cardAlert]} activeOpacity={0.8}>
                <View style={s.cardTop}>
                  <View style={[s.avatar, { backgroundColor: acColor + "22" }]}>
                    <Text style={[s.avatarText, { color: acColor }]}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.clientName}>{name}</Text>
                    <View style={s.metaInline}>
                      {!!item.case_number && <Text style={s.caseNum}>#{item.case_number}</Text>}
                      {!!item.county && <Text style={s.county}>{item.county}</Text>}
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.statusText, { color: sc.text }]}>{status}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[s.riskLabel, { color: riskColor }]}>{riskLevel}</Text>
                      {riskScore != null && (
                        <Text style={[s.riskScore, { color: riskColor }]}>{riskScore}</Text>
                      )}
                    </View>
                  </View>
                </View>

                {coverage.length > 0 && (
                  <View style={s.coverageRow}>
                    {coverage.slice(0, 3).map((cov, ci) => (
                      <View key={ci} style={s.coveragePill}>
                        <Text style={s.coveragePillText}>{cov}</Text>
                      </View>
                    ))}
                    {coverage.length > 3 && <Text style={s.moreText}>+{coverage.length - 3}</Text>}
                  </View>
                )}

                <View style={s.cardFooter}>
                  {!!lastCheck && (
                    <View style={s.lastCheck}>
                      <Ionicons name="time-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.lastCheckText}>
                        Last check: {new Date(lastCheck).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity style={s.actionBtn} onPress={() => handleCall(item.phone ?? item.contact_phone ?? "")}>
                    <Ionicons name="call-outline" size={14} color={Colors.mutedDim} />
                  </TouchableOpacity>
                  {isAlert && (
                    <TouchableOpacity style={s.resolveBtn} onPress={() => handleResolve(item)} disabled={resolvingId === item.id}>
                      {resolvingId === item.id
                        ? <ActivityIndicator size="small" color={Colors.green} />
                        : <Text style={s.resolveBtnText}>Resolve</Text>
                      }
                    </TouchableOpacity>
                  )}
                </View>
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
  backBtn: { width: 36, height: 36, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  subtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  liveIndicator: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.green + "14", borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.green + "30", paddingHorizontal: 10, paddingVertical: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.green },
  liveText: { fontSize: 10, color: Colors.green, fontFamily: Font.bold, letterSpacing: 1 },
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold, color: Colors.text },
  kpiLabel: { fontSize: 9, fontFamily: Font.semibold, marginTop: 3, textAlign: "center" },
  alertBanner: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginHorizontal: Spacing.xl, marginBottom: Spacing.md, backgroundColor: Colors.red + "12", borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.red + "30", padding: Spacing.lg },
  alertBannerTitle: { fontSize: FontSize.sm, color: Colors.red, fontFamily: Font.bold },
  alertBannerText: { fontSize: FontSize.xs, color: Colors.red + "aa", marginTop: 2 },
  alertBannerBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.red + "40" },
  alertBannerBtnText: { fontSize: FontSize.xs, color: Colors.red, fontFamily: Font.bold },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: Spacing.xl, marginBottom: Spacing.md, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, height: 44 },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.bold },
  emptyText: { fontSize: FontSize.sm, color: Colors.mutedDim },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  cardAlert: { borderColor: Colors.red + "50", borderLeftWidth: 3, borderLeftColor: Colors.red },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md, marginBottom: Spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: FontSize.md, fontFamily: Font.extrabold },
  clientName: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  metaInline: { flexDirection: "row", gap: 8, marginTop: 3 },
  caseNum: { fontSize: FontSize.xs, color: Colors.mutedDim },
  county: { fontSize: FontSize.xs, color: Colors.muted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  statusText: { fontSize: 10, fontFamily: Font.bold },
  riskLabel: { fontSize: 11, fontFamily: Font.bold },
  riskScore: { fontSize: FontSize.xl, fontFamily: Font.extrabold },
  coverageRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: Spacing.sm },
  coveragePill: { backgroundColor: Colors.blue + "14", borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.blue + "25", paddingHorizontal: 7, paddingVertical: 2 },
  coveragePillText: { fontSize: 10, color: Colors.blueBright, fontFamily: Font.medium },
  moreText: { fontSize: 10, color: Colors.mutedDim, alignSelf: "center" },
  cardFooter: { flexDirection: "row", alignItems: "center", paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderFaint },
  lastCheck: { flexDirection: "row", alignItems: "center", gap: 4 },
  lastCheckText: { fontSize: FontSize.xs, color: Colors.mutedDim },
  actionBtn: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.bgPanel, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center", marginLeft: 6 },
  resolveBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm, backgroundColor: Colors.green + "18", borderWidth: 1, borderColor: Colors.green + "33", marginLeft: 6 },
  resolveBtnText: { fontSize: FontSize.xs, color: Colors.green, fontFamily: Font.bold },
})
