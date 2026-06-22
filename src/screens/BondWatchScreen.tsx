import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Colors, FontSize, Radius, Spacing } from "../constants/theme"

const KPI = [
  { label: "Monitored", value: "214", color: Colors.blueBright },
  { label: "Alerts Today", value: "3", color: Colors.red },
  { label: "ALERT Status", value: "2", color: Colors.red },
  { label: "Cleared/Week", value: "8", color: Colors.green },
]

const CLIENTS = [
  { id: "1", name: "James Rivera", case: "BWP-2024-002", county: "Dallas County", status: "ALERT", coverage: ["Dallas", "Tarrant"], lastCheck: "2h ago" },
  { id: "2", name: "Angela Foster", case: "BWP-2024-005", county: "Harris County", status: "ALERT", coverage: ["Harris"], lastCheck: "4h ago" },
  { id: "3", name: "Marcus Thompson", case: "BWP-2024-001", county: "Dallas County", status: "Active Bond", coverage: ["Dallas", "Collin", "Denton"], lastCheck: "1h ago" },
  { id: "4", name: "Sara Mitchell", case: "BWP-2024-003", county: "Travis County", status: "Active Bond", coverage: ["Travis", "Williamson"], lastCheck: "30m ago" },
  { id: "5", name: "David Kim", case: "BWP-2024-004", county: "Harris County", status: "Active Bond", coverage: ["Harris", "Fort Bend"], lastCheck: "3h ago" },
]

export function BondWatchScreen() {
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>BondWatch</Text>
          <Text style={s.subtitle}>Client Monitoring</Text>
        </View>
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
        <View style={s.alertBannerIcon}>
          <Ionicons name="warning" size={18} color={Colors.red} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.alertBannerTitle}>2 clients re-arrested</Text>
          <Text style={s.alertBannerSub}>James Rivera · Angela Foster — review required</Text>
        </View>
        <TouchableOpacity>
          <Text style={s.alertBannerLink}>Review</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
        <TextInput style={s.searchInput} placeholder="Search clients..." placeholderTextColor={Colors.mutedDim} />
      </View>

      <FlatList
        data={CLIENTS}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const isAlert = item.status === "ALERT"
          return (
            <View style={[s.card, isAlert && s.cardAlert]}>
              <View style={s.cardTop}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{item.name[0]}</Text>
                </View>
                <View style={s.info}>
                  <Text style={s.cname}>{item.name}</Text>
                  <Text style={s.sub}>{item.case} · {item.county}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: isAlert ? Colors.red + "22" : Colors.green + "22" }]}>
                  <Text style={[s.badgeText, { color: isAlert ? Colors.red : Colors.green }]}>{item.status}</Text>
                </View>
              </View>
              <View style={s.cardMeta}>
                <View style={s.metaItem}>
                  <Ionicons name="map-outline" size={12} color={Colors.mutedDim} />
                  <Text style={s.metaText}>{item.coverage.join(", ")}</Text>
                </View>
                <View style={s.metaItem}>
                  <Ionicons name="time-outline" size={12} color={Colors.mutedDim} />
                  <Text style={s.metaText}>Checked {item.lastCheck}</Text>
                </View>
              </View>
              {isAlert && (
                <TouchableOpacity style={s.reviewBtn}>
                  <Ionicons name="eye-outline" size={14} color={Colors.red} />
                  <Text style={s.reviewText}>Mark as Reviewed</Text>
                </TouchableOpacity>
              )}
            </View>
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
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.xl, fontWeight: "800" },
  kpiLabel: { fontSize: 10, color: Colors.mutedDim, marginTop: 2, textAlign: "center" },
  alertBanner: { flexDirection: "row", alignItems: "center", marginHorizontal: Spacing.xl, marginBottom: Spacing.md, backgroundColor: Colors.red + "14", borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.red + "33", padding: Spacing.md, gap: Spacing.md },
  alertBannerIcon: { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Colors.red + "22", alignItems: "center", justifyContent: "center" },
  alertBannerTitle: { fontSize: FontSize.sm, color: Colors.red, fontWeight: "700" },
  alertBannerSub: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 1 },
  alertBannerLink: { fontSize: FontSize.xs, color: Colors.red, fontWeight: "700" },
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)", paddingHorizontal: Spacing.md, height: 42, gap: Spacing.sm },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.lg },
  cardAlert: { borderColor: Colors.red + "55", borderLeftWidth: 3, borderLeftColor: Colors.red },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(47,147,255,0.15)", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: FontSize.md, color: Colors.blueBright, fontWeight: "700" },
  info: { flex: 1 },
  cname: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700" },
  sub: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.sm },
  badgeText: { fontSize: FontSize.xs, fontWeight: "700" },
  cardMeta: { flexDirection: "row", gap: Spacing.lg },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.mutedDim },
  reviewBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.red + "33" },
  reviewText: { fontSize: FontSize.xs, color: Colors.red, fontWeight: "700" },
})
