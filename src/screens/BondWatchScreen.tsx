import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert, Linking, ScrollView } from "react-native"
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
  Inactive: { bg: Colors.mutedDim + "18", text: Colors.mutedDim },
  inactive: { bg: Colors.mutedDim + "18", text: Colors.mutedDim },
}

const AVATAR_COLORS = [Colors.blue, Colors.purple, Colors.green, Colors.gold, Colors.red, Colors.blueSky]
function avatarColor(name: string): string {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

const RISK_FILTERS = ["All", "High Risk", "Alert", "Active"]

export function BondWatchScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [clients, setClients] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [riskFilter, setRiskFilter] = useState("All")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [resolvingId, setResolvingId] = useState<number | null>(null)

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const [cl] = await Promise.all([
        api.bondwatch.clients(identity).catch(() => null),
      ])
      const clientList = cl?.results ?? cl?.data ?? cl
      const arr = Array.isArray(clientList) ? clientList : []
      setClients(arr)
      applyFilters(query, riskFilter, arr)
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const applyFilters = (q: string, rf: string, source: any[] = clients) => {
    let out = source
    if (rf === "High Risk") {
      out = out.filter((c) => (c.riskLevel ?? c.risk_level ?? "").toLowerCase() === "high")
    } else if (rf === "Alert") {
      out = out.filter((c) => ["ALERT", "alert", "Re-Arrested"].includes(c.status ?? "") || (c.isReArrested ?? c.is_rearrested))
    } else if (rf === "Active") {
      out = out.filter((c) => ["Active", "active"].includes(c.status ?? ""))
    }
    if (q.trim()) {
      const lq = q.toLowerCase()
      out = out.filter((c) =>
        (c.name ?? c.client_name ?? c.full_name ?? "").toLowerCase().includes(lq) ||
        (c.caseNumber ?? c.case_number ?? c.booking_number ?? "").toLowerCase().includes(lq) ||
        (c.county ?? "").toLowerCase().includes(lq)
      )
    }
    setFiltered(out)
  }

  const handleResolve = async (item: any) => {
    if (!identity) return
    const name = item.name ?? item.client_name ?? item.full_name ?? "this client"
    Alert.alert("Resolve Alert", `Mark re-arrest alert for ${name} as resolved?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Resolve", onPress: async () => {
        setResolvingId(item.id)
        try {
          await api.bondwatch.clear(identity, { client_id: item.id })
          const updated = clients.map((c) => c.id === item.id ? { ...c, status: "Active", is_rearrested: false, isReArrested: false } : c)
          setClients(updated)
          applyFilters(query, riskFilter, updated)
        } catch (e: any) {
          Alert.alert("Error", e?.message ?? "Could not resolve alert")
        } finally { setResolvingId(null) }
      }},
    ])
  }

  const handleSearch = (text: string) => {
    setQuery(text)
    applyFilters(text, riskFilter)
  }

  const handleRiskFilter = (rf: string) => {
    setRiskFilter(rf)
    applyFilters(query, rf)
  }

  const totalMonitored = clients.length
  const activeCount = clients.filter((c) => ["Active", "active"].includes(c.status ?? "")).length
  const alertCount = clients.filter((c) => ["ALERT", "alert", "Re-Arrested"].includes(c.status ?? "") || (c.isReArrested ?? c.is_rearrested)).length
  const inactiveCount = clients.filter((c) => ["Inactive", "inactive"].includes(c.status ?? "")).length

  const kpiItems = [
    { label: "Monitored", value: String(totalMonitored), color: Colors.text },
    { label: "Active", value: String(activeCount), color: Colors.green },
    { label: "ALERT", value: String(alertCount), color: Colors.red },
    { label: "Inactive", value: String(inactiveCount), color: Colors.mutedDim },
  ]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
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

      <View style={s.kpiRow}>
        {kpiItems.map((k) => (
          <View key={k.label} style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      {alertCount > 0 && (
        <View style={s.alertBanner}>
          <Ionicons name="warning" size={16} color={Colors.red} />
          <View style={{ flex: 1 }}>
            <Text style={s.alertBannerTitle}>{alertCount} Re-Arrest Alert{alertCount > 1 ? "s" : ""}</Text>
            <Text style={s.alertBannerText} numberOfLines={1}>
              {clients.filter((c) => ["ALERT", "alert", "Re-Arrested"].includes(c.status ?? "") || (c.isReArrested ?? c.is_rearrested))
                .map((c) => c.name ?? c.client_name ?? c.full_name ?? "Unknown").join(", ")}
            </Text>
          </View>
        </View>
      )}

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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
        {RISK_FILTERS.map((rf) => (
          <TouchableOpacity
            key={rf}
            style={[s.filterChip, riskFilter === rf && s.filterChipActive]}
            onPress={() => handleRiskFilter(rf)}
          >
            <Text style={[s.filterChipText, riskFilter === rf && s.filterChipTextActive]}>{rf}</Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={Colors.blue} />}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="shield-checkmark-outline" size={48} color={Colors.green} />
              <Text style={s.emptyTitle}>All Clear</Text>
              <Text style={s.emptyText}>No clients to monitor.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const name = item.name ?? item.client_name ?? item.full_name ?? "Unknown"
            const caseNumber = item.caseNumber ?? item.case_number ?? item.booking_number ?? ""
            const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"
            const acColor = avatarColor(name)
            const status = item.status ?? "Active"
            const sc = STATUS_COLORS[status] ?? { bg: Colors.mutedDim + "18", text: Colors.mutedDim }
            const riskLevel = item.riskLevel ?? item.risk_level ?? "Low"
            const riskScore = item.riskScore ?? item.risk_score ?? 0
            const riskColor = RISK_COLORS[riskLevel] ?? Colors.muted
            const isReArrested = item.isReArrested ?? item.is_rearrested ?? false
            const isAlert = ["ALERT", "Re-Arrested"].includes(status) || isReArrested
            const lastCheck = item.lastCheck ?? item.last_check ?? item.updated_at ?? ""
            const coverage: string[] = Array.isArray(item.coverage) ? item.coverage : []

            return (
              <TouchableOpacity style={[s.card, isAlert && s.cardAlert]} activeOpacity={0.8}>
                <View style={s.cardTop}>
                  <View style={[s.avatar, { backgroundColor: acColor + "22" }]}>
                    <Text style={[s.avatarText, { color: acColor }]}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={s.clientName}>{name}</Text>
                      {isReArrested && (
                        <View style={s.rearrestedBadge}>
                          <Text style={s.rearrestedText}>RE-ARRESTED</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.metaInline}>
                      {!!caseNumber && <Text style={s.caseNum}>#{caseNumber}</Text>}
                      {!!item.county && <Text style={s.county}>{item.county}</Text>}
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.statusText, { color: sc.text }]}>{status}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[s.riskLabel, { color: riskColor }]}>{riskLevel}</Text>
                      {riskScore > 0 && (
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
                  <TouchableOpacity style={s.actionBtn} onPress={() => {
                    const phone = item.phone ?? item.contact_phone ?? ""
                    if (phone) Linking.openURL(`tel:${phone}`)
                  }}>
                    <Ionicons name="call-outline" size={14} color={Colors.mutedDim} />
                  </TouchableOpacity>
                  {isAlert && (
                    <TouchableOpacity style={s.resolveBtn} onPress={() => handleResolve(item)} disabled={resolvingId === item.id}>
                      {resolvingId === item.id
                        ? <ActivityIndicator size="small" color={Colors.green} />
                        : <Text style={s.resolveBtnText}>Clear</Text>
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
  kpiValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold },
  kpiLabel: { fontSize: 9, fontFamily: Font.semibold, marginTop: 3, textAlign: "center", color: Colors.mutedDim },
  alertBanner: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginHorizontal: Spacing.xl, marginBottom: Spacing.md, backgroundColor: Colors.red + "12", borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.red + "30", padding: Spacing.lg },
  alertBannerTitle: { fontSize: FontSize.sm, color: Colors.red, fontFamily: Font.bold },
  alertBannerText: { fontSize: FontSize.xs, color: Colors.red + "aa", marginTop: 2 },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, height: 44 },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm },
  filterScroll: { marginBottom: Spacing.md, height: 38 },
  filterRow: { paddingHorizontal: Spacing.xl, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.xl, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  filterChipText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  filterChipTextActive: { color: Colors.text },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.bold },
  emptyText: { fontSize: FontSize.sm, color: Colors.mutedDim },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  cardAlert: { borderColor: Colors.red + "50", borderLeftWidth: 3, borderLeftColor: Colors.red },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md, marginBottom: Spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: FontSize.md, fontFamily: Font.extrabold },
  clientName: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  rearrestedBadge: { backgroundColor: Colors.red + "20", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  rearrestedText: { fontSize: 9, color: Colors.red, fontFamily: Font.bold, letterSpacing: 0.5 },
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
