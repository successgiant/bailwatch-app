import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Colors, FontSize, Radius, Spacing } from "../constants/theme"

const KPI = [
  { label: "Tracked", value: "12", color: Colors.blueBright },
  { label: "Active", value: "9", color: Colors.green },
  { label: "Alerts", value: "2", color: Colors.red },
  { label: "Geofence Breaks", value: "1", color: Colors.gold },
]

const TRACKED = [
  { id: "1", name: "Marcus Thompson", case: "BWP-001", status: "Active", lastSeen: "Dallas, TX", distance: "0.2 mi from home", lastCheck: "5m ago", alert: false },
  { id: "2", name: "James Rivera", case: "BWP-002", status: "Alert", lastSeen: "Unknown location", distance: "Geofence breach", lastCheck: "2h ago", alert: true },
  { id: "3", name: "Sara Mitchell", case: "BWP-003", status: "Active", lastSeen: "Austin, TX", distance: "0.8 mi from home", lastCheck: "12m ago", alert: false },
  { id: "4", name: "David Kim", case: "BWP-004", status: "Missed Check-In", lastSeen: "Houston, TX", distance: "No response 24h", lastCheck: "24h ago", alert: true },
  { id: "5", name: "Angela Foster", case: "BWP-005", status: "Active", lastSeen: "San Antonio, TX", distance: "1.2 mi from home", lastCheck: "20m ago", alert: false },
]

const STATUS_COLORS: Record<string, string> = {
  Active: Colors.green,
  Alert: Colors.red,
  "Missed Check-In": Colors.gold,
  Inactive: Colors.mutedDim,
}

export function BondTrackScreen() {
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>BondTrack GPS</Text>
          <Text style={s.subtitle}>Real-Time Monitoring</Text>
        </View>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* KPI */}
      <View style={s.kpiRow}>
        {KPI.map((k) => (
          <View key={k.label} style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* Alert Banner */}
      <View style={s.alertBanner}>
        <Ionicons name="warning" size={16} color={Colors.red} />
        <Text style={s.alertText}>James Rivera — Geofence breach detected 2h ago</Text>
        <TouchableOpacity><Text style={s.alertAction}>View</Text></TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
        <TextInput style={s.searchInput} placeholder="Search tracked clients..." placeholderTextColor={Colors.mutedDim} />
      </View>

      <FlatList
        data={TRACKED}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const sc = STATUS_COLORS[item.status] ?? Colors.muted
          return (
            <TouchableOpacity style={[s.card, item.alert && s.cardAlert]}>
              <View style={s.cardTop}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{item.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cname}>{item.name}</Text>
                  <Text style={s.sub}>{item.case}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: sc + "22" }]}>
                  <Text style={[s.badgeText, { color: sc }]}>{item.status}</Text>
                </View>
              </View>

              <View style={s.locationRow}>
                <View style={s.locationItem}>
                  <Ionicons name="location-outline" size={14} color={item.alert ? Colors.red : Colors.blue} />
                  <Text style={[s.locationText, { color: item.alert ? Colors.red : Colors.muted }]}>{item.lastSeen}</Text>
                </View>
                <View style={s.locationItem}>
                  <Ionicons name="navigate-outline" size={14} color={Colors.mutedDim} />
                  <Text style={s.locationSubtext}>{item.distance}</Text>
                </View>
              </View>

              <View style={s.footer}>
                <View style={s.footerLeft}>
                  <Ionicons name="time-outline" size={12} color={Colors.mutedDim} />
                  <Text style={s.footerText}>Last seen: {item.lastCheck}</Text>
                </View>
                <View style={s.footerActions}>
                  <TouchableOpacity style={s.actionBtn}>
                    <Ionicons name="map-outline" size={16} color={Colors.blueBright} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionBtn}>
                    <Ionicons name="call-outline" size={16} color={Colors.mutedDim} />
                  </TouchableOpacity>
                  {item.alert && (
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
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  title: { fontSize: FontSize.xl, color: Colors.text, fontWeight: "800" },
  subtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  addBtn: { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Colors.blue, alignItems: "center", justifyContent: "center" },
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.xl, fontWeight: "800" },
  kpiLabel: { fontSize: 9, color: Colors.mutedDim, marginTop: 1, textAlign: "center" },
  alertBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: Spacing.xl, marginBottom: Spacing.md, backgroundColor: Colors.red + "14", borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.red + "33", padding: Spacing.md },
  alertText: { flex: 1, fontSize: FontSize.xs, color: Colors.red, fontWeight: "500" },
  alertAction: { fontSize: FontSize.xs, color: Colors.red, fontWeight: "700" },
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)", paddingHorizontal: Spacing.md, height: 42, gap: Spacing.sm },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.lg },
  cardAlert: { borderColor: Colors.red + "55", borderLeftWidth: 3, borderLeftColor: Colors.red },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(47,147,255,0.15)", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: FontSize.md, color: Colors.blueBright, fontWeight: "700" },
  cname: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700" },
  sub: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  badgeText: { fontSize: 10, fontWeight: "700" },
  locationRow: { gap: 6, marginBottom: Spacing.md, paddingLeft: 2 },
  locationItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationText: { fontSize: FontSize.sm, fontWeight: "500" },
  locationSubtext: { fontSize: FontSize.xs, color: Colors.mutedDim },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(70,120,190,0.1)", paddingTop: Spacing.md },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: FontSize.xs, color: Colors.mutedDim },
  footerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: "rgba(70,120,190,0.1)", alignItems: "center", justifyContent: "center" },
  resolveBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm, backgroundColor: Colors.green + "18", borderWidth: 1, borderColor: Colors.green + "33" },
  resolveText: { fontSize: FontSize.xs, color: Colors.green, fontWeight: "700" },
})
