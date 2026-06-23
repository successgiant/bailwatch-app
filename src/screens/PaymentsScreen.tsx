import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

function fmtMoney(v: any): string {
  const n = parseFloat(String(v ?? "0").replace(/[$,]/g, ""))
  if (isNaN(n)) return "—"
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: string): string {
  if (!d) return "—"
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }
  catch { return d }
}

function parseAmt(v: any): number {
  return parseFloat(String(v ?? "0").replace(/[$,]/g, "")) || 0
}

function isThisMonth(d: string): boolean {
  if (!d) return false
  try {
    const dt = new Date(d)
    const now = new Date()
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
  } catch { return false }
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  paid: { bg: Colors.green + "18", text: Colors.green },
  completed: { bg: Colors.green + "18", text: Colors.green },
  pending: { bg: Colors.gold + "18", text: Colors.gold },
  upcoming: { bg: Colors.gold + "18", text: Colors.gold },
  due: { bg: Colors.gold + "18", text: Colors.gold },
  overdue: { bg: Colors.red + "18", text: Colors.red },
  failed: { bg: Colors.red + "18", text: Colors.red },
  partial: { bg: Colors.orange + "18", text: Colors.orange },
}

function statusColor(status: string): { bg: string; text: string } {
  return STATUS_COLORS[(status ?? "").toLowerCase()] ?? { bg: Colors.mutedDim + "18", text: Colors.mutedDim }
}

const PAYMENT_TYPE_ICONS: Record<string, string> = {
  cash: "cash-outline",
  card: "card-outline",
  check: "document-text-outline",
  ach: "swap-horizontal-outline",
  premium: "shield-checkmark-outline",
  fee: "receipt-outline",
  collateral: "lock-closed-outline",
  refund: "return-up-back-outline",
}

function typeIcon(t: string): string {
  return PAYMENT_TYPE_ICONS[(t ?? "").toLowerCase()] ?? "card-outline"
}

const PAYMENT_TYPES = ["Cash", "Card", "Check", "ACH"]
const FILTER_TABS = ["all", "paid", "pending", "overdue"]

