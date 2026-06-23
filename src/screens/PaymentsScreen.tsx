import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

function fmtMoney(v: any): string {
  const n = parseFloat(String(v ?? "0").replace(/[$,]/g, ""))
  if (!n && n !== 0) return "—"
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: string): string {
  if (!d) return "—"
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }
  catch { return d }
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  paid: { bg: Colors.green + "18", text: Colors.green },
  Paid: { bg: Colors.green + "18", text: Colors.green },
  completed: { bg: Colors.green + "18", text: Colors.green },
  pending: { bg: Colors.gold + "18", text: Colors.gold },
  Pending: { bg: Colors.gold + "18", text: Colors.gold },
  due: { bg: Colors.gold + "18", text: Colors.gold },
  Due: { bg: Colors.gold + "18", text: Colors.gold },
  overdue: { bg: Colors.red + "18", text: Colors.red },
  Overdue: { bg: Colors.red + "18", text: Colors.red },
  failed: { bg: Colors.red + "18", text: Colors.red },
  partial: { bg: Colors.orange + "18", text: Colors.orange },
}

const PAYMENT_TYPE_ICONS: Record<string, string> = {
  premium: "shield-checkmark-outline",
  Premium: "shield-checkmark-outline",
  fee: "receipt-outline",
  Fee: "receipt-outline",
  collateral: "lock-closed-outline",
  Collateral: "lock-closed-outline",
  refund: "return-up-back-outline",
  Refund: "return-up-back-outline",
}

