import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

const ROLE_COLORS: Record<string, string> = {
  admin: Colors.gold, Admin: Colors.gold,
  owner: Colors.gold, Owner: Colors.gold,
  agent: Colors.blueBright, Agent: Colors.blueBright,
  viewer: Colors.mutedDim, Viewer: Colors.mutedDim,
}

export function BondTeamScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [team, setTeam] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!identity) return
    api.team(identity).then((res: any) => {
      const list = res?.results ?? res?.data ?? res
      setTeam(Array.isArray(list) ? list : [])
      setFiltered(Array.isArray(list) ? list : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [identity])

  const handleSearch = (text: string) => {
    setQuery(text)
    if (!text.trim()) { setFiltered(team); return }
    const q = text.toLowerCase()
    setFiltered(team.filter(m =>
      (m.full_name ?? m.name ?? m.username ?? "").toLowerCase().includes(q) ||
      (m.email ?? "").toLowerCase().includes(q)
    ))
  }

  const stats = {
    total: team.length,
    active: team.filter(m => m.is_active !== false && m.status !== "inactive").length,
    agents: team.filter(m => (m.role ?? "agent").toLowerCase() === "agent").length,
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.purple + "18", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="people-outline" size={17} color={Colors.purple} />
        </View>
        <Text style={[s.title, { flex: 1 }]}>BondTeam</Text>
        <TouchableOpacity style={s.inviteBtn}>
          <Ionicons name="person-add-outline" size={16} color="#fff" />
          <Text style={s.inviteBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>

      <View style={s.statsRow}>
        {[
          { label: "Total Members", value: String(stats.total), color: Colors.text },
          { label: "Active", value: String(stats.active), color: Colors.green },
          { label: "Agents", value: String(stats.agents), color: Colors.blueBright },
        ].map(s2 => (
          <View key={s2.label} style={s.statCard}>
            <Text style={[s.statValue, { color: s2.color }]}>{s2.value}</Text>
            <Text style={s.statLabel}>{s2.label}</Text>
          </View>
        ))}
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
        <TextInput style={s.searchInput} placeholder="Search team..." placeholderTextColor={Colors.mutedDim} value={query} onChangeText={handleSearch} />
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
          ListEmptyComponent={<Text style={s.empty}>No team members found.</Text>}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const name = item.full_name ?? item.name ?? item.username ?? "Unknown"
            const email = item.email ?? ""
            const role = item.role ?? "agent"
            const rc = ROLE_COLORS[role] ?? Colors.mutedDim
            const isActive = item.is_active !== false && item.status !== "inactive"
            const bondsCount = item.bond_count ?? item.bonds ?? null
            return (
              <View style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{name[0]?.toUpperCase() ?? "?"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.memberName}>{name}</Text>
                    {!!email && <Text style={s.email}>{email}</Text>}
                  </View>
                  <View style={s.badges}>
                    <View style={[s.badge, { backgroundColor: rc + "22" }]}>
                      <Text style={[s.badgeText, { color: rc }]}>{role}</Text>
                    </View>
                    <View style={[s.badge, { backgroundColor: isActive ? Colors.green + "18" : Colors.red + "18" }]}>
                      <Text style={[s.badgeText, { color: isActive ? Colors.green : Colors.red }]}>{isActive ? "Active" : "Inactive"}</Text>
                    </View>
                  </View>
                </View>
                <View style={s.footer}>
                  {bondsCount != null && (
                    <View style={s.metaItem}>
                      <Ionicons name="shield-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>{bondsCount} bonds</Text>
                    </View>
                  )}
                  <View style={s.actions}>
                    <TouchableOpacity style={s.actionBtn}>
                      <Ionicons name="create-outline" size={16} color={Colors.blueBright} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: Colors.red + "12" }]}>
                      <Ionicons name="trash-outline" size={16} color={Colors.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
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
  backBtn: { width: 36, height: 36, borderRadius: Radius.md, alignItems: "center", justifyContent: "center", marginRight: 4 },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  inviteBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: Radius.sm, backgroundColor: Colors.blue },
  inviteBtnText: { fontSize: FontSize.xs, color: "#fff", fontFamily: Font.bold },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  statCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.md, alignItems: "center" },
  statValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold },
  statLabel: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1, textAlign: "center" },
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)", paddingHorizontal: Spacing.md, height: 42, gap: Spacing.sm },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  empty: { textAlign: "center", color: Colors.mutedDim, marginTop: 40, fontSize: FontSize.md },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.lg },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(47,147,255,0.15)", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: FontSize.md, color: Colors.blueBright, fontFamily: Font.bold },
  memberName: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  email: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  badges: { gap: 5 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  badgeText: { fontSize: 10, fontFamily: Font.bold },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(70,120,190,0.1)", paddingTop: Spacing.md },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.mutedDim },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: "rgba(70,120,190,0.1)", alignItems: "center", justifyContent: "center" },
})