export function PaymentsScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [payments, setPayments] = useState<any[]>([])
  const [paymentLinks, setPaymentLinks] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [activeSection, setActiveSection] = useState<"summary" | "transactions" | "links">("summary")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [markingId, setMarkingId] = useState<number | null>(null)
  const [reminderIds, setReminderIds] = useState<Set<number>>(new Set())
  const [showRecord, setShowRecord] = useState(false)
  const [recordForm, setRecordForm] = useState({ client_name: "", amount: "", payment_type: "Cash", notes: "", date: "" })
  const [recording, setRecording] = useState(false)

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const res: any = await api.payments(identity)
      const raw = res?.payments ?? res?.data?.results ?? res?.data ?? res?.results ?? res
      const list: any[] = Array.isArray(raw) ? raw : []
      const mapped = list.map((item: any) => ({
        ...item,
        client_name: item.defendant?.full_name ?? item.client_name ?? item.defendant_name ?? "",
        amount: item.amount,
        status: item.status,
        payment_date: item.payment_date ?? item.due_date ?? item.created_at ?? "",
        method: item.payment_method ?? item.method ?? "",
        notes: item.notes ?? "",
      }))
      setPayments(mapped)
      applyFilters(query, statusFilter, mapped)
      const links = res?.payment_links ?? []
      setPaymentLinks(Array.isArray(links) ? links : [])
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const applyFilters = (q: string, status: string, source = payments) => {
    let out = source
    if (status !== "all") out = out.filter((p) => (p.status ?? "").toLowerCase() === status.toLowerCase())
    if (q.trim()) {
      const lq = q.toLowerCase()
      out = out.filter((p) =>
        (p.client_name ?? "").toLowerCase().includes(lq) ||
        (p.method ?? "").toLowerCase().includes(lq)
      )
    }
    setFiltered(out)
  }

  const handleMarkPaid = async (item: any) => {
    if (!identity) return
    Alert.alert("Mark as Paid", `Mark ${fmtMoney(item.amount)} payment as paid?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Mark Paid", onPress: async () => {
        setMarkingId(item.id)
        try {
          await api.updatePayment(identity, item.id, { status: "paid" })
          const updated = payments.map((p) => p.id === item.id ? { ...p, status: "paid" } : p)
          setPayments(updated)
          applyFilters(query, statusFilter, updated)
        } catch (e: any) {
          Alert.alert("Error", e?.message ?? "Could not update payment")
        } finally { setMarkingId(null) }
      }},
    ])
  }

  const handleSendReminder = async (item: any) => {
    if (!identity) return
    setReminderIds((prev) => new Set(prev).add(item.id))
    try {
      await api.sendPaymentReminder(identity, { payment_id: item.id })
      Alert.alert("Sent", "Payment reminder sent.")
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not send reminder")
    } finally {
      setReminderIds((prev) => { const s = new Set(prev); s.delete(item.id); return s })
    }
  }

  const handleRecord = async () => {
    if (!identity) return
    if (!recordForm.client_name.trim() || !recordForm.amount.trim()) {
      Alert.alert("Required", "Please enter client name and amount."); return
    }
    setRecording(true)
    try {
      await api.createPayment(identity, {
        client_name: recordForm.client_name,
        amount: recordForm.amount,
        payment_type: recordForm.payment_type,
        notes: recordForm.notes,
        payment_date: recordForm.date || undefined,
        status: "paid",
      })
      setShowRecord(false)
      setRecordForm({ client_name: "", amount: "", payment_type: "Cash", notes: "", date: "" })
      load()
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not record payment")
    } finally { setRecording(false) }
  }

  const totalCollected = payments.filter((p) => ["paid", "completed"].includes((p.status ?? "").toLowerCase())).reduce((sum, p) => sum + parseAmt(p.amount), 0)
  const totalOutstanding = payments.filter((p) => ["pending", "upcoming", "due"].includes((p.status ?? "").toLowerCase())).reduce((sum, p) => sum + parseAmt(p.amount), 0)
  const overdueCount = payments.filter((p) => (p.status ?? "").toLowerCase() === "overdue").length
  const thisMonth = payments.filter((p) => isThisMonth(p.payment_date)).reduce((sum, p) => sum + parseAmt(p.amount), 0)

  const kpis = [
    { label: "Collected", value: fmtMoney(totalCollected), color: Colors.green },
    { label: "Outstanding", value: fmtMoney(totalOutstanding), color: Colors.gold },
    { label: "Overdue", value: String(overdueCount), color: Colors.red },
    { label: "This Month", value: fmtMoney(thisMonth), color: Colors.blueBright },
  ]

  const sections = [
    { key: "summary" as const, label: "Summary" },
    { key: "transactions" as const, label: "Transactions" },
    { key: "links" as const, label: "Payment Links" },
  ]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.blueIconBg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.blueIconBorder }}>
          <Ionicons name="card-outline" size={17} color={Colors.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Payments</Text>
          <Text style={s.subtitle}>Integrated payment tracking</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowRecord(true)}>
          <Ionicons name="add" size={18} color={Colors.blueLight} />
          <Text style={s.addBtnText}>Record</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.sectionTabsScroll} contentContainerStyle={s.sectionTabsRow}>
        {sections.map((sec) => (
          <TouchableOpacity
            key={sec.key}
            style={[s.sectionTab, activeSection === sec.key && s.sectionTabActive]}
            onPress={() => setActiveSection(sec.key)}
          >
            <Text style={[s.sectionTabText, activeSection === sec.key && s.sectionTabTextActive]}>{sec.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.blue} /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={Colors.blue} />}
        >
          {activeSection === "summary" && (
            <View style={{ paddingHorizontal: Spacing.xl, gap: 10 }}>
              <View style={s.kpiGrid}>
                {kpis.map((k) => (
                  <View key={k.label} style={s.kpiCard}>
                    <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
                    <Text style={s.kpiLabel}>{k.label}</Text>
                  </View>
                ))}
              </View>
              <View style={s.summaryCard}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Total Payments</Text>
                  <Text style={s.summaryValue}>{payments.length}</Text>
                </View>
                <View style={[s.summaryRow, { borderTopWidth: 1, borderTopColor: Colors.borderFaint, paddingTop: Spacing.md }]}>
                  <Text style={s.summaryLabel}>Paid</Text>
                  <Text style={[s.summaryValue, { color: Colors.green }]}>{payments.filter((p) => ["paid", "completed"].includes((p.status ?? "").toLowerCase())).length}</Text>
                </View>
                <View style={[s.summaryRow, { borderTopWidth: 1, borderTopColor: Colors.borderFaint, paddingTop: Spacing.md }]}>
                  <Text style={s.summaryLabel}>Pending</Text>
                  <Text style={[s.summaryValue, { color: Colors.gold }]}>{payments.filter((p) => ["pending", "upcoming", "due"].includes((p.status ?? "").toLowerCase())).length}</Text>
                </View>
                <View style={[s.summaryRow, { borderTopWidth: 1, borderTopColor: Colors.borderFaint, paddingTop: Spacing.md }]}>
                  <Text style={s.summaryLabel}>Overdue</Text>
                  <Text style={[s.summaryValue, { color: Colors.red }]}>{overdueCount}</Text>
                </View>
              </View>
            </View>
          )}

          {activeSection === "transactions" && (
            <View style={{ gap: 0 }}>
              <View style={s.searchWrap}>
                <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search client, method..."
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

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsRow}>
                {FILTER_TABS.map((t) => (
                  <TouchableOpacity key={t} style={[s.tab, statusFilter === t && s.tabActive]} onPress={() => { setStatusFilter(t); applyFilters(query, t) }}>
                    <Text style={[s.tabText, statusFilter === t && s.tabTextActive]}>{t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {filtered.length === 0 ? (
                <View style={s.center}>
                  <Ionicons name="card-outline" size={48} color={Colors.mutedDim} />
                  <Text style={s.emptyTitle}>No payments found</Text>
                </View>
              ) : (
                <View style={{ paddingHorizontal: Spacing.xl, gap: 10 }}>
                  {filtered.map((item) => {
                    const st = item.status ?? "pending"
                    const sc = statusColor(st)
                    const pType = item.payment_type ?? item.type ?? "Payment"
                    const pIcon = typeIcon(pType)
                    const clientName = item.client_name || "Unknown Client"
                    const date = item.payment_date ?? ""
                    const method = item.method ?? ""
                    const isPending = ["pending", "due", "upcoming"].includes(st.toLowerCase())

                    return (
                      <View key={String(item.id ?? Math.random())} style={s.card}>
                        <View style={s.cardTop}>
                          <View style={s.typeIcon}>
                            <Ionicons name={pIcon as any} size={20} color={Colors.blueBright} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.clientName}>{clientName}</Text>
                            <Text style={s.paymentType}>{pType}</Text>
                          </View>
                          <View style={{ alignItems: "flex-end", gap: 6 }}>
                            <Text style={s.amount}>{fmtMoney(item.amount)}</Text>
                            <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                              <Text style={[s.statusText, { color: sc.text }]}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
                            </View>
                          </View>
                        </View>

                        <View style={s.metaRow}>
                          {!!date && <View style={s.metaItem}><Ionicons name="calendar-outline" size={12} color={Colors.mutedDim} /><Text style={s.metaText}>{fmtDate(date)}</Text></View>}
                          {!!method && <View style={s.metaItem}><Ionicons name="card-outline" size={12} color={Colors.mutedDim} /><Text style={s.metaText}>{method}</Text></View>}
                          {item.bond_id != null && <View style={s.metaItem}><Ionicons name="shield-outline" size={12} color={Colors.mutedDim} /><Text style={s.metaText}>Bond #{item.bond_id}</Text></View>}
                        </View>

                        {!!item.notes && <Text style={s.notes} numberOfLines={2}>{item.notes}</Text>}

                        <View style={s.cardFooter}>
                          <TouchableOpacity style={s.footerAction} onPress={() => handleSendReminder(item)} disabled={reminderIds.has(item.id)}>
                            {reminderIds.has(item.id)
                              ? <ActivityIndicator size="small" color={Colors.blueBright} />
                              : <Ionicons name="notifications-outline" size={14} color={Colors.blueBright} />
                            }
                            <Text style={s.footerActionText}>Remind</Text>
                          </TouchableOpacity>
                          {isPending && (
                            <TouchableOpacity
                              style={[s.footerAction, { backgroundColor: Colors.green + "18", borderRadius: Radius.sm }]}
                              onPress={() => handleMarkPaid(item)}
                              disabled={markingId === item.id}
                            >
                              {markingId === item.id
                                ? <ActivityIndicator size="small" color={Colors.green} />
                                : <><Ionicons name="checkmark-outline" size={14} color={Colors.green} /><Text style={[s.footerActionText, { color: Colors.green }]}>Mark Paid</Text></>
                              }
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )
                  })}
                </View>
              )}
            </View>
          )}

          {activeSection === "links" && (
            <View style={{ paddingHorizontal: Spacing.xl, gap: 10 }}>
              {paymentLinks.length === 0 ? (
                <View style={s.emptyLinksCard}>
                  <Ionicons name="link-outline" size={40} color={Colors.mutedDim} />
                  <Text style={s.emptyTitle}>No Payment Links</Text>
                  <Text style={s.emptyText}>Create payment links from the web dashboard</Text>
                </View>
              ) : (
                paymentLinks.map((link: any, idx: number) => (
                  <View key={String(link.id ?? idx)} style={s.card}>
                    <Text style={s.clientName}>{link.label ?? link.name ?? "Payment Link"}</Text>
                    <Text style={s.paymentType}>{fmtMoney(link.amount)}</Text>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={showRecord} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
            <View style={s.modalCard}>
              <View style={{ width: 40, height: 4, backgroundColor: Colors.dragHandle, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Record Payment</Text>
                <TouchableOpacity onPress={() => setShowRecord(false)}>
                  <Ionicons name="close" size={22} color={Colors.muted} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={s.field}>
                  <Text style={s.fieldLabel}>Client Name *</Text>
                  <TextInput style={s.fieldInput} value={recordForm.client_name} onChangeText={(v) => setRecordForm((f) => ({ ...f, client_name: v }))} placeholder="Client name" placeholderTextColor={Colors.mutedDim} />
                </View>
                <View style={s.field}>
                  <Text style={s.fieldLabel}>Amount *</Text>
                  <TextInput style={s.fieldInput} value={recordForm.amount} onChangeText={(v) => setRecordForm((f) => ({ ...f, amount: v }))} placeholder="0.00" placeholderTextColor={Colors.mutedDim} keyboardType="decimal-pad" />
                </View>
                <View style={s.field}>
                  <Text style={s.fieldLabel}>Payment Type</Text>
                  <View style={s.chipRow}>
                    {PAYMENT_TYPES.map((t) => (
                      <TouchableOpacity key={t} style={[s.typeChip, recordForm.payment_type === t && s.typeChipActive]} onPress={() => setRecordForm((f) => ({ ...f, payment_type: t }))}>
                        <Text style={[s.typeChipText, recordForm.payment_type === t && { color: Colors.text }]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={s.field}>
                  <Text style={s.fieldLabel}>Date</Text>
                  <TextInput style={s.fieldInput} value={recordForm.date} onChangeText={(v) => setRecordForm((f) => ({ ...f, date: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.mutedDim} />
                </View>
                <View style={s.field}>
                  <Text style={s.fieldLabel}>Notes</Text>
                  <TextInput style={[s.fieldInput, { height: 72, textAlignVertical: "top" }]} value={recordForm.notes} onChangeText={(v) => setRecordForm((f) => ({ ...f, notes: v }))} placeholder="Optional notes..." placeholderTextColor={Colors.mutedDim} multiline />
                </View>
                <TouchableOpacity style={[s.submitBtn, recording && { opacity: 0.6 }]} onPress={handleRecord} disabled={recording}>
                  {recording ? <ActivityIndicator size="small" color={Colors.text} /> : <Text style={s.submitBtnText}>Record Payment</Text>}
                </TouchableOpacity>
              </ScrollView>
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
  backBtn: { width: 36, height: 36, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  subtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.blueSubtle, borderWidth: 1, borderColor: Colors.blueBorder },
  addBtnText: { fontSize: FontSize.xs, color: Colors.blueLight, fontFamily: Font.bold },
  sectionTabsScroll: { marginBottom: Spacing.md, height: 42 },
  sectionTabsRow: { paddingHorizontal: Spacing.xl, gap: 8, alignItems: "center" },
  sectionTab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.xl, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  sectionTabActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  sectionTabText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  sectionTabTextActive: { color: Colors.text },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiCard: { width: "47%", backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.lg, fontFamily: Font.extrabold, color: Colors.text },
  kpiLabel: { fontSize: 9, fontFamily: Font.semibold, marginTop: 3, textAlign: "center", color: Colors.muted },
  summaryCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.muted },
  summaryValue: { fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.bold },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, height: 44 },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm },
  tabsScroll: { marginBottom: Spacing.md, height: 38 },
  tabsRow: { paddingHorizontal: Spacing.xl, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.xl, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  tabText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  tabTextActive: { color: Colors.text },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.bold, marginTop: Spacing.md },
  emptyText: { fontSize: FontSize.sm, color: Colors.mutedDim, textAlign: "center" },
  emptyLinksCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 40, alignItems: "center", gap: Spacing.sm },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md, marginBottom: Spacing.md },
  typeIcon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.blueIconBg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.blueIconBorder },
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.bgPanel, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.extrabold },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold, marginBottom: 6 },
  fieldInput: { backgroundColor: Colors.bgInput, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 13, color: Colors.text, fontSize: FontSize.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 4 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.xl, backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border },
  typeChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  typeChipText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold, letterSpacing: 0.2 },
  submitBtn: { height: 52, borderRadius: Radius.lg, backgroundColor: Colors.blue, alignItems: "center", justifyContent: "center", marginTop: Spacing.md },
  submitBtnText: { color: Colors.text, fontSize: FontSize.md, fontFamily: Font.bold },
})
