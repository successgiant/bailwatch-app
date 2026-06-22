import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Colors, FontSize, Radius, Spacing } from "../constants/theme"

const TABS = ["All", "Sent", "Received", "Expired"]

const APPS = [
  { id: "1", name: "Robert Hayes", county: "Dallas County", status: "Received", sent: "Jun 20", signed: "Jun 21", bond: "$15,000" },
  { id: "2", name: "Tasha Williams", county: "Harris County", status: "Sent", sent: "Jun 21", signed: null, bond: "$8,000" },
  { id: "3", name: "Carlos Mendez", county: "Bexar County", status: "Received", sent: "Jun 19", signed: "Jun 20", bond: "$12,500" },
  { id: "4", name: "Deon Jackson", county: "Tarrant County", status: "Expired", sent: "Jun 10", signed: null, bond: "$5,000" },
  { id: "5", name: "Maria Torres", county: "Travis County", status: "Sent", sent: "Jun 22", signed: null, bond: "$20,000" },
]

const STATUS_COLORS: Record<string, string> = {
  Sent: Colors.gold,
  Received: Colors.green,
  Expired: Colors.red,
  Declined: Colors.red,
}

export function BondAppScreen() {
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>BondApp</Text>
          <Text style={s.subtitle}>Digital Applications</Text>
        </View>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="send-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label: "Sent", value: "24", color: Colors.gold },
          { label: "Received", value: "18", color: Colors.green },
          { label: "Awaiting", value: "6", color: Colors.blueBright },
          { label: "Expired", value: "3", color: Colors.red },
        ].map((k) => (
          <View key={k.label} style={s.statCard}>
            <Text style={[s.statValue, { color: k.color }]}>{k.value}</Text>
            <Text style={s.statLabel}>{k.label}</Text>
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

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
        <TextInput style={s.searchInput} placeholder="Search applications..." placeholderTextColor={Colors.mutedDim} />
      </View>

      <FlatList
        data={APPS}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const sc = STATUS_COLORS[item.status] ?? Colors.muted
          return (
            <TouchableOpacity style={s.card}>
              <View style={s.cardTop}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{item.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cname}>{item.name}</Text>
                  <Text style={s.sub}>{item.county}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: sc + "22" }]}>
                  <Text style={[s.badgeText, { color: sc }]}>{item.status}</Text>
                </View>
              </View>
              <View style={s.meta}>
                <View style={s.metaItem}>
                  <Ionicons name="send-outline" size={12} color={Colors.mutedDim} />
                  <Text style={s.metaText}>Sent: {item.sent}</Text>
                </View>
                {item.signed && (
                  <View style={s.metaItem}>
                    <Ionicons name="checkmark-circle-outline" size={12} color={Colors.green} />
                    <Text style={[s.metaText, { color: Colors.green }]}>Signed: {item.signed}</Text>
                  </View>
                )}
                <View style={s.metaItem}>
                  <Ionicons name="cash-outline" size={12} color={Colors.mutedDim} />
                  <Text style={s.metaText}>{item.bond}</Text>
                </View>
              </View>
              <View style={s.actions}>
                <TouchableOpacity style={s.actionBtn}>
                  <Ionicons name="eye-outline" size={14} color={Colors.blueBright} />
                  <Text style={[s.actionText, { color: Colors.blueBright }]}>View</Text>
                </TouchableOpacity>
                {item.status === "Sent" && (
                  <TouchableOpacity style={s.actionBtnPrimary}>
                    <Ionicons name="refresh-outline" size={14} color="#fff" />
                    <Text style={s.actionTextWhite}>Resend</Text>
                  </TouchableOpacity>
                )}
                {item.status === "Received" && (
                  <TouchableOpacity style={[s.actionBtnPrimary, { backgroundColor: Colors.green }]}>
                    <Ionicons name="person-add-outline" size={14} color="#fff" />
                    <Text style={s.actionTextWhite}>Add Client</Text>
                  </TouchableOpacity>
                )}
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
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  statCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.md, alignItems: "center" },
  statValue: { fontSize: FontSize.xl, fontWeight: "800" },
  statLabel: { fontSize: 9, color: Colors.mutedDim, marginTop: 1 },
  tabRow: { flexDirection: "row", paddingHorizontal: Spacing.xl, marginBottom: Spacing.md, gap: 6 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)" },
  tabActive: { backgroundColor: Colors.blue + "22", borderColor: Colors.blue + "66" },
  tabText: { fontSize: FontSize.xs, color: Colors.mutedDim, fontWeight: "600" },
  tabTextActive: { color: Colors.blueBright },
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)", paddingHorizontal: Spacing.md, height: 42, gap: Spacing.sm },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.lg },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(47,147,255,0.15)", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: FontSize.md, color: Colors.blueBright, fontWeight: "700" },
  cname: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700" },
  sub: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  badgeText: { fontSize: 10, fontWeight: "700" },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md, marginBottom: Spacing.md },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.mutedDim },
  actions: { flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: "rgba(70,120,190,0.1)", paddingTop: Spacing.md },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.sm, backgroundColor: Colors.blueBright + "18", borderWidth: 1, borderColor: Colors.blueBright + "33" },
  actionText: { fontSize: FontSize.xs, fontWeight: "700" },
  actionBtnPrimary: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.sm, backgroundColor: Colors.blue },
  actionTextWhite: { fontSize: FontSize.xs, color: "#fff", fontWeight: "700" },
})
