import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform, Linking } from "react-native"
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
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}`
}

function daysUntilExpiry(d: string): number {
  if (!d) return Infinity
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const exp = new Date(d); exp.setHours(0, 0, 0, 0)
    return Math.ceil((exp.getTime() - today.getTime()) / 86400000)
  } catch { return Infinity }
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: Colors.green + "18", text: Colors.green },
  Active: { bg: Colors.green + "18", text: Colors.green },
  used: { bg: Colors.blue + "18", text: Colors.blueBright },
  Used: { bg: Colors.blue + "18", text: Colors.blueBright },
  expired: { bg: Colors.red + "18", text: Colors.red },
  Expired: { bg: Colors.red + "18", text: Colors.red },
  voided: { bg: Colors.mutedDim + "18", text: Colors.mutedDim },
  Voided: { bg: Colors.mutedDim + "18", text: Colors.mutedDim },
  available: { bg: Colors.green + "18", text: Colors.green },
  Available: { bg: Colors.green + "18", text: Colors.green },
}

export function PowersScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [powers, setPowers] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ power_number: "", defendant_name: "", amount: "", surety: "", expiry_date: "" })
  const [adding, setAdding] = useState(false)

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const res: any = await api.powers(identity)
      const raw = res?.data?.results ?? res?.data ?? res?.results ?? res
      const arr = Array.isArray(raw) ? raw : []
      setPowers(arr)
      applyFilters(query, statusFilter, arr)
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const applyFilters = (q: string, status: string, source = powers) => {
    let out = source
    if (status !== "all") out = out.filter((p) => (p.status ?? "").toLowerCase() === status.toLowerCase())
    if (q.trim()) {
      const lq = q.toLowerCase()
      out = out.filter((p) =>
        (p.power_number ?? p.power_id ?? "").toString().toLowerCase().includes(lq) ||
        (p.defendant_name ?? p.defendant ?? "").toLowerCase().includes(lq) ||
        (p.surety ?? p.surety_company ?? "").toLowerCase().includes(lq)
      )
    }
    setFiltered(out)
  }

  const handleAdd = async () => {
    if (!identity) return
    if (!addForm.power_number.trim()) { Alert.alert("Required", "Please enter a power number."); return }
    setAdding(true)
    try {
      await api.createPower(identity, addForm)
      setShowAdd(false)
      setAddForm({ power_number: "", defendant_name: "", amount: "", surety: "", expiry_date: "" })
      load()
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not add power")
    } finally { setAdding(false) }
  }

  const handleView = (item: any) => {
    const url = item.document_url ?? item.file_url ?? item.pdf_url ?? item.view_url ?? ""
    if (!url) { Alert.alert("Unavailable", "No document link available."); return }
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open document."))
  }

  const handleDownload = (item: any) => {
    const url = item.download_url ?? item.document_url ?? item.file_url ?? item.pdf_url ?? ""
    if (!url) { Alert.alert("Unavailable", "No download link available."); return }
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not download document."))
  }

  const totalValue = powers.reduce((sum, p) => sum + (parseFloat(String(p.amount ?? p.bond_amount ?? "0").replace(/[$,]/g, "")) || 0), 0)
  const active = powers.filter((p) => ["active", "available"].includes((p.status ?? "").toLowerCase())).length
  const expiringSoon = powers.filter((p) => {
    const days = daysUntilExpiry(p.expiry_date ?? p.expires_at ?? "")
    return days >= 0 && days <= 30
  }).length

  const kpis = [
    { label: "Total", value: String(powers.length), color: Colors.text },
    { label: "Active", value: String(active), color: Colors.green },
    { label: "Expiring (30d)", value: String(expiringSoon), color: Colors.gold },
    { label: "Total Value", value: fmtMoney(totalValue), color: Colors.blueBright },
  ]

  const statusTabs = ["all", "active", "available", "used", "expired", "voided"]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.blueIconBg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.blueIconBorder }}>
          <Ionicons name="briefcase-outline" size={17} color={Colors.blueBright} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Powers of Attorney</Text>
          <Text style={s.subtitle}>Surety bond powers</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>Add</Text>
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
          placeholder="Search power #, defendant..."
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
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={Colors.blue} />}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="briefcase-outline" size={48} color={Colors.mutedDim} />
              <Text style={s.emptyTitle}>No powers found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const powerNum = item.power_number ?? item.power_id ?? item.id ?? "—"
            const defendant = item.defendant_name ?? item.defendant ?? ""
            const surety = item.surety ?? item.surety_company ?? ""
            const status = item.status ?? "active"
            const sc = STATUS_COLORS[status] ?? STATUS_COLORS.active
            const amount = item.amount ?? item.bond_amount ?? null
            const issueDate = item.issue_date ?? item.issued_at ?? item.created_at ?? ""
            const expiryDate = item.expiry_date ?? item.expires_at ?? ""
            const days = daysUntilExpiry(expiryDate)
            const isExpiringSoon = days >= 0 && days <= 30

            return (
              <View style={[s.card, isExpiringSoon && s.cardWarning]}>
                <View style={s.cardTop}>
                  <View style={s.powerIcon}>
                    <Ionicons name="briefcase-outline" size={20} color={Colors.blue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.powerNum}>POA #{powerNum}</Text>
                    {!!defendant && <Text style={s.defendant}>{defendant}</Text>}
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.statusText, { color: sc.text }]}>{status}</Text>
                  </View>
                </View>

                {!!amount && (
                  <View style={s.amountRow}>
                    <Text style={s.amountLabel}>Bond Amount</Text>
                    <Text style={s.amountValue}>{fmtMoney(amount)}</Text>
                  </View>
                )}

                <View style={s.metaRow}>
                  {!!surety && (
                    <View style={s.metaItem}>
                      <Ionicons name="business-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>{surety}</Text>
                    </View>
                  )}
                  {!!issueDate && (
                    <View style={s.metaItem}>
                      <Ionicons name="calendar-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>Issued {fmtDate(issueDate)}</Text>
                    </View>
                  )}
                  {!!expiryDate && (
                    <View style={s.metaItem}>
                      <Ionicons name="time-outline" size={12} color={isExpiringSoon ? Colors.gold : Colors.mutedDim} />
                      <Text style={[s.metaText, isExpiringSoon && { color: Colors.gold }]}>
                        Expires {fmtDate(expiryDate)}{isExpiringSoon ? ` (${days}d)` : ""}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={s.cardFooter}>
                  <TouchableOpacity style={s.footerAction} onPress={() => handleView(item)}>
                    <Ionicons name="eye-outline" size={14} color={Colors.blueBright} />
                    <Text style={s.footerActionText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.footerAction} onPress={() => handleDownload(item)}>
                    <Ionicons name="download-outline" size={14} color={Colors.mutedDim} />
                    <Text style={[s.footerActionText, { color: Colors.mutedDim }]}>Download</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          }}
        />
      )}

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
            <View style={s.modalCard}>
                <View style={{ width: 40, height: 4, backgroundColor: Colors.dragHandle, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Add Power of Attorney</Text>
                <TouchableOpacity onPress={() => setShowAdd(false)}>
                  <Ionicons name="close" size={22} color={Colors.muted} />
                </TouchableOpacity>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Power Number *</Text>
                <TextInput style={s.fieldInput} value={addForm.power_number} onChangeText={(v) => setAddForm((f) => ({ ...f, power_number: v }))} placeholder="e.g. POA-12345" placeholderTextColor={Colors.mutedDim} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Defendant Name</Text>
                <TextInput style={s.fieldInput} value={addForm.defendant_name} onChangeText={(v) => setAddForm((f) => ({ ...f, defendant_name: v }))} placeholder="Full legal name" placeholderTextColor={Colors.mutedDim} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Bond Amount</Text>
                <TextInput style={s.fieldInput} value={addForm.amount} onChangeText={(v) => setAddForm((f) => ({ ...f, amount: v }))} placeholder="e.g. 50000" placeholderTextColor={Colors.mutedDim} keyboardType="numeric" />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Surety Company</Text>
                <TextInput style={s.fieldInput} value={addForm.surety} onChangeText={(v) => setAddForm((f) => ({ ...f, surety: v }))} placeholder="e.g. Accredited Surety" placeholderTextColor={Colors.mutedDim} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Expiry Date</Text>
                <TextInput style={s.fieldInput} value={addForm.expiry_date} onChangeText={(v) => setAddForm((f) => ({ ...f, expiry_date: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.mutedDim} />
              </View>
              <TouchableOpacity style={[s.submitBtn, adding && { opacity: 0.6 }]} onPress={handleAdd} disabled={adding}>
                {adding ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.submitBtnText}>Add Power</Text>}
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
  kpiValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold, color: Colors.text },
  kpiLabel: { fontSize: 9, fontFamily: Font.semibold, marginTop: 3, textAlign: "center" },
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
  cardWarning: { borderColor: Colors.gold + "40" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  powerIcon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.blue + "14", alignItems: "center", justifyContent: "center" },
  powerNum: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  defendant: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  statusText: { fontSize: 10, fontFamily: Font.bold, textTransform: "capitalize" },
  amountRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.sm, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderFaint },
  amountLabel: { fontSize: FontSize.xs, color: Colors.mutedDim },
  amountValue: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.extrabold },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: Spacing.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.muted },
  cardFooter: { flexDirection: "row", alignItems: "center", paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderFaint, gap: 4 },
  footerAction: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5, paddingHorizontal: 8 },
  footerActionText: { fontSize: FontSize.xs, color: Colors.blueBright, fontFamily: Font.semibold },
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
