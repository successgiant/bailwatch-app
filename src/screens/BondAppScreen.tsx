import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

function fmtDate(d: string): string {
  if (!d) return "—"
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }
  catch { return d }
}

function fmtMoney(v: any): string {
  const n = parseFloat(String(v ?? "0").replace(/[$,]/g, ""))
  if (!n) return "—"
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}`
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: Colors.gold + "18", text: Colors.gold },
  Pending: { bg: Colors.gold + "18", text: Colors.gold },
  approved: { bg: Colors.green + "18", text: Colors.green },
  Approved: { bg: Colors.green + "18", text: Colors.green },
  denied: { bg: Colors.red + "18", text: Colors.red },
  Denied: { bg: Colors.red + "18", text: Colors.red },
  draft: { bg: Colors.mutedDim + "18", text: Colors.mutedDim },
  Draft: { bg: Colors.mutedDim + "18", text: Colors.mutedDim },
  submitted: { bg: Colors.blue + "18", text: Colors.blueBright },
  Submitted: { bg: Colors.blue + "18", text: Colors.blueBright },
  in_review: { bg: Colors.purple + "18", text: Colors.purple },
  "In Review": { bg: Colors.purple + "18", text: Colors.purple },
}

export function BondAppScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [apps, setApps] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!identity) return
    api.bondapp(identity).then((res: any) => {
      const raw = res?.data?.results ?? res?.data ?? res?.results ?? res
      setApps(Array.isArray(raw) ? raw : [])
      setFiltered(Array.isArray(raw) ? raw : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [identity])

  const applyFilters = (q: string, status: string, source = apps) => {
    let out = source
    if (status !== "all") out = out.filter((a) => (a.status ?? "").toLowerCase() === status.toLowerCase())
    if (q.trim()) {
      const lq = q.toLowerCase()
      out = out.filter((a) =>
        (a.applicant_name ?? a.client_name ?? a.name ?? "").toLowerCase().includes(lq) ||
        (a.county ?? "").toLowerCase().includes(lq)
      )
    }
    setFiltered(out)
  }

  const statusCounts: Record<string, number> = { all: apps.length }
  apps.forEach((a) => {
    const st = (a.status ?? "").toLowerCase()
    statusCounts[st] = (statusCounts[st] ?? 0) + 1
  })

  const kpis = [
    { label: "Total", value: String(apps.length), color: Colors.text },
    { label: "Pending", value: String(apps.filter((a) => ["pending", "in_review"].includes((a.status ?? "").toLowerCase())).length), color: Colors.gold },
    { label: "Approved", value: String(apps.filter((a) => (a.status ?? "").toLowerCase() === "approved").length), color: Colors.green },
    { label: "Denied", value: String(apps.filter((a) => (a.status ?? "").toLowerCase() === "denied").length), color: Colors.red },
  ]

  const statusTabs = ["all", "pending", "submitted", "approved", "denied", "draft"]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.purple + "18", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="document-text-outline" size={17} color={Colors.purple} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Bond Applications</Text>
          <Text style={s.subtitle}>{apps.length} applications</Text>
        </View>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="send-outline" size={14} color="#fff" />
          <Text style={s.addBtnText}>Send</Text>
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
          placeholder="Search applicant, county..."
          placeholderTextColor={Colors.mutedDim}
          value={query}
          onChangeText={(t) => { setQuery(t); applyFilters(t, statusFilter) }}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsRow}>
        {statusTabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tab, statusFilter === t && s.tabActive]}
            onPress={() => { setStatusFilter(t); applyFilters(query, t) }}
          >
            <Text style={[s.tabText, statusFilter === t && s.tabTextActive]}>
              {t === "all" ? `All (${statusCounts.all})` : `${t.charAt(0).toUpperCase() + t.slice(1)} (${statusCounts[t] ?? 0})`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.blue} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id ?? Math.random())}
          contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32, gap: 10 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="document-text-outline" size={48} color={Colors.mutedDim} />
              <Text style={s.emptyTitle}>No applications found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const name = item.applicant_name ?? item.client_name ?? item.name ?? "Unknown"
            const status = item.status ?? "pending"
            const sc = STATUS_COLORS[status] ?? STATUS_COLORS.pending
            const date = item.submitted_at ?? item.created_at ?? item.date ?? ""
            const county = item.county ?? ""
            const bondAmt = item.bond_amount ?? item.amount ?? null
            const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"

            return (
              <TouchableOpacity style={s.card} activeOpacity={0.8}>
                <View style={s.cardTop}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.appName}>{name}</Text>
                    {!!item.id && <Text style={s.appId}>App #{item.id}</Text>}
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.statusText, { color: sc.text }]}>{status}</Text>
                  </View>
                </View>

                <View style={s.metaRow}>
                  {!!county && (
                    <View style={s.metaItem}>
                      <Ionicons name="location-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>{county}</Text>
                    </View>
                  )}
                  {!!date && (
                    <View style={s.metaItem}>
                      <Ionicons name="calendar-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>{fmtDate(date)}</Text>
                    </View>
                  )}
                  {bondAmt != null && (
                    <View style={s.metaItem}>
                      <Ionicons name="cash-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>{fmtMoney(bondAmt)}</Text>
                    </View>
                  )}
                </View>

                <View style={s.cardFooter}>
                  <TouchableOpacity style={s.footerAction}>
                    <Ionicons name="eye-outline" size={14} color={Colors.blueBright} />
                    <Text style={s.footerActionText}>View</Text>
                  </TouchableOpacity>
                  {["pending", "in_review"].includes(status.toLowerCase()) && (
                    <>
                      <TouchableOpacity style={[s.footerAction, { backgroundColor: Colors.green + "14", borderRadius: Radius.sm }]}>
                        <Ionicons name="checkmark-outline" size={14} color={Colors.green} />
                        <Text style={[s.footerActionText, { color: Colors.green }]}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.footerAction, { backgroundColor: Colors.red + "14", borderRadius: Radius.sm }]}>
                        <Ionicons name="close-outline" size={14} color={Colors.red} />
                        <Text style={[s.footerActionText, { color: Colors.red }]}>Deny</Text>
                      </TouchableOpacity>
                    </>
                  )}
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
  backBtn: { width: 36, height: 36, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  subtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: Radius.sm, backgroundColor: Colors.blue },
  addBtnText: { fontSize: FontSize.xs, color: "#fff", fontFamily: Font.bold },
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold },
  kpiLabel: { fontSize: 9, color: Colors.mutedDim, marginTop: 2, textAlign: "center" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, height: 44 },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm },
  tabsScroll: { marginBottom: Spacing.md, height: 38 },
  tabsRow: { paddingHorizontal: Spacing.xl, gap: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.xl, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  tabText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  tabTextActive: { color: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.bold },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.blue + "18", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: FontSize.md, color: Colors.blueBright, fontFamily: Font.extrabold },
  appName: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  appId: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  statusText: { fontSize: 10, fontFamily: Font.bold, textTransform: "capitalize" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: Spacing.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.muted },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 4, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderFaint },
  footerAction: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5, paddingHorizontal: 8 },
  footerActionText: { fontSize: FontSize.xs, color: Colors.blueBright, fontFamily: Font.semibold },
})
