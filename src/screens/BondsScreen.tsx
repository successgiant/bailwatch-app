import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Colors, FontSize, Radius, Spacing } from "../constants/theme"

const BONDS = [
  { id: "1", defendant: "Marcus Thompson", amount: "$15,000", premium: "$1,500", county: "Dallas County", status: "Active", issued: "Jan 10, 2024" },
  { id: "2", defendant: "James Rivera", amount: "$25,000", premium: "$2,500", county: "Tarrant County", status: "Alert", issued: "Feb 3, 2024" },
  { id: "3", defendant: "Sara Mitchell", amount: "$10,000", premium: "$1,000", county: "Travis County", status: "Active", issued: "Mar 15, 2024" },
  { id: "4", defendant: "David Kim", amount: "$8,500", premium: "$850", county: "Harris County", status: "Pending", issued: "Apr 22, 2024" },
  { id: "5", defendant: "Angela Foster", amount: "$12,000", premium: "$1,200", county: "Bexar County", status: "Active", issued: "May 1, 2024" },
]

const STATUS_COLORS: Record<string, string> = {
  Active: Colors.green,
  Alert: Colors.red,
  Pending: Colors.gold,
  Exonerated: Colors.mutedDim,
}

export function BondsScreen() {
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>Bonds</Text>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Summary row */}
      <View style={s.summaryRow}>
        {[
          { label: "Active", value: "3", color: Colors.green },
          { label: "Alert", value: "1", color: Colors.red },
          { label: "Pending", value: "1", color: Colors.gold },
          { label: "Total Value", value: "$70.5k", color: Colors.blueBright },
        ].map((item) => (
          <View key={item.label} style={s.summaryCard}>
            <Text style={[s.summaryValue, { color: item.color }]}>{item.value}</Text>
            <Text style={s.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Search bonds..."
          placeholderTextColor={Colors.mutedDim}
        />
      </View>

      <FlatList
        data={BONDS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status] ?? Colors.mutedDim
          return (
            <TouchableOpacity style={s.card}>
              <View style={s.cardTop}>
                <View style={s.cardLeft}>
                  <Text style={s.defendantName}>{item.defendant}</Text>
                  <View style={s.metaRow}>
                    <Ionicons name="location-outline" size={12} color={Colors.mutedDim} />
                    <Text style={s.metaText}>{item.county}</Text>
                  </View>
                </View>
                <View style={[s.badge, { backgroundColor: statusColor + "22" }]}>
                  <Text style={[s.badgeText, { color: statusColor }]}>{item.status}</Text>
                </View>
              </View>
              <View style={s.divider} />
              <View style={s.cardBottom}>
                <View style={s.amountBlock}>
                  <Text style={s.amountLabel}>Bond Amount</Text>
                  <Text style={s.amountValue}>{item.amount}</Text>
                </View>
                <View style={s.amountBlock}>
                  <Text style={s.amountLabel}>Premium</Text>
                  <Text style={[s.amountValue, { color: Colors.green }]}>{item.premium}</Text>
                </View>
                <View style={s.amountBlock}>
                  <Text style={s.amountLabel}>Issued</Text>
                  <Text style={s.amountValue}>{item.issued}</Text>
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
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(70,120,190,0.18)",
    padding: Spacing.md,
    alignItems: "center",
  },
  summaryValue: { fontSize: FontSize.xl, fontWeight: "800" },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 2, textAlign: "center" },
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
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(70,120,190,0.18)",
    padding: Spacing.lg,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  cardLeft: { flex: 1 },
  defendantName: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700", marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.mutedDim },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.sm },
  badgeText: { fontSize: FontSize.xs, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "rgba(70,120,190,0.12)", marginVertical: Spacing.md },
  cardBottom: { flexDirection: "row" },
  amountBlock: { flex: 1 },
  amountLabel: { fontSize: FontSize.xs, color: Colors.mutedDim, marginBottom: 2 },
  amountValue: { fontSize: FontSize.sm, color: Colors.text, fontWeight: "600" },
})
