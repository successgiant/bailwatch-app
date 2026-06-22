import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Colors, FontSize, Radius, Spacing } from "../constants/theme"

const TABS = ["Available", "Used", "Expiring", "Expired", "Voided"]

const POWERS = [
  { id: "1", power: "ACE-100142", surety: "Accredited Surety", amount: "$25,000", prefix: "ACE", expiry: "Dec 31, 2026", status: "Available", daysLeft: null },
  { id: "2", power: "ACE-100143", surety: "Accredited Surety", amount: "$25,000", prefix: "ACE", expiry: "Dec 31, 2026", status: "Available", daysLeft: null },
  { id: "3", power: "BIG-200201", surety: "BigCo Surety", amount: "$10,000", prefix: "BIG", expiry: "Jul 15, 2026", status: "Expiring", daysLeft: 23 },
  { id: "4", power: "BIG-200202", surety: "BigCo Surety", amount: "$10,000", prefix: "BIG", expiry: "Jul 15, 2026", status: "Expiring", daysLeft: 23 },
  { id: "5", power: "ACE-100099", surety: "Accredited Surety", amount: "$50,000", prefix: "ACE", expiry: "Jun 1, 2026", status: "Expired", daysLeft: null },
  { id: "6", power: "ACE-100100", surety: "Accredited Surety", amount: "$15,000", prefix: "ACE", expiry: "May 20, 2026", status: "Used", daysLeft: null },
]

const INVENTORY = [
  { surety: "Accredited Surety", amounts: [{ val: "$25,000", count: 8 }, { val: "$10,000", count: 4 }, { val: "$5,000", count: 12 }] },
  { surety: "BigCo Surety", amounts: [{ val: "$10,000", count: 2 }, { val: "$5,000", count: 6 }] },
]

const STATUS_COLORS: Record<string, string> = {
  Available: Colors.green,
  Used: Colors.blueBright,
  Expiring: Colors.gold,
  Expired: Colors.red,
  Voided: Colors.mutedDim,
}

export function PowersScreen() {
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Powers</Text>
          <Text style={s.subtitle}>Surety Bond Powers</Text>
        </View>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Inventory Summary */}
      <View style={s.inventoryWrap}>
        <Text style={s.inventoryTitle}>Inventory Summary</Text>
        {INVENTORY.map((inv) => (
          <View key={inv.surety} style={s.invRow}>
            <Text style={s.invSurety}>{inv.surety}</Text>
            <View style={s.invAmounts}>
              {inv.amounts.map((a) => (
                <View key={a.val} style={s.invChip}>
                  <Text style={s.invVal}>{a.val}</Text>
                  <View style={s.invCount}><Text style={s.invCountText}>{a.count}</Text></View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} style={[s.tab, i === 0 && s.tabActive]}>
            <Text style={[s.tabText, i === 0 && s.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={POWERS}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => {
          const sc = STATUS_COLORS[item.status] ?? Colors.muted
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.powerNum}>{item.power}</Text>
                  <Text style={s.surety}>{item.surety}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: sc + "22" }]}>
                  <Text style={[s.badgeText, { color: sc }]}>{item.status}</Text>
                </View>
              </View>
              <View style={s.meta}>
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>Face Amount</Text>
                  <Text style={[s.metaVal, { color: Colors.blueBright }]}>{item.amount}</Text>
                </View>
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>Prefix</Text>
                  <Text style={s.metaVal}>{item.prefix}</Text>
                </View>
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>Expiry</Text>
                  <Text style={[s.metaVal, { color: item.status === "Expiring" ? Colors.gold : item.status === "Expired" ? Colors.red : Colors.text }]}>{item.expiry}</Text>
                </View>
                {item.daysLeft && (
                  <View style={s.metaItem}>
                    <Text style={s.metaLabel}>Days Left</Text>
                    <Text style={[s.metaVal, { color: Colors.gold }]}>{item.daysLeft}d</Text>
                  </View>
                )}
              </View>
              {item.status === "Available" && (
                <View style={s.voidRow}>
                  <TouchableOpacity style={s.voidBtn}>
                    <Ionicons name="close-circle-outline" size={14} color={Colors.red} />
                    <Text style={s.voidText}>Void</Text>
                  </TouchableOpacity>
                </View>
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
  addBtn: { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Colors.blue, alignItems: "center", justifyContent: "center" },
  inventoryWrap: { marginHorizontal: Spacing.xl, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.lg, marginBottom: Spacing.lg },
  inventoryTitle: { fontSize: FontSize.xs, color: Colors.mutedDim, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md },
  invRow: { marginBottom: Spacing.sm },
  invSurety: { fontSize: FontSize.xs, color: Colors.muted, fontWeight: "600", marginBottom: 6 },
  invAmounts: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  invChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(70,120,190,0.1)", borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  invVal: { fontSize: FontSize.xs, color: Colors.text, fontWeight: "600" },
  invCount: { backgroundColor: Colors.green + "22", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  invCountText: { fontSize: 10, color: Colors.green, fontWeight: "700" },
  tabRow: { flexDirection: "row", paddingHorizontal: Spacing.xl, marginBottom: Spacing.md, gap: 6 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)" },
  tabActive: { backgroundColor: Colors.blue + "22", borderColor: Colors.blue + "66" },
  tabText: { fontSize: FontSize.xs, color: Colors.mutedDim, fontWeight: "600" },
  tabTextActive: { color: Colors.blueBright },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.lg },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: Spacing.md },
  powerNum: { fontSize: FontSize.md, color: Colors.blueBright, fontWeight: "700", fontVariant: ["tabular-nums"] },
  surety: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  badgeText: { fontSize: 10, fontWeight: "700" },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  metaItem: { minWidth: 90 },
  metaLabel: { fontSize: 9, color: Colors.mutedDim, fontWeight: "600", textTransform: "uppercase", marginBottom: 2 },
  metaVal: { fontSize: FontSize.sm, color: Colors.text, fontWeight: "600" },
  voidRow: { borderTopWidth: 1, borderTopColor: "rgba(70,120,190,0.1)", marginTop: Spacing.md, paddingTop: Spacing.md },
  voidBtn: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  voidText: { fontSize: FontSize.xs, color: Colors.red, fontWeight: "700" },
})
