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
  const [refreshing, setRefreshing] = useState(false)
  const [markingId, setMarkingId] = useState<number | null>(null)
  const [showRecord, setShowRecord] = useState(false)
  const [recordForm, setRecordForm] = useState({ client_name: "", amount: "", payment_type: "Premium", notes: "" })
  const [recording, setRecording] = useState(false)

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const res: any = await api.payments(identity)
      const raw = res?.data?.results ?? res?.data ?? res?.results ?? res
      const list = Array.isArray(raw) ? raw : []
      setPayments(list)
      applyFilters(query, statusFilter, list)
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
        (p.client_name ?? p.client ?? "").toLowerCase().includes(lq) ||
        (p.payment_type ?? p.type ?? "").toLowerCase().includes(lq)
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

  const handleSendReceipt = async (item: any) => {
    if (!identity) return
    try {
      await api.emailReceipt(identity, { payment_id: item.id })
      Alert.alert("Sent", "Receipt has been emailed to the client.")
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not send receipt")
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
        status: "paid",
      })
      setShowRecord(false)
      setRecordForm({ client_name: "", amount: "", payment_type: "Premium", notes: "" })
      load()
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not record payment")
    } finally { setRecording(false) }
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

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.green + "12", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.green + "30" }}>
          <Ionicons name="card-outline" size={17} color={Colors.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Payments</Text>
          <Text style={s.subtitle}>Integrated payment tracking</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowRecord(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>Record</Text>
        </TouchableOpacity>
      </View>

      <View style={s.kpiRow}>
        {kpis.map((k) => (
          <View key={k.label} style={s.kpiCard}>
            <Text style={s.kpiValue}>{k.value}</Text>
            <Text style={[s.kpiLabel, { color: k.color }]}>{k.label}</Text>
          </View>
        ))}
      </View>

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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsRow}>
        {["all", "paid", "pending", "overdue"].map((t) => (
          <TouchableOpacity key={t} style={[s.tab, statusFilter === t && s.tabActive]} onPress={() => { setStatusFilter(t); applyFilters(query, t) }}>
            <Text style={[s.tabText, statusFilter === t && s.tabTextActive]}>{t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}</Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={Colors.blue} />}
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
            const isPending = ["pending", "due", "Pending", "Due"].includes(status)

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
                  {!!date && <View style={s.metaItem}><Ionicons name="calendar-outline" size={12} color={Colors.mutedDim} /><Text style={s.metaText}>{fmtDate(date)}</Text></View>}
                  {!!method && <View style={s.metaItem}><Ionicons name="card-outline" size={12} color={Colors.mutedDim} /><Text style={s.metaText}>{method}</Text></View>}
                  {item.bond_id != null && <View style={s.metaItem}><Ionicons name="shield-outline" size={12} color={Colors.mutedDim} /><Text style={s.metaText}>Bond #{item.bond_id}</Text></View>}
                </View>

                {!!item.notes && <Text style={s.notes} numberOfLines={2}>{item.notes}</Text>}

                <View style={s.cardFooter}>
                  <TouchableOpacity style={s.footerAction} onPress={() => handleSendReceipt(item)}>
                    <Ionicons name="receipt-outline" size={14} color={Colors.blueBright} />
                    <Text style={s.footerActionText}>Receipt</Text>
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
          }}
        />
      )}

      {/* Record Payment Modal */}
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
              <View style={s.field}>
                <Text style={s.fieldLabel}>Client Name *</Text>
                <TextInput style={s.fieldInput} value={recordForm.client_name} onChangeText={(v) => setRecordForm((f) => ({ ...f, client_name: v }))} placeholder="Client name" placeholderTextColor={Colors.mutedDim} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Amount *</Text>
                <TextInput style={s.fieldInput} value={recordForm.amount} onChangeText={(v) => setRecordForm((f) => ({ ...f, amount: v }))} placeholder="0.00" placeholderTextColor={Colors.mutedDim} keyboardType="decimal-pad" />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {["Premium", "Fee", "Collateral", "Refund"].map((t) => (
                    <TouchableOpacity key={t} style={[s.typeChip, recordForm.payment_type === t && s.typeChipActive]} onPress={() => setRecordForm((f) => ({ ...f, payment_type: t }))}>
                      <Text style={[s.typeChipText, recordForm.payment_type === t && { color: "#fff" }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Notes</Text>
                <TextInput style={[s.fieldInput, { height: 72, textAlignVertical: "top" }]} value={recordForm.notes} onChangeText={(v) => setRecordForm((f) => ({ ...f, notes: v }))} placeholder="Optional notes..." placeholderTextColor={Colors.mutedDim} multiline />
              </View>
              <TouchableOpacity style={[s.submitBtn, recording && { opacity: 0.6 }]} onPress={handleRecord} disabled={recording}>
                {recording ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.submitBtnText}>Record Payment</Text>}
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
  backBtn: { width: 36, height: 36, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  subtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.blueSubtle, borderWidth: 1, borderColor: Colors.blueBorder },
  addBtnText: { fontSize: FontSize.xs, color: Colors.blueLight, fontFamily: Font.bold },
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.lg, fontFamily: Font.extrabold },
  kpiLabel: { fontSize: 9, fontFamily: Font.semibold, marginTop: 3, textAlign: "center" },
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
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.bgPanel, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.extrabold },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold, marginBottom: 6 },
  fieldInput: { backgroundColor: Colors.bgInput, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 13, color: Colors.text, fontSize: FontSize.sm },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.xl, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border },
  typeChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  typeChipText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold, letterSpacing: 0.2 },
  submitBtn: { height: 52, borderRadius: Radius.lg, backgroundColor: Colors.blue, alignItems: "center", justifyContent: "center", marginTop: Spacing.md },
  submitBtnText: { color: "#fff", fontSize: FontSize.md, fontFamily: Font.bold },
})
