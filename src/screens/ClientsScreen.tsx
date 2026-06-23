import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform, Linking } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

type NavProp = NativeStackNavigationProp<any>

function fmtMoney(v: any): string {
  const n = parseFloat(String(v ?? "0").replace(/[$,]/g, ""))
  if (!n) return "—"
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}`
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return ""
  try {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    return `${months}mo ago`
  } catch { return "" }
}

const STATUS_GROUPS: Record<string, string[]> = {
  Prospects: ["new_booking", "prospect", "contacted"],
  "In Progress": ["application_sent", "application_received", "approved", "bond_posted"],
  "Active Bond": ["active_bond"],
  Closed: ["closed"],
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new_booking: { bg: Colors.blue + "18", text: Colors.blueBright },
  prospect: { bg: Colors.blue + "14", text: Colors.blueLight },
  contacted: { bg: Colors.purple + "14", text: Colors.purple },
  application_sent: { bg: Colors.purple + "18", text: Colors.purple },
  application_received: { bg: Colors.purple + "20", text: Colors.purple },
  approved: { bg: Colors.gold + "14", text: Colors.gold },
  bond_posted: { bg: Colors.blue + "18", text: Colors.blueBright },
  active_bond: { bg: Colors.green + "18", text: Colors.green },
  closed: { bg: Colors.mutedDim + "18", text: Colors.mutedDim },
  monitoring: { bg: Colors.blue + "14", text: Colors.blueLight },
  re_arrested: { bg: Colors.red + "18", text: Colors.red },
  revoked: { bg: Colors.red + "20", text: Colors.red },
}

const AVATAR_COLORS = [Colors.blue, Colors.purple, Colors.green, Colors.gold, Colors.red, Colors.blueBright]
function avatarColor(name: string): string {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

type SortOption = "recent" | "name_az" | "bond_amount"

const SORT_LABELS: Record<SortOption, string> = {
  recent: "Recent",
  name_az: "Name A-Z",
  bond_amount: "Bond Amount",
}

export function ClientsScreen() {
  const navigation = useNavigation<NavProp>()
  const { identity } = useAuth()
  const [clients, setClients] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [sortBy, setSortBy] = useState<SortOption>("recent")
  const [showSort, setShowSort] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ full_name: "", phone_number: "", email: "", county: "", notes: "" })
  const [adding, setAdding] = useState(false)

  const mapClient = (item: any) => ({
    id: item.id,
    name: item.full_name ?? item.name ?? "",
    case_number: item.booking_number ?? item.case_number ?? "",
    county: item.arresting_agency ?? item.county ?? "",
    status: item.case_status ?? item.status ?? "prospect",
    status_display: item.case_status_display ?? item.status_display ?? "",
    phone: item.phone_number ?? item.phone ?? "",
    bond_amount: item.bond_amount ?? 0,
    balance: item.balance ?? 0,
    court_date: item.court_date ?? null,
    charges: item.charges ?? item.charges_description ?? "",
    email: item.email ?? "",
    last_payment: item.last_payment ?? null,
    updated_at: item.updated_at ?? item.created_at ?? "",
  })

  const sortClients = (arr: any[], sort: SortOption) => {
    const copy = [...arr]
    if (sort === "name_az") return copy.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    if (sort === "bond_amount") return copy.sort((a, b) => (parseFloat(String(b.bond_amount ?? 0)) || 0) - (parseFloat(String(a.bond_amount ?? 0)) || 0))
    return copy.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
  }

  const applyFilters = (q: string, status: string, sort: SortOption, source = clients) => {
    let out = source
    if (status !== "All") {
      const group = STATUS_GROUPS[status]
      if (group) out = out.filter((c) => group.includes((c.status ?? "").toLowerCase()))
    }
    if (q.trim()) {
      const lq = q.toLowerCase()
      out = out.filter((c) =>
        (c.name ?? "").toLowerCase().includes(lq) ||
        (c.case_number ?? "").toLowerCase().includes(lq) ||
        (c.county ?? "").toLowerCase().includes(lq)
      )
    }
    setFiltered(sortClients(out, sort))
  }

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const res: any = await api.clients(identity)
      const raw = res?.data?.results ?? res?.data ?? res?.results ?? res
      const arr = Array.isArray(raw) ? raw.map(mapClient) : []
      setClients(arr)
      applyFilters(query, statusFilter, sortBy, arr)
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const handleAddClient = async () => {
    if (!identity) return
    if (!addForm.full_name.trim()) { Alert.alert("Required", "Please enter the client's full name."); return }
    setAdding(true)
    try {
      await api.createClient(identity, addForm)
      setShowAdd(false)
      setAddForm({ full_name: "", phone_number: "", email: "", county: "", notes: "" })
      load()
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not add client")
    } finally { setAdding(false) }
  }

  const tabs = ["All", "Prospects", "In Progress", "Active Bond", "Closed"]
  const tabCounts: Record<string, number> = {
    All: clients.length,
    Prospects: clients.filter((c) => STATUS_GROUPS.Prospects.includes((c.status ?? "").toLowerCase())).length,
    "In Progress": clients.filter((c) => STATUS_GROUPS["In Progress"].includes((c.status ?? "").toLowerCase())).length,
    "Active Bond": clients.filter((c) => STATUS_GROUPS["Active Bond"].includes((c.status ?? "").toLowerCase())).length,
    Closed: clients.filter((c) => STATUS_GROUPS.Closed.includes((c.status ?? "").toLowerCase())).length,
  }

  const kpis = [
    { label: "Total", value: String(clients.length), color: Colors.text },
    { label: "Prospects", value: String(tabCounts.Prospects), color: Colors.blueLight },
    { label: "Active Bond", value: String(tabCounts["Active Bond"]), color: Colors.green },
    { label: "Closed", value: String(tabCounts.Closed), color: Colors.mutedDim },
  ]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.blueIconBg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.blueIconBorder }}>
          <Ionicons name="people-outline" size={17} color={Colors.blueBright} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Client Cases</Text>
          <Text style={s.subtitle}>{clients.length} total clients</Text>
        </View>
        <TouchableOpacity style={[s.addBtn, { marginRight: 6 }]} onPress={() => setShowSort(true)}>
          <Ionicons name="swap-vertical-outline" size={14} color={Colors.blueLight} />
          <Text style={s.addBtnText}>{SORT_LABELS[sortBy]}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="person-add-outline" size={16} color={Colors.blueLight} />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={s.kpiRow}>
        {kpis.map((k) => (
          <View key={k.label} style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
        <TextInput
          style={s.searchInput}
          placeholder="Search name, case #, county..."
          placeholderTextColor={Colors.mutedDim}
          value={query}
          onChangeText={(t) => { setQuery(t); applyFilters(t, statusFilter, sortBy) }}
        />
        {!!query && (
          <TouchableOpacity onPress={() => { setQuery(""); applyFilters("", statusFilter, sortBy) }}>
            <Ionicons name="close-circle" size={16} color={Colors.mutedDim} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsRow}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tab, statusFilter === t && s.tabActive]}
            onPress={() => { setStatusFilter(t); applyFilters(query, t, sortBy) }}
          >
            <Text style={[s.tabText, statusFilter === t && s.tabTextActive]}>{t}</Text>
            {tabCounts[t] > 0 && (
              <View style={[s.tabCount, statusFilter === t && s.tabCountActive]}>
                <Text style={[s.tabCountText, statusFilter === t && s.tabCountTextActive]}>{tabCounts[t]}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id ?? Math.random())}
          contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={Colors.blue} />}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="people-outline" size={48} color={Colors.mutedDim} />
              <Text style={s.emptyTitle}>No clients found</Text>
              <Text style={s.emptyText}>Try adjusting your search or filter.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const initials = item.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"
            const acColor = avatarColor(item.name)
            const status = (item.status ?? "prospect").toLowerCase()
            const sc = STATUS_COLORS[status] ?? { bg: Colors.mutedDim + "18", text: Colors.mutedDim }
            const statusLabel = item.status_display || item.status?.replace(/_/g, " ") || "Unknown"
            const courtDate = item.court_date ? new Date(item.court_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null
            const updatedAgo = timeAgo(item.updated_at)
            const lp = item.last_payment

            return (
              <TouchableOpacity
                style={s.card}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("More" as any, { screen: "ClientDetail", params: { client: item } })}
              >
                <View style={s.cardTop}>
                  <View style={[s.avatar, { backgroundColor: acColor + "22" }]}>
                    <Text style={[s.avatarText, { color: acColor }]}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.clientName}>{item.name}</Text>
                    {!!item.case_number && <Text style={s.caseNum}>#{item.case_number}</Text>}
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.statusText, { color: sc.text }]}>{statusLabel}</Text>
                  </View>
                </View>

                <View style={s.metaRow}>
                  {!!item.county && (
                    <View style={s.metaItem}>
                      <Ionicons name="location-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>{item.county}</Text>
                    </View>
                  )}
                  {!!item.bond_amount && Number(item.bond_amount) > 0 && (
                    <View style={s.metaItem}>
                      <Ionicons name="shield-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>{fmtMoney(item.bond_amount)}</Text>
                    </View>
                  )}
                  {!!item.balance && Number(item.balance) > 0 && (
                    <View style={s.metaItem}>
                      <Ionicons name="wallet-outline" size={12} color={Colors.gold} />
                      <Text style={[s.metaText, { color: Colors.gold }]}>{fmtMoney(item.balance)} bal</Text>
                    </View>
                  )}
                  {courtDate && (
                    <View style={s.metaItem}>
                      <Ionicons name="calendar-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>{courtDate}</Text>
                    </View>
                  )}
                  {!!item.phone && (
                    <View style={s.metaItem}>
                      <Ionicons name="call-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>{item.phone}</Text>
                    </View>
                  )}
                </View>

                {lp != null && (
                  <View style={s.paymentRow}>
                    <Ionicons name="card-outline" size={12} color={Colors.green} />
                    <Text style={s.paymentText}>
                      {`Last payment: ${fmtMoney(lp.amount)}${lp.status_display ? ` · ${lp.status_display}` : lp.status ? ` · ${lp.status}` : ""}`}
                    </Text>
                  </View>
                )}

                <View style={s.cardFooter}>
                  {!!item.phone && (
                    <TouchableOpacity style={s.footerAction} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                      <Ionicons name="call-outline" size={14} color={Colors.blueBright} />
                      <Text style={s.footerActionText}>Call</Text>
                    </TouchableOpacity>
                  )}
                  {!!item.email && (
                    <TouchableOpacity style={s.footerAction} onPress={() => Linking.openURL(`mailto:${item.email}`)}>
                      <Ionicons name="mail-outline" size={14} color={Colors.mutedDim} />
                      <Text style={[s.footerActionText, { color: Colors.mutedDim }]}>Email</Text>
                    </TouchableOpacity>
                  )}
                  <View style={{ flex: 1 }} />
                  {!!updatedAgo && <Text style={s.updatedText}>Updated {updatedAgo}</Text>}
                  <Ionicons name="chevron-forward" size={16} color={Colors.mutedDim} />
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}

      <Modal visible={showSort} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={{ width: 40, height: 4, backgroundColor: Colors.dragHandle, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSort(false)}>
                <Ionicons name="close" size={22} color={Colors.muted} />
              </TouchableOpacity>
            </View>
            {(["recent", "name_az", "bond_amount"] as SortOption[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[s.sortOption, sortBy === opt && s.sortOptionActive]}
                onPress={() => {
                  setSortBy(opt)
                  applyFilters(query, statusFilter, opt)
                  setShowSort(false)
                }}
              >
                <Text style={[s.sortOptionText, sortBy === opt && { color: Colors.blueLight }]}>{SORT_LABELS[opt]}</Text>
                {sortBy === opt && <Ionicons name="checkmark" size={16} color={Colors.blueLight} />}
              </TouchableOpacity>
            ))}
            <View style={{ height: 20 }} />
          </View>
        </View>
      </Modal>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
            <View style={s.modalCard}>
              <View style={{ width: 40, height: 4, backgroundColor: Colors.dragHandle, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Add New Client</Text>
                <TouchableOpacity onPress={() => setShowAdd(false)}>
                  <Ionicons name="close" size={22} color={Colors.muted} />
                </TouchableOpacity>
              </View>
              {[
                { key: "full_name", label: "Full Name *", placeholder: "John Smith", keyboard: "default" as const },
                { key: "phone_number", label: "Phone", placeholder: "+1 (555) 000-0000", keyboard: "phone-pad" as const },
                { key: "email", label: "Email", placeholder: "client@email.com", keyboard: "email-address" as const },
                { key: "county", label: "County", placeholder: "Los Angeles", keyboard: "default" as const },
              ].map((f) => (
                <View key={f.key} style={s.field}>
                  <Text style={s.fieldLabel}>{f.label}</Text>
                  <TextInput style={s.fieldInput} value={(addForm as any)[f.key]} onChangeText={(v) => setAddForm((prev) => ({ ...prev, [f.key]: v }))} placeholder={f.placeholder} placeholderTextColor={Colors.mutedDim} keyboardType={f.keyboard} autoCapitalize={f.keyboard === "email-address" ? "none" : "words"} />
                </View>
              ))}
              <TouchableOpacity style={[s.submitBtn, adding && { opacity: 0.6 }]} onPress={handleAddClient} disabled={adding}>
                {adding ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.submitBtnText}>Add Client</Text>}
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
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginHorizontal: Spacing.xl, marginVertical: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  subtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.blueSubtle, borderWidth: 1, borderColor: Colors.blueBorder },
  addBtnText: { fontSize: FontSize.xs, color: Colors.blueLight, fontFamily: Font.bold },
  kpiRow: { flexDirection: "row", gap: 8, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold },
  kpiLabel: { fontSize: 9, fontFamily: Font.semibold, marginTop: 3, textAlign: "center", color: Colors.muted },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, height: 44 },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm },
  tabsScroll: { marginBottom: Spacing.md, height: 38 },
  tabsRow: { paddingHorizontal: Spacing.xl, gap: 8 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.xl, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  tabText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  tabTextActive: { color: "#fff" },
  tabCount: { backgroundColor: Colors.bgPanel, borderRadius: 9, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  tabCountActive: { backgroundColor: Colors.border },
  tabCountText: { fontSize: 9, color: Colors.muted, fontFamily: Font.bold },
  tabCountTextActive: { color: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.bold },
  emptyText: { fontSize: FontSize.sm, color: Colors.mutedDim },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: FontSize.md, fontFamily: Font.extrabold },
  clientName: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  caseNum: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  statusText: { fontSize: 10, fontFamily: Font.bold, textTransform: "capitalize" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: Spacing.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.muted },
  paymentRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: Spacing.sm, backgroundColor: Colors.green + "10", borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: Colors.green + "20" },
  paymentText: { fontSize: FontSize.xs, color: Colors.green, fontFamily: Font.medium },
  cardFooter: { flexDirection: "row", alignItems: "center", paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderFaint, gap: 4 },
  footerAction: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: Radius.sm },
  footerActionText: { fontSize: FontSize.xs, color: Colors.blueBright, fontFamily: Font.semibold },
  updatedText: { fontSize: 10, color: Colors.mutedDim, marginRight: 6 },
  sortOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.borderFaint },
  sortOptionActive: { borderBottomColor: Colors.blue + "30" },
  sortOptionText: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.semibold },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.bgPanel, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.extrabold },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold, marginBottom: 6 },
  fieldInput: { backgroundColor: Colors.bgInput, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 13, color: Colors.text, fontSize: FontSize.sm },
  submitBtn: { height: 52, borderRadius: Radius.lg, backgroundColor: Colors.blue, alignItems: "center", justifyContent: "center", marginTop: Spacing.md },
  submitBtnText: { color: "#fff", fontSize: FontSize.md, fontFamily: Font.bold },
})
