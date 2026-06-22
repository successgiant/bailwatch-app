import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Colors, FontSize, Radius, Spacing } from "../constants/theme"

const TABS = ["All", "Awaiting", "Signed", "Expired", "Drafts"]

const DOCS = [
  { id: "1", client: "Marcus Thompson", type: "Indemnity Agreement", status: "Signed", sent: "Jun 15", signedDate: "Jun 16", county: "Dallas County" },
  { id: "2", client: "James Rivera", type: "Co-Signer Agreement", status: "Awaiting", sent: "Jun 20", signedDate: null, county: "Tarrant County" },
  { id: "3", client: "Sara Mitchell", type: "Indemnity Agreement", status: "Signed", sent: "Jun 10", signedDate: "Jun 11", county: "Travis County" },
  { id: "4", client: "David Kim", type: "Payment Agreement", status: "Awaiting", sent: "Jun 21", signedDate: null, county: "Harris County" },
  { id: "5", client: "Angela Foster", type: "Indemnity Agreement", status: "Expired", sent: "Jun 1", signedDate: null, county: "Bexar County" },
]

const STATUS_COLORS: Record<string, string> = {
  Signed: Colors.green,
  Awaiting: Colors.gold,
  Expired: Colors.red,
  Draft: Colors.mutedDim,
}

export function ESignScreen() {
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>E-Sign</Text>
          <Text style={s.subtitle}>Digital Signatures</Text>
        </View>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label: "Sent", value: "48", color: Colors.blueBright },
          { label: "Signed", value: "39", color: Colors.green },
          { label: "Awaiting", value: "7", color: Colors.gold },
          { label: "Expired", value: "2", color: Colors.red },
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

      <FlatList
        data={DOCS}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const sc = STATUS_COLORS[item.status] ?? Colors.muted
          return (
            <TouchableOpacity style={s.card}>
              <View style={s.cardTop}>
                <View style={s.docIcon}>
                  <Ionicons name="document-text-outline" size={22} color={Colors.blueBright} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cname}>{item.client}</Text>
                  <Text style={s.sub}>{item.type} · {item.county}</Text>
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
                {item.signedDate && (
                  <View style={s.metaItem}>
                    <Ionicons name="checkmark-circle-outline" size={12} color={Colors.green} />
                    <Text style={[s.metaText, { color: Colors.green }]}>Signed: {item.signedDate}</Text>
                  </View>
                )}
              </View>
              <View style={s.actions}>
                <TouchableOpacity style={s.actionBtn}>
                  <Ionicons name="eye-outline" size={14} color={Colors.blueBright} />
                  <Text style={[s.actionText, { color: Colors.blueBright }]}>View</Text>
                </TouchableOpacity>
                {item.status === "Awaiting" && (
                  <TouchableOpacity style={s.actionBtnPrimary}>
                    <Ionicons name="refresh-outline" size={14} color="#fff" />
                    <Text style={s.actionTextWhite}>Resend</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.actionBtnGhost}>
                  <Ionicons name="download-outline" size={14} color={Colors.muted} />
                  <Text style={s.actionTextGhost}>Download</Text>
                </TouchableOpacity>
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
  tabRow: { flexDirection: "row", paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg, gap: 6 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)" },
  tabActive: { backgroundColor: Colors.blue + "22", borderColor: Colors.blue + "66" },
  tabText: { fontSize: FontSize.xs, color: Colors.mutedDim, fontWeight: "600" },
  tabTextActive: { color: Colors.blueBright },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.lg },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  docIcon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: "rgba(47,147,255,0.12)", alignItems: "center", justifyContent: "center" },
  cname: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700" },
  sub: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  badgeText: { fontSize: 10, fontWeight: "700" },
  meta: { flexDirection: "row", gap: Spacing.lg, marginBottom: Spacing.md },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.mutedDim },
  actions: { flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: "rgba(70,120,190,0.1)", paddingTop: Spacing.md },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.blue + "18" },
  actionText: { fontSize: FontSize.xs, fontWeight: "700" },
  actionBtnPrimary: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.blue },
  actionTextWhite: { fontSize: FontSize.xs, color: "#fff", fontWeight: "700" },
  actionBtnGhost: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: "rgba(70,120,190,0.1)" },
  actionTextGhost: { fontSize: FontSize.xs, color: Colors.muted, fontWeight: "600" },
})
