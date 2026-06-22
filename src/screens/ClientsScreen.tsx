import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Colors, FontSize, Radius, Spacing } from "../constants/theme"

const CLIENTS = [
  { id: "1", name: "Marcus Thompson", case: "BWP-2024-001", county: "Dallas County", status: "Active", bond: "$15,000", next_hearing: "Jun 24" },
  { id: "2", name: "James Rivera", case: "BWP-2024-002", county: "Tarrant County", status: "Alert", bond: "$25,000", next_hearing: "Jun 27" },
  { id: "3", name: "Sara Mitchell", case: "BWP-2024-003", county: "Travis County", status: "Active", bond: "$10,000", next_hearing: "Jul 3" },
  { id: "4", name: "David Kim", case: "BWP-2024-004", county: "Harris County", status: "Pending", bond: "$8,500", next_hearing: "Jul 8" },
  { id: "5", name: "Angela Foster", case: "BWP-2024-005", county: "Bexar County", status: "Active", bond: "$12,000", next_hearing: "Jul 12" },
  { id: "6", name: "Robert Hayes", case: "BWP-2024-006", county: "Dallas County", status: "Closed", bond: "$5,000", next_hearing: "—" },
]

const STATUS_COLORS: Record<string, string> = {
  Active: Colors.green,
  Alert: Colors.red,
  Pending: Colors.gold,
  Closed: Colors.mutedDim,
}

export function ClientsScreen() {
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>ClientCase</Text>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Search clients..."
          placeholderTextColor={Colors.mutedDim}
        />
      </View>

      <FlatList
        data={CLIENTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status] ?? Colors.mutedDim
          return (
            <TouchableOpacity style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{item.name[0]}</Text>
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.clientName}>{item.name}</Text>
                  <Text style={s.caseNum}>{item.case}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: statusColor + "22" }]}>
                  <Text style={[s.badgeText, { color: statusColor }]}>{item.status}</Text>
                </View>
              </View>
              <View style={s.cardMeta}>
                <View style={s.metaItem}>
                  <Ionicons name="location-outline" size={12} color={Colors.mutedDim} />
                  <Text style={s.metaText}>{item.county}</Text>
                </View>
                <View style={s.metaItem}>
                  <Ionicons name="cash-outline" size={12} color={Colors.mutedDim} />
                  <Text style={s.metaText}>{item.bond}</Text>
                </View>
                <View style={s.metaItem}>
                  <Ionicons name="calendar-outline" size={12} color={Colors.mutedDim} />
                  <Text style={s.metaText}>{item.next_hearing}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  title: { fontSize: FontSize.xl, color: Colors.text, fontWeight: "800" },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(70,120,190,0.2)",
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(70,120,190,0.18)",
    padding: Spacing.lg,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(47,147,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: FontSize.md, color: Colors.blueBright, fontWeight: "700" },
  cardInfo: { flex: 1 },
  clientName: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700" },
  caseNum: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.sm },
  badgeText: { fontSize: FontSize.xs, fontWeight: "700" },
  cardMeta: { flexDirection: "row", gap: Spacing.lg },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.mutedDim },
})
