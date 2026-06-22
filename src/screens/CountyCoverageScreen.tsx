import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Colors, FontSize, Radius, Spacing } from "../constants/theme"

const COUNTIES = [
  { id: "1", county: "Dallas County", state: "TX", status: "Active", clients: 24, bonds: 18 },
  { id: "2", county: "Harris County", state: "TX", status: "Active", clients: 19, bonds: 14 },
  { id: "3", county: "Tarrant County", state: "TX", status: "Active", clients: 14, bonds: 11 },
  { id: "4", county: "Travis County", state: "TX", status: "Active", clients: 10, bonds: 8 },
  { id: "5", county: "Bexar County", state: "TX", status: "Pending", clients: 0, bonds: 0 },
  { id: "6", county: "Collin County", state: "TX", status: "Pending", clients: 0, bonds: 0 },
  { id: "7", county: "El Paso County", state: "TX", status: "Active", clients: 6, bonds: 4 },
]

const KPI = [
  { label: "Active Counties", value: "5", color: Colors.green },
  { label: "Pending", value: "2", color: Colors.gold },
  { label: "Total Clients", value: "73", color: Colors.blueBright },
  { label: "Active Bonds", value: "55", color: Colors.text },
]

export function CountyCoverageScreen() {
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>County Coverage</Text>
          <Text style={s.subtitle}>Assigned Counties</Text>
        </View>
        <TouchableOpacity style={s.requestBtn}>
          <Ionicons name="add" size={16} color={Colors.blueBright} />
          <Text style={s.requestText}>Request</Text>
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

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
        <TextInput style={s.searchInput} placeholder="Search counties..." placeholderTextColor={Colors.mutedDim} />
      </View>

      <FlatList
        data={COUNTIES}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => {
          const isActive = item.status === "Active"
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={[s.mapIcon, { backgroundColor: isActive ? Colors.blue + "18" : Colors.gold + "14" }]}>
                  <Ionicons name="location-outline" size={20} color={isActive ? Colors.blue : Colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.countyName}>{item.county}</Text>
                  <Text style={s.stateName}>{item.state}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: isActive ? Colors.green + "22" : Colors.gold + "22" }]}>
                  <Text style={[s.badgeText, { color: isActive ? Colors.green : Colors.gold }]}>{item.status}</Text>
                </View>
              </View>
              {isActive && (
                <View style={s.countyMeta}>
                  <View style={s.metaItem}>
                    <Ionicons name="people-outline" size={12} color={Colors.mutedDim} />
                    <Text style={s.metaText}>{item.clients} clients</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Ionicons name="shield-outline" size={12} color={Colors.mutedDim} />
                    <Text style={s.metaText}>{item.bonds} bonds</Text>
                  </View>
                </View>
              )}
              {!isActive && (
                <Text style={s.pendingNote}>Coverage request pending approval</Text>
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
  requestBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.md, backgroundColor: Colors.blue + "18", borderWidth: 1, borderColor: Colors.blue + "33" },
  requestText: { fontSize: FontSize.xs, color: Colors.blueBright, fontWeight: "700" },
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.xl, fontWeight: "800" },
  kpiLabel: { fontSize: 9, color: Colors.mutedDim, marginTop: 1, textAlign: "center" },
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)", paddingHorizontal: Spacing.md, height: 42, gap: Spacing.sm },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.lg },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.sm },
  mapIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  countyName: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700" },
  stateName: { fontSize: FontSize.xs, color: Colors.mutedDim },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  badgeText: { fontSize: 10, fontWeight: "700" },
  countyMeta: { flexDirection: "row", gap: Spacing.lg, paddingLeft: 52 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.mutedDim },
  pendingNote: { fontSize: FontSize.xs, color: Colors.gold, paddingLeft: 52, fontStyle: "italic" },
})
