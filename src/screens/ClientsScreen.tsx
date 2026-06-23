import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

function fmtMoney(v: any): string {
  const n = parseFloat(String(v ?? "0").replace(/[$,]/g, ""))
  if (!n) return "—"
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}`
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

export function ClientsScreen() {
  const { identity } = useAuth()
  const [clients, setClients] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!identity) return
    api.clients(identity).then((res: any) => {
      const raw = res?.data?.results ?? res?.data ?? res?.results ?? res
      const arr = Array.isArray(raw) ? raw.map((item: any) => ({
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
      })) : []
      setClients(arr)
      setFiltered(arr)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [identity])

  const applyFilters = (q: string, status: string, source = clients) => {
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
    setFiltered(out)
  }

  const tabs = ["All", "Prospects", "In Progress", "Active Bond", "Closed"]
  const tabCounts: Record<string, number> = {
    All: clients.length,
    Prospects: clients.filter((c) => STATUS_GROUPS.Prospects.includes((c.status ?? "").toLowerCase())).length,
    "In Progress": clients.filter((c) => STATUS_GROUPS["In Progress"].includes((c.status ?? "").toLowerCase())).length,
    "Active Bond": clients.filter((c) => STATUS_GROUPS["Active Bond"].includes((c.status ?? "").toLowerCase())).length,
    Closed: clients.filter((c) => STATUS_GROUPS.Closed.includes((c.status ?? "").toLowerCase())).length,
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.blueBright + "18", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="people-outline" size={17} color={Colors.blueBright} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Client Cases</Text>
          <Text style={s.subtitle}>{clients.length} total clients</Text>
        </View>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="person-add-outline" size={16} color="#fff" />
          <Text style={s.addBtnText}>Add Client</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
        <TextInput
          style={s.searchInput}
          placeholder="Search name, case #, county..."
          placeholderTextColor={Colors.mutedDim}
          value={query}
          onChangeText={(t) => { setQuery(t); applyFilters(t, statusFilter) }}
        />
        {!!query && (
          <TouchableOpacity onPress={() => { setQuery(""); applyFilters("", statusFilter) }}>
            <Ionicons name="close-circle" size={16} color={Colors.mutedDim} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsRow}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tab, statusFilter === t && s.tabActive]}
            onPress={() => { setStatusFilter(t); applyFilters(query, t) }}
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

            return (
              <TouchableOpacity style={s.card} activeOpacity={0.8}>
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

                <View style={s.cardFooter}>
                  <TouchableOpacity style={s.footerAction}>
                    <Ionicons name="eye-outline" size={14} color={Colors.blueBright} />
                    <Text style={s.footerActionText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.footerAction}>
                    <Ionicons name="send-outline" size={14} color={Colors.mutedDim} />
                    <Text style={[s.footerActionText, { color: Colors.mutedDim }]}>BondApp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.footerAction}>
                    <Ionicons name="card-outline" size={14} color={Colors.green} />
                    <Text style={[s.footerActionText, { color: Colors.green }]}>Payment</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity>
                    <Ionicons name="chevron-forward" size={16} color={Colors.mutedDim} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginHorizontal: Spacing.xl, marginVertical: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  subtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: Radius.sm, backgroundColor: Colors.blue },
  addBtnText: { fontSize: FontSize.xs, color: "#fff", fontFamily: Font.bold },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, height: 44 },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm },
  tabsScroll: { marginBottom: Spacing.md, height: 38 },
  tabsRow: { paddingHorizontal: Spacing.xl, gap: 8 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.xl, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  tabText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  tabTextActive: { color: "#fff" },
  tabCount: { backgroundColor: Colors.bgPanel, borderRadius: 9, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  tabCountActive: { backgroundColor: "#ffffff30" },
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
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: Spacing.md },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.muted },
  cardFooter: { flexDirection: "row", alignItems: "center", paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderFaint, gap: 4 },
  footerAction: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: Radius.sm },
  footerActionText: { fontSize: FontSize.xs, color: Colors.blueBright, fontFamily: Font.semibold },
})
