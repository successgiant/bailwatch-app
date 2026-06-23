import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

function fmtMoney(v: any): string {
  if (v == null) return "—"
  const n = parseFloat(String(v))
  if (isNaN(n)) return "—"
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}`
}

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  Owner: { bg: Colors.blue + "20", text: Colors.blueBright },
  Manager: { bg: Colors.purple + "20", text: Colors.purple },
  "Senior Agent": { bg: Colors.gold + "20", text: Colors.gold },
  Agent: { bg: Colors.mutedDim + "20", text: Colors.muted },
}

const INVITE_ROLES = ["Agent", "Senior Agent", "Manager", "Owner"]

export function BondTeamScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [team, setTeam] = useState<any[]>([])
  const [agentStats, setAgentStats] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "Agent", phone: "" })
  const [inviting, setInviting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const [teamRes, statsRes] = await Promise.all([
        api.team(identity).catch(() => null),
        api.reports.agents(identity).catch(() => null),
      ])
      const list = teamRes?.results ?? teamRes?.data ?? teamRes
      const arr = Array.isArray(list) ? list : []
      setTeam(arr)
      applySearch(query, arr)
      const statsArr = statsRes?.results ?? statsRes?.data ?? statsRes
      setAgentStats(Array.isArray(statsArr) ? statsArr : [])
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const applySearch = (text: string, source: any[] = team) => {
    if (!text.trim()) { setFiltered(source); return }
    const q = text.toLowerCase()
    setFiltered(source.filter((m) =>
      (m.name ?? m.full_name ?? m.username ?? "").toLowerCase().includes(q) ||
      (m.email ?? "").toLowerCase().includes(q)
    ))
  }

  const handleInvite = async () => {
    if (!identity) return
    if (!inviteForm.name.trim()) { Alert.alert("Required", "Please enter the agent's name."); return }
    setInviting(true)
    try {
      await api.inviteUser(identity, {
        full_name: inviteForm.name,
        email: inviteForm.email,
        role: inviteForm.role,
        telephone: inviteForm.phone,
      })
      setShowInvite(false)
      setInviteForm({ name: "", email: "", role: "Agent", phone: "" })
      Alert.alert("Agent Added", `${inviteForm.name} has been added to the roster.`)
      load()
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not add agent")
    } finally { setInviting(false) }
  }

  const handleDelete = (member: any) => {
    if (!identity) return
    const name = member.name ?? member.full_name ?? member.username ?? "this member"
    Alert.alert("Remove Member", `Remove ${name} from the team?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        setDeletingId(member.id)
        try {
          await api.deleteTeamMember(identity, member.id)
          const updated = team.filter((m) => m.id !== member.id)
          setTeam(updated)
          applySearch(query, updated)
        } catch (e: any) {
          Alert.alert("Error", e?.message ?? "Could not remove member")
        } finally { setDeletingId(null) }
      }},
    ])
  }

  const getStatsForMember = (member: any) => {
    const memberName = (member.name ?? member.full_name ?? member.username ?? "").toLowerCase()
    const memberEmail = (member.email ?? "").toLowerCase()
    return agentStats.find((s) =>
      (s.name ?? "").toLowerCase() === memberName ||
      (s.email ?? "").toLowerCase() === memberEmail
    )
  }

  const totalCount = team.length
  const activeCount = team.filter((m) => (m.status ?? (m.is_active !== false ? "Active" : "Inactive")) === "Active").length
  const agentRoleCount = team.filter((m) => (m.role ?? "Agent") === "Agent").length
  const adminCount = team.filter((m) => ["Owner", "Manager"].includes(m.role ?? "")).length

  const kpiItems = [
    { label: "Total", value: String(totalCount), color: Colors.text },
    { label: "Active", value: String(activeCount), color: Colors.green },
    { label: "Agents", value: String(agentRoleCount), color: Colors.blueBright },
    { label: "Admins", value: String(adminCount), color: Colors.purple },
  ]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.purple + "12", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.purple + "30" }}>
          <Ionicons name="people-outline" size={17} color={Colors.purple} />
        </View>
        <Text style={[s.title, { flex: 1 }]}>BondTeam</Text>
        <TouchableOpacity style={s.inviteBtn} onPress={() => setShowInvite(true)}>
          <Ionicons name="person-add-outline" size={16} color={Colors.blueLight} />
          <Text style={s.inviteBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>

      <View style={s.kpiRow}>
        {kpiItems.map((k) => (
          <View key={k.label} style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
        <TextInput style={s.searchInput} placeholder="Search team..." placeholderTextColor={Colors.mutedDim} value={query} onChangeText={(t) => { setQuery(t); applySearch(t) }} />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={Colors.blue} />}
          ListEmptyComponent={<Text style={s.empty}>No team members found.</Text>}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const name = item.name ?? item.full_name ?? item.username ?? "Unknown"
            const email = item.email ?? ""
            const telephone = item.telephone ?? item.phone ?? ""
            const role = item.role ?? "Agent"
            const status = item.status ?? (item.is_active !== false ? "Active" : "Inactive")
            const isActive = status === "Active"
            const rb = ROLE_BADGE[role] ?? { bg: Colors.mutedDim + "20", text: Colors.muted }
            const stats = getStatsForMember(item)

            return (
              <View style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{name[0]?.toUpperCase() ?? "?"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.memberName}>{name}</Text>
                    {!!email && <Text style={s.email}>{email}</Text>}
                    {!!telephone && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <Ionicons name="call-outline" size={11} color={Colors.mutedDim} />
                        <Text style={s.telephone}>{telephone}</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.badges}>
                    <View style={[s.badge, { backgroundColor: rb.bg }]}>
                      <Text style={[s.badgeText, { color: rb.text }]}>{role}</Text>
                    </View>
                    <View style={[s.badge, { backgroundColor: isActive ? Colors.green + "18" : Colors.mutedDim + "18" }]}>
                      <Text style={[s.badgeText, { color: isActive ? Colors.green : Colors.mutedDim }]}>{status}</Text>
                    </View>
                  </View>
                </View>

                {stats && (
                  <View style={s.statsRow}>
                    <View style={s.statItem}>
                      <Ionicons name="shield-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.statText}>{stats.bonds ?? stats.bond_count ?? "—"} bonds</Text>
                    </View>
                    {(stats.revenue != null) && (
                      <View style={s.statItem}>
                        <Ionicons name="cash-outline" size={12} color={Colors.mutedDim} />
                        <Text style={[s.statText, { color: Colors.green }]}>{fmtMoney(stats.revenue)}</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={s.footer}>
                  <View style={{ flex: 1 }} />
                  <View style={s.actions}>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: Colors.red + "12" }]} onPress={() => handleDelete(item)} disabled={deletingId === item.id}>
                      {deletingId === item.id
                        ? <ActivityIndicator size="small" color={Colors.red} />
                        : <Ionicons name="trash-outline" size={16} color={Colors.red} />
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )
          }}
        />
      )}

      <Modal visible={showInvite} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
            <View style={s.modalCard}>
              <View style={{ width: 40, height: 4, backgroundColor: Colors.dragHandle, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Add Team Member</Text>
                <TouchableOpacity onPress={() => setShowInvite(false)}>
                  <Ionicons name="close" size={22} color={Colors.muted} />
                </TouchableOpacity>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Full Name *</Text>
                <TextInput style={s.fieldInput} value={inviteForm.name} onChangeText={(v) => setInviteForm((f) => ({ ...f, name: v }))} placeholder="John Smith" placeholderTextColor={Colors.mutedDim} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Email</Text>
                <TextInput style={s.fieldInput} value={inviteForm.email} onChangeText={(v) => setInviteForm((f) => ({ ...f, email: v }))} placeholder="agent@example.com" placeholderTextColor={Colors.mutedDim} keyboardType="email-address" autoCapitalize="none" />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Phone (optional)</Text>
                <TextInput style={s.fieldInput} value={inviteForm.phone} onChangeText={(v) => setInviteForm((f) => ({ ...f, phone: v }))} placeholder="(555) 123-4567" placeholderTextColor={Colors.mutedDim} keyboardType="phone-pad" />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Role</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {INVITE_ROLES.map((r) => (
                    <TouchableOpacity key={r} style={[s.typeChip, inviteForm.role === r && s.typeChipActive]} onPress={() => setInviteForm((f) => ({ ...f, role: r }))}>
                      <Text style={[s.typeChipText, inviteForm.role === r && { color: Colors.text }]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <TouchableOpacity style={[s.submitBtn, inviting && { opacity: 0.6 }]} onPress={handleInvite} disabled={inviting}>
                {inviting ? <ActivityIndicator size="small" color={Colors.text} /> : <Text style={s.submitBtnText}>Add Member</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.md, marginHorizontal: Spacing.xl, marginVertical: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  inviteBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.blueSubtle, borderWidth: 1, borderColor: Colors.blueBorder },
  inviteBtnText: { fontSize: FontSize.xs, color: Colors.blueLight, fontFamily: Font.bold },
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold },
  kpiLabel: { fontSize: 9, fontFamily: Font.semibold, marginTop: 3, textAlign: "center", color: Colors.mutedDim },
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, height: 42, gap: Spacing.sm },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  empty: { textAlign: "center", color: Colors.mutedDim, marginTop: 40, fontSize: FontSize.md },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.sm },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.blueIconBg, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: FontSize.md, color: Colors.blueBright, fontFamily: Font.bold },
  memberName: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  email: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  telephone: { fontSize: FontSize.xs, color: Colors.muted },
  badges: { gap: 5 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  badgeText: { fontSize: 10, fontFamily: Font.bold },
  statsRow: { flexDirection: "row", gap: Spacing.lg, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderFaint, marginTop: Spacing.sm },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: FontSize.xs, color: Colors.mutedDim },
  footer: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: Colors.rowDivider, paddingTop: Spacing.md, marginTop: Spacing.sm },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.bgPanel, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.extrabold },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold, marginBottom: 6 },
  fieldInput: { backgroundColor: Colors.bgInput, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 13, color: Colors.text, fontSize: FontSize.sm },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.xl, backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border },
  typeChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  typeChipText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  submitBtn: { height: 52, borderRadius: Radius.lg, backgroundColor: Colors.blue, alignItems: "center", justifyContent: "center", marginTop: Spacing.md },
  submitBtnText: { color: Colors.text, fontSize: FontSize.md, fontFamily: Font.bold },
})
