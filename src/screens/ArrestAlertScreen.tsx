import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Colors, FontSize, Radius, Spacing } from "../constants/theme"

const BOOKINGS = [
  { id: "1", name: "Robert Hayes", age: 34, gender: "M", county: "Dallas County", charge: "Assault / Family Violence", bond: "$15,000", type: "CASH", time: "1h ago", isNew: true, isMatch: false },
  { id: "2", name: "Tasha Williams", age: 28, gender: "F", county: "Harris County", charge: "Theft > $2,500", bond: "$5,000", type: "SURETY", time: "2h ago", isNew: true, isMatch: true },
  { id: "3", name: "Carlos Mendez", age: 41, gender: "M", county: "Bexar County", charge: "DWI (2nd Offense)", bond: "$10,000", type: "SURETY", time: "3h ago", isNew: false, isMatch: false },
  { id: "4", name: "Deon Jackson", age: 22, gender: "M", county: "Tarrant County", charge: "Possession of Controlled Substance", bond: "$3,500", type: "CASH", time: "4h ago", isNew: false, isMatch: false },
  { id: "5", name: "Maria Torres", age: 31, gender: "F", county: "Travis County", charge: "Burglary of Habitation", bond: "$25,000", type: "SURETY", time: "5h ago", isNew: false, isMatch: true },
]

export function ArrestAlertScreen() {
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>ArrestAlert</Text>
          <Text style={s.subtitle}>Live Booking Feed</Text>
        </View>
        <View style={s.liveBadge}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
        <TextInput style={s.searchInput} placeholder="Search bookings..." placeholderTextColor={Colors.mutedDim} />
      </View>

      <View style={s.filterRow}>
        {["All Counties", "Last 24h", "All Charges"].map((f) => (
          <TouchableOpacity key={f} style={s.filterChip}>
            <Text style={s.filterText}>{f}</Text>
            <Ionicons name="chevron-down" size={12} color={Colors.mutedDim} />
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <Text style={s.countText}>{BOOKINGS.length} bookings</Text>
      </View>

      <FlatList
        data={BOOKINGS}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardHeader}>
              {/* Mugshot placeholder */}
              <View style={s.mugshot}>
                <Ionicons name="person-outline" size={26} color={Colors.mutedDim} />
              </View>
              <View style={s.cardInfo}>
                <View style={s.nameRow}>
                  <Text style={s.name}>{item.name}</Text>
                  {item.isNew && <View style={s.newBadge}><Text style={s.newText}>NEW</Text></View>}
                  {item.isMatch && <View style={s.matchBadge}><Text style={s.matchText}>MATCH</Text></View>}
                </View>
                <Text style={s.meta}>{item.age} · {item.gender} · {item.county}</Text>
                <Text style={s.charge}>{item.charge}</Text>
              </View>
              <Text style={s.time}>{item.time}</Text>
            </View>
            <View style={s.cardBottom}>
              <View style={s.bondInfo}>
                <Text style={s.bondAmount}>{item.bond}</Text>
                <View style={[s.typeBadge, { backgroundColor: item.type === "SURETY" ? Colors.blue + "22" : Colors.gold + "22" }]}>
                  <Text style={[s.typeText, { color: item.type === "SURETY" ? Colors.blueBright : Colors.gold }]}>{item.type}</Text>
                </View>
              </View>
              <View style={s.actions}>
                <TouchableOpacity style={s.actionBtn}>
                  <Ionicons name="bookmark-outline" size={18} color={Colors.mutedDim} />
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn}>
                  <Ionicons name="eye-outline" size={18} color={Colors.mutedDim} />
                </TouchableOpacity>
                <TouchableOpacity style={s.addClientBtn}>
                  <Ionicons name="person-add-outline" size={14} color="#fff" />
                  <Text style={s.addClientText}>Add Client</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  title: { fontSize: FontSize.xl, color: Colors.text, fontWeight: "800" },
  subtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.red + "18", paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.red + "44" },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.red },
  liveText: { fontSize: FontSize.xs, color: Colors.red, fontWeight: "700" },
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)", paddingHorizontal: Spacing.md, height: 42, gap: Spacing.sm },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  filterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.xl, marginBottom: Spacing.md, gap: 8 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.bgCard, borderRadius: Radius.sm, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)", paddingHorizontal: 10, paddingVertical: 5 },
  filterText: { fontSize: FontSize.xs, color: Colors.muted },
  countText: { fontSize: FontSize.xs, color: Colors.mutedDim },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.lg },
  cardHeader: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.md },
  mugshot: { width: 52, height: 68, borderRadius: Radius.md, backgroundColor: "rgba(70,120,190,0.1)", alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)" },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 },
  name: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700" },
  newBadge: { backgroundColor: Colors.green + "22", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newText: { fontSize: 9, color: Colors.green, fontWeight: "800" },
  matchBadge: { backgroundColor: Colors.blue + "22", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  matchText: { fontSize: 9, color: Colors.blueBright, fontWeight: "800" },
  meta: { fontSize: FontSize.xs, color: Colors.mutedDim, marginBottom: 3 },
  charge: { fontSize: FontSize.sm, color: Colors.muted },
  time: { fontSize: 10, color: Colors.mutedDim, flexShrink: 0 },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bondInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  bondAmount: { fontSize: FontSize.lg, color: Colors.text, fontWeight: "700" },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  typeText: { fontSize: 10, fontWeight: "700" },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: "rgba(70,120,190,0.1)", alignItems: "center", justifyContent: "center" },
  addClientBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.blue, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.sm },
  addClientText: { fontSize: FontSize.xs, color: "#fff", fontWeight: "700" },
})
