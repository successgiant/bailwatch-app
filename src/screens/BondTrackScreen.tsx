import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

const STATUS_COLORS: Record<string, string> = {
  active: Colors.green, Active: Colors.green,
  alert: Colors.red, Alert: Colors.red,
  "missed check-in": Colors.gold, missed_checkin: Colors.gold,
  inactive: Colors.mutedDim, Inactive: Colors.mutedDim,
}

export function BondTrackScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [tracked, setTracked] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!identity) return
    api.bondtrack(identity).then((res: any) => {
      const list = res?.results ?? res?.data ?? res
      setTracked(Array.isArray(list) ? list : [])
      setFiltered(Array.isArray(list) ? list : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [identity])

  const handleSearch = (text: string) => {
    setQuery(text)
    if (!text.trim()) { setFiltered(tracked); return }
    const q = text.toLowerCase()
    setFiltered(tracked.filter(t => (t.full_name ?? t.name ?? t.client_name ?? "").toLowerCase().includes(q)))
  }

  const alertItems = tracked.filter(t => ["VIOLATION", "alert", "Alert"].includes(t.status ?? "") || t.has_alert)
  const activeItems = tracked.filter(t => ["ACTIVE", "active", "Active"].includes(t.status ?? ""))

  const kpis = [
    { label: "Tracked", value: String(tracked.length), color: Colors.blueBright },
    { label: "Active", value: String(activeItems.length), color: Colors.green },
    { label: "Alerts", value: String(alertItems.length), color: Colors.red },
    { label: "Geofence", value: String(tracked.filter(t => t.geofence_breach || t.geofence_alert).length), color: Colors.gold },
  ]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.green + "18", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="location-outline" size={17} color={Colors.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>BondTrack GPS</Text>
          <Text style={s.subtitle}>Real-Time Monitoring</Text>
        </View>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={s.kpiRow}>
        {kpis.map((k) => (
          <View key={k.label} style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      {alertItems.length > 0 && (
        <View style={s.alertBanner}>
          <Ionicons name="warning" size={16} color={Colors.red} />
          <Text style={s.alertText} numberOfLines={1}>
            {alertItems[0]?.full_name ?? alertItems[0]?.client_name ?? "Alert"} — Geofence breach or alert detected
          </Text>
          <TouchableOpacity><Text style={s.alertAction}>View</Text></TouchableOpacity>
        </View>
      )}

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
        <TextInput style={s.searchInput} placeholder="Search tracked clients..." placeholderTextColor={Colors.mutedDim} value={query} onChangeText={handleSearch} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id ?? Math.random())}
          contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={s.empty}>No tracked clients.</Text>}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const name = item.defendant_name ?? item.full_name ?? item.name ?? item.client_name ?? "Unknown"
            const status = item.status ?? (item.has_alert ? "Alert" : "Active")
            const sc = STATUS_COLORS[status] ?? Colors.muted
            const hasAlert = ["VIOLATION", "alert", "Alert"].includes(status) || item.has_alert || item.geofence_breach
            const lastSeen = item.location_label ?? item.last_location ?? item.last_seen_location ?? ""
            const lastCheck = item.last_seen ?? item.last_checkin ?? ""
            const caseNum = item.case_number ?? item.bond_id ?? ""
            return (
              <TouchableOpacity style={[s.card, hasAlert && s.cardAlert]}>
                <View style={s.cardTop}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{name[0]?.toUpperCase() ?? "?"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cname}>{name}</Text>
                    <Text style={s.sub}>{caseNum ? `#${caseNum}` : ""}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: sc + "22" }]}>
                    <Text style={[s.badgeText, { color: sc }]}>{status}</Text>
                  </View>
                </View>

                <View style={s.locationRow}>
                  {!!lastSeen && (
                    <View style={s.locationItem}>
                      <Ionicons name="location-outline" size={14} color={hasAlert ? Colors.red : Colors.blue} />
                      <Text style={[s.locationText, { color: hasAlert ? Colors.red : Colors.muted }]}>{lastSeen}</Text>
                    </View>
                  )}
                </View>

                <View style={s.footer}>
                  <View style={s.footerLeft}>
                    <Ionicons name="time-outline" size={12} color={Colors.mutedDim} />
                    <Text style={s.footerText}>
                      {lastCheck ? `Last: ${new Date(lastCheck).toLocaleString()}` : "No check-in data"}
                    </Text>
                  </View>
                  <View style={s.footerActions}>
                    <TouchableOpacity style={s.actionBtn}>
                      <Ionicons name="map-outline" size={16} color={Colors.blueBright} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actionBtn}>
                      <Ionicons name="call-outline" size={16} color={Colors.mutedDim} />
                    </TouchableOpacity>
                    {hasAlert && (
                      <TouchableOpacity style={s.resolveBtn}>
                        <Text style={s.resolveText}>Resolve</Text>
                      </TouchableOpacity>
                    )}
                  </View>
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.md, marginHorizontal: Spacing.xl, marginVertical: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  subtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 4 },
  addBtn: { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Colors.blue, alignItems: "center", justifyContent: "center" },
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold },
  kpiLabel: { fontSize: 9, color: Colors.mutedDim, marginTop: 1, textAlign: "center" },
  alertBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: Spacing.xl, marginBottom: Spacing.md, backgroundColor: Colors.red + "14", borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.red + "33", padding: Spacing.md },
  alertText: { flex: 1, fontSize: FontSize.xs, color: Colors.red, fontFamily: Font.medium },
  alertAction: { fontSize: FontSize.xs, color: Colors.red, fontFamily: Font.bold },
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)", paddingHorizontal: Spacing.md, height: 42, gap: Spacing.sm },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  empty: { textAlign: "center", color: Colors.mutedDim, marginTop: 40, fontSize: FontSize.md },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.lg },
  cardAlert: { borderColor: Colors.red + "55", borderLeftWidth: 3, borderLeftColor: Colors.red },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(47,147,255,0.15)", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: FontSize.md, color: Colors.blueBright, fontFamily: Font.bold },
  cname: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  sub: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  badgeText: { fontSize: 10, fontFamily: Font.bold },
  locationRow: { gap: 6, marginBottom: Spacing.md, paddingLeft: 2 },
  locationItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationText: { fontSize: FontSize.sm, fontFamily: Font.medium },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(70,120,190,0.1)", paddingTop: Spacing.md },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: FontSize.xs, color: Colors.mutedDim },
  footerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: "rgba(70,120,190,0.1)", alignItems: "center", justifyContent: "center" },
  resolveBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm, backgroundColor: Colors.green + "18", borderWidth: 1, borderColor: Colors.green + "33" },
  resolveText: { fontSize: FontSize.xs, color: Colors.green, fontFamily: Font.bold },
})