export function PaymentsScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [payments, setPayments] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!identity) return
    api.payments(identity).then((res: any) => {
      const raw = res?.data?.results ?? res?.data ?? res?.results ?? res
      setPayments(Array.isArray(raw) ? raw : [])
      setFiltered(Array.isArray(raw) ? raw : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [identity])

  const applyFilters = (q: string, status: string, source = payments) => {
    let out = source
    if (status !== "all") {
      out = out.filter((p) => (p.status ?? "").toLowerCase() === status.toLowerCase())
    }
    if (q.trim()) {
      const lq = q.toLowerCase()
      out = out.filter((p) =>
        (p.client_name ?? p.client ?? "").toLowerCase().includes(lq) ||
        (p.payment_type ?? p.type ?? "").toLowerCase().includes(lq)
      )
    }
    setFiltered(out)
  }

  const totalCollected = payments.filter((p) => ["paid", "completed", "Paid"].includes(p.status ?? "")).reduce((sum, p) => sum + (parseFloat(String(p.amount ?? "0").replace(/[$,]/g, "")) || 0), 0)
  const totalOutstanding = payments.filter((p) => ["pending", "due", "Pending", "Due"].includes(p.status ?? "")).reduce((sum, p) => sum + (parseFloat(String(p.amount ?? "0").replace(/[$,]/g, "")) || 0), 0)
  const totalOverdue = payments.filter((p) => ["overdue", "Overdue"].includes(p.status ?? "")).reduce((sum, p) => sum + (parseFloat(String(p.amount ?? "0").replace(/[$,]/g, "")) || 0), 0)

  const kpis = [
    { label: "Collected", value: fmtMoney(totalCollected), color: Colors.green },
    { label: "Outstanding", value: fmtMoney(totalOutstanding), color: Colors.gold },
    { label: "Overdue", value: fmtMoney(totalOverdue), color: Colors.red },
    { label: "Total", value: String(payments.length), color: Colors.text },
  ]

  const statusTabs = ["all", "paid", "pending", "overdue"]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.green + "18", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="card-outline" size={17} color={Colors.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Payments</Text>
          <Text style={s.subtitle}>Integrated payment tracking</Text>
        </View>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>Record</Text>
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
          placeholder="Search client, type..."
          placeholderTextColor={Colors.mutedDim}
          value={query}
          onChangeText={(t) => { setQuery(t); applyFilters(t, statusFilter) }}
        />
      </View>

      {/* Status tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsRow}>
        {statusTabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tab, statusFilter === t && s.tabActive]}
            onPress={() => { setStatusFilter(t); applyFilters(query, t) }}
          >
            <Text style={[s.tabText, statusFilter === t && s.tabTextActive]}>
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
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
              <Ionicons name="card-outline" size={48} color={Colors.mutedDim} />
              <Text style={s.emptyTitle}>No payments found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const status = item.status ?? "pending"
            const sc = STATUS_COLORS[status] ?? STATUS_COLORS.pending
            const type = item.payment_type ?? item.type ?? "Payment"
            const typeIcon = PAYMENT_TYPE_ICONS[type] ?? "card-outline"
            const clientName = item.client_name ?? item.client ?? "Unknown Client"
            const date = item.payment_date ?? item.date ?? item.created_at ?? ""
            const method = item.payment_method ?? item.method ?? ""

            return (
              <View style={s.card}>
                <View style={s.cardTop}>
                  <View style={[s.typeIcon, { backgroundColor: Colors.blue + "18" }]}>
                    <Ionicons name={typeIcon as any} size={20} color={Colors.blueBright} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.clientName}>{clientName}</Text>
                    <Text style={s.paymentType}>{type}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <Text style={s.amount}>{fmtMoney(item.amount)}</Text>
                    <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.statusText, { color: sc.text }]}>{status}</Text>
                    </View>
                  </View>
                </View>

                <View style={s.metaRow}>
                  {!!date && (
                    <View style={s.metaItem}>
                      <Ionicons name="calendar-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>{fmtDate(date)}</Text>
                    </View>
                  )}
                  {!!method && (
                    <View style={s.metaItem}>
                      <Ionicons name="card-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>{method}</Text>
                    </View>
                  )}
                  {item.bond_id != null && (
                    <View style={s.metaItem}>
                      <Ionicons name="shield-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>Bond #{item.bond_id}</Text>
                    </View>
                  )}
                </View>

                {!!item.notes && (
                  <Text style={s.notes} numberOfLines={2}>{item.notes}</Text>
                )}

                <View style={s.cardFooter}>
                  <TouchableOpacity style={s.footerAction}>
                    <Ionicons name="receipt-outline" size={14} color={Colors.blueBright} />
                    <Text style={s.footerActionText}>Receipt</Text>
                  </TouchableOpacity>
                  {["pending", "due", "Pending", "Due"].includes(status) && (
                    <TouchableOpacity style={[s.footerAction, { backgroundColor: Colors.green + "18", borderRadius: Radius.sm }]}>
                      <Ionicons name="checkmark-outline" size={14} color={Colors.green} />
                      <Text style={[s.footerActionText, { color: Colors.green }]}>Mark Paid</Text>
                    </TouchableOpacity>
                  )}
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
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginHorizontal: Spacing.xl, marginVertical: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  subtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: Radius.sm, backgroundColor: Colors.blue },
  addBtnText: { fontSize: FontSize.xs, color: "#fff", fontFamily: Font.bold },
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.lg, fontFamily: Font.extrabold },
  kpiLabel: { fontSize: 9, color: Colors.mutedDim, marginTop: 2, textAlign: "center" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, height: 44 },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm },
  tabsScroll: { marginBottom: Spacing.md, height: 38 },
  tabsRow: { paddingHorizontal: Spacing.xl, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.xl, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  tabText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  tabTextActive: { color: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.bold },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md, marginBottom: Spacing.md },
  typeIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  clientName: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  paymentType: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  amount: { fontSize: FontSize.xl, color: Colors.text, fontFamily: Font.extrabold },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  statusText: { fontSize: 10, fontFamily: Font.bold },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: Spacing.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.muted },
  notes: { fontSize: FontSize.xs, color: Colors.mutedDim, marginBottom: Spacing.sm, fontStyle: "italic" },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderFaint },
  footerAction: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5, paddingHorizontal: 8 },
  footerActionText: { fontSize: FontSize.xs, color: Colors.blueBright, fontFamily: Font.semibold },
})
