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
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}`
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  approved:    { bg: Colors.gold + "18", text: Colors.gold },
  active_bond: { bg: Colors.green + "18", text: Colors.green },
  at_risk:     { bg: Colors.red + "18", text: Colors.red },
  closed:      { bg: Colors.purple + "18", text: Colors.purple },
  revoked:     { bg: Colors.red + "20", text: Colors.red },
  canceled:    { bg: Colors.mutedDim + "18", text: Colors.mutedDim },
}

const STATUS_LABELS: Record<string, string> = {
  approved: "Approved", active_bond: "Active Bond", at_risk: "At Risk",
  closed: "Closed", revoked: "Revoked", canceled: "Canceled",
}

export function BondsScreen() {
  const { identity } = useAuth()
  const [bonds, setBonds] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!identity) return
    api.bonds(identity).then((res: any) => {
      const raw = res?.data?.results ?? res?.data ?? res?.results ?? res
      setBonds(Array.isArray(raw) ? raw : [])
      setFiltered(Array.isArray(raw) ? raw : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [identity])

  const applyFilters = (q: string, status: string, source = bonds) => {
    let out = source
    if (status !== "all") out = out.filter((b) => (b.status ?? "").toLowerCase() === status)
    if (q.trim()) {
      const lq = q.toLowerCase()
      out = out.filter((b) =>
        (b.defendant_name ?? b.defendant ?? "").toLowerCase().includes(lq) ||
        (b.bond_number ?? b.id ?? "").toString().toLowerCase().includes(lq) ||
        (b.county ?? "").toLowerCase().includes(lq)
      )
    }
    setFiltered(out)
  }

  const statusCounts: Record<string, number> = {}
  bonds.forEach((b) => {
    const s = (b.status ?? "").toLowerCase()
    statusCounts[s] = (statusCounts[s] ?? 0) + 1
  })

  const kpis = [
    { label: "Total Bonds", value: String(bonds.length), color: Colors.text },
    { label: "Active", value: String(bonds.filter((b) => (b.status ?? "").toLowerCase() === "active_bond").length), color: Colors.green },
    { label: "At Risk", value: String(bonds.filter((b) => (b.status ?? "").toLowerCase() === "at_risk").length), color: Colors.red },
    {
      label: "Total Value",
      value: fmtMoney(bonds.reduce((sum, b) => sum + (parseFloat(String(b.bond_amount ?? "0").replace(/[$,]/g, "")) || 0), 0)),
      color: Colors.blueBright,
    },
  ]

  const statusTabs = ["all", "active_bond", "approved", "at_risk", "closed", "revoked"]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.blue + "18", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="shield-checkmark-outline" size={17} color={Colors.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Bonds</Text>
          <Text style={s.subtitle}>{bonds.length} total bonds</Text>
        </View>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>New Bond</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Row */}
      <View style={s.kpiRow}>
        {kpis.map((k) => (
          <View key={k.label} style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
        <TextInput
          style={s.searchInput}
          placeholder="Search defendant, bond #, county..."
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

      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsRow}>
        {statusTabs.map((t) => {
          const label = t === "all" ? `All (${bonds.length})` : `${STATUS_LABELS[t] ?? t} (${statusCounts[t] ?? 0})`
          return (
            <TouchableOpacity
              key={t}
              style={[s.tab, statusFilter === t && s.tabActive]}
              onPress={() => { setStatusFilter(t); applyFilters(query, t) }}
            >
              <Text style={[s.tabText, statusFilter === t && s.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          )
        })}
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
              <Ionicons name="shield-outline" size={48} color={Colors.mutedDim} />
              <Text style={s.emptyTitle}>No bonds found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const defName = item.defendant_name ?? item.defendant ?? "Unknown"
            const initials = defName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"
            const status = (item.status ?? "approved").toLowerCase()
            const sc = STATUS_COLORS[status] ?? { bg: Colors.mutedDim + "18", text: Colors.mutedDim }
            const statusLabel = STATUS_LABELS[status] ?? item.status ?? "Unknown"
            const courtDate = item.court_date ? new Date(item.court_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null
            const charges: string[] = Array.isArray(item.charges)
              ? item.charges.map((c: any) => typeof c === "string" ? c : c.charge ?? c.type ?? "").filter(Boolean)
              : (item.charges ? [item.charges] : [])

            return (
              <TouchableOpacity style={s.card} activeOpacity={0.8}>
                <View style={s.cardTop}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.defName}>{defName}</Text>
                    {!!item.bond_number && <Text style={s.bondNum}>Bond #{item.bond_number}</Text>}
                    {!item.bond_number && !!item.id && <Text style={s.bondNum}>#{item.id}</Text>}
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.statusText, { color: sc.text }]}>{statusLabel}</Text>
                  </View>
                </View>

                <View style={s.amountsRow}>
                  <View style={s.amountBox}>
                    <Text style={s.amountLabel}>Bond Amount</Text>
                    <Text style={s.amountValue}>{fmtMoney(item.bond_amount)}</Text>
                  </View>
                  {item.premium != null && Number(item.premium) > 0 && (
                    <View style={s.amountBox}>
                      <Text style={s.amountLabel}>Premium</Text>
                      <Text style={[s.amountValue, { color: Colors.green }]}>{fmtMoney(item.premium)}</Text>
                    </View>
                  )}
                  {item.balance != null && Number(item.balance) > 0 && (
                    <View style={s.amountBox}>
                      <Text style={s.amountLabel}>Balance</Text>
                      <Text style={[s.amountValue, { color: Colors.gold }]}>{fmtMoney(item.balance)}</Text>
                    </View>
                  )}
                </View>

                <View style={s.metaRow}>
                  {!!item.county && (
                    <View style={s.metaItem}>
                      <Ionicons name="location-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>{item.county}</Text>
                    </View>
                  )}
                  {courtDate && (
                    <View style={s.metaItem}>
                      <Ionicons name="calendar-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>{courtDate}</Text>
                    </View>
                  )}
                  {!!item.surety && (
                    <View style={s.metaItem}>
                      <Ionicons name="business-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>{item.surety}</Text>
                    </View>
                  )}
                </View>

                {charges.length > 0 && (
                  <View style={s.chargesRow}>
                    {charges.slice(0, 2).map((ch, ci) => (
                      <View key={ci} style={s.chargePill}>
                        <Text style={s.chargePillText} numberOfLines={1}>{ch.length > 30 ? ch.slice(0, 28) + "…" : ch}</Text>
                      </View>
                    ))}
                    {charges.length > 2 && (
                      <View style={s.moreCharges}>
                        <Text style={s.moreChargesText}>+{charges.length - 2}</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={s.cardFooter}>
                  <TouchableOpacity style={s.footerAction}>
                    <Ionicons name="eye-outline" size={14} color={Colors.blueBright} />
                    <Text style={s.footerActionText}>View Details</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity style={s.footerAction}>
                    <Ionicons name="create-outline" size={14} color={Colors.mutedDim} />
                    <Text style={[s.footerActionText, { color: Colors.mutedDim }]}>Update</Text>
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
  defName: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  bondNum: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  statusText: { fontSize: 10, fontFamily: Font.bold },
  amountsRow: { flexDirection: "row", gap: Spacing.xl, marginBottom: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderFaint },
  amountBox: {},
  amountLabel: { fontSize: 10, color: Colors.mutedDim, marginBottom: 2 },
  amountValue: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.extrabold },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: Spacing.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.muted },
  chargesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: Spacing.md },
  chargePill: { backgroundColor: Colors.red + "14", borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.red + "25", paddingHorizontal: 8, paddingVertical: 3 },
  chargePillText: { fontSize: 10, color: Colors.red + "cc", fontFamily: Font.medium },
  moreCharges: { backgroundColor: Colors.bgPanel, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  moreChargesText: { fontSize: 10, color: Colors.mutedDim },
  cardFooter: { flexDirection: "row", alignItems: "center", paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderFaint },
  footerAction: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8 },
  footerActionText: { fontSize: FontSize.xs, color: Colors.blueBright, fontFamily: Font.semibold },
})
