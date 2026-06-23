import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, RefreshControl, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from "react-native"
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

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—"
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }
  catch { return d }
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:      { bg: Colors.green + "18", text: Colors.green },
  active_bond: { bg: Colors.green + "18", text: Colors.green },
  at_risk:     { bg: Colors.red + "18", text: Colors.red },
  approved:    { bg: Colors.blue + "18", text: Colors.blueBright },
  closed:      { bg: Colors.mutedDim + "18", text: Colors.mutedDim },
  pending:     { bg: Colors.gold + "18", text: Colors.gold },
  revoked:     { bg: Colors.red + "20", text: Colors.red },
  canceled:    { bg: Colors.mutedDim + "18", text: Colors.mutedDim },
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active", active_bond: "Active", at_risk: "At Risk",
  approved: "Approved", closed: "Closed", revoked: "Revoked",
  canceled: "Canceled", pending: "Pending",
}

const mapBond = (item: any) => ({
  id: item.id,
  bond_number: item.bond_number ?? item.id ?? "",
  name: item.client_name ?? item.defendant_name ?? item.defendant?.full_name ?? "",
  county: item.county ?? "",
  charges: item.charges ?? [],
  bond_amount: item.bond_amount ?? 0,
  premium: item.premium ?? 0,
  balance: item.balance ?? 0,
  status: item.status ?? "pending",
  court_date: item.court_date ?? null,
  court_time: item.court_time ?? null,
  agent: item.agent ?? "",
  surety: item.surety ?? "",
  case_number: item.case_number ?? "",
  payments_count: item.payments_count ?? 0,
  documents_count: item.documents_count ?? 0,
  notes_count: item.notes_count ?? 0,
  notes: item.notes ?? "",
  defendant_phone: item.defendant?.phone ?? item.defendant_phone ?? "",
  defendant_dob: item.defendant?.dob ?? item.defendant_dob ?? "",
  defendant_id: item.defendant_id ?? item.defendant?.id ?? null,
})

type ModalType = "addPayment" | "updateBond" | "timeline" | null

export function BondsScreen() {
  const { identity } = useAuth()
  const [bonds, setBonds] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Expanded detail
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // New Bond modal
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({
    defendant_name: "", bond_amount: "", premium_amount: "", county: "",
    case_number: "", court_date: "", surety: "", bond_type: "Surety", notes: "",
  })
  const [adding, setAdding] = useState(false)

  // Per-bond action modal
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [activeBond, setActiveBond] = useState<any | null>(null)

  // Add Payment
  const [payForm, setPayForm] = useState({ amount: "", payment_date: "", payment_method: "Cash", notes: "" })
  const [paying, setPaying] = useState(false)

  // Update Bond
  const [updateForm, setUpdateForm] = useState({ status: "Active", court_date: "", court_time: "", surety: "", agent: "", notes: "" })
  const [updating, setUpdating] = useState(false)

  // Timeline
  const [timeline, setTimeline] = useState<any[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)

  // Canceling
  const [cancelingId, setCancelingId] = useState<number | null>(null)

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const res: any = await api.bonds(identity)
      const raw = res?.data?.results ?? res?.data ?? res?.results ?? res
      const list = Array.isArray(raw) ? raw.map(mapBond) : []
      setBonds(list)
      applyFilters(query, statusFilter, list)
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const applyFilters = (q: string, status: string, source = bonds) => {
    let out = source
    if (status !== "all") out = out.filter((b) => {
      const s = (b.status ?? "").toLowerCase()
      if (status === "active") return s === "active" || s === "active_bond"
      if (status === "at_risk") return s === "at_risk"
      return s === status
    })
    if (q.trim()) {
      const lq = q.toLowerCase()
      out = out.filter((b) =>
        (b.name ?? "").toLowerCase().includes(lq) ||
        String(b.bond_number ?? b.id ?? "").toLowerCase().includes(lq) ||
        (b.county ?? "").toLowerCase().includes(lq) ||
        (b.case_number ?? "").toLowerCase().includes(lq)
      )
    }
    setFiltered(out)
  }

  const handleNewBond = async () => {
    if (!identity) return
    if (!addForm.defendant_name.trim()) {
      Alert.alert("Required", "Please enter defendant name."); return
    }
    setAdding(true)
    try {
      await api.createBond(identity, addForm)
      setShowAdd(false)
      setAddForm({ defendant_name: "", bond_amount: "", premium_amount: "", county: "", case_number: "", court_date: "", surety: "", bond_type: "Surety", notes: "" })
      load()
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not create bond")
    } finally { setAdding(false) }
  }

  const openPayModal = (bond: any) => {
    setActiveBond(bond)
    setPayForm({ amount: "", payment_date: "", payment_method: "Cash", notes: "" })
    setActiveModal("addPayment")
  }

  const openUpdateModal = (bond: any) => {
    setActiveBond(bond)
    setUpdateForm({
      status: STATUS_LABELS[(bond.status ?? "").toLowerCase()] ?? "Active",
      court_date: bond.court_date ?? "",
      court_time: bond.court_time ?? "",
      surety: bond.surety ?? "",
      agent: bond.agent ?? "",
      notes: bond.notes ?? "",
    })
    setActiveModal("updateBond")
  }

  const openTimelineModal = async (bond: any) => {
    if (!identity) return
    setActiveBond(bond)
    setTimeline([])
    setActiveModal("timeline")
    setTimelineLoading(true)
    try {
      const res: any = await api.bondTimeline(identity, bond.id)
      const list = res?.data ?? res?.results ?? res
      setTimeline(Array.isArray(list) ? list : [])
    } catch {} finally { setTimelineLoading(false) }
  }

  const handleCancelBond = (bond: any) => {
    Alert.alert(
      "Cancel Bond",
      `Cancel bond for ${bond.name}? This action cannot be undone.`,
      [
        { text: "Back", style: "cancel" },
        {
          text: "Cancel Bond", style: "destructive",
          onPress: async () => {
            if (!identity) return
            setCancelingId(bond.id)
            try {
              await api.updateBond(identity, bond.id, { status: "Canceled" })
              setBonds((prev) => prev.filter((b) => b.id !== bond.id))
              setFiltered((prev) => prev.filter((b) => b.id !== bond.id))
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Could not cancel bond")
            } finally { setCancelingId(null) }
          },
        },
      ]
    )
  }

  const handleAddPayment = async () => {
    if (!identity || !activeBond) return
    if (!payForm.amount || !payForm.payment_date) {
      Alert.alert("Required", "Amount and payment date are required."); return
    }
    setPaying(true)
    try {
      await api.createPayment(identity, {
        defendant_id: activeBond.defendant_id ?? activeBond.id,
        amount: parseFloat(payForm.amount),
        payment_date: payForm.payment_date,
        payment_method: payForm.payment_method,
        notes: payForm.notes,
        status: "pending",
      })
      setActiveModal(null)
      Alert.alert("Success", "Payment recorded.")
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not create payment")
    } finally { setPaying(false) }
  }

  const handleUpdateBond = async () => {
    if (!identity || !activeBond) return
    setUpdating(true)
    try {
      await api.updateBond(identity, activeBond.id, {
        status: updateForm.status,
        court_date: updateForm.court_date || undefined,
        court_time: updateForm.court_time || undefined,
        surety: updateForm.surety || undefined,
        agent: updateForm.agent || undefined,
        notes: updateForm.notes || undefined,
      })
      setActiveModal(null)
      load()
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not update bond")
    } finally { setUpdating(false) }
  }

  const activeBonds = bonds.filter((b) => ["active", "active_bond"].includes((b.status ?? "").toLowerCase()))
  const atRiskBonds = bonds.filter((b) => (b.status ?? "").toLowerCase() === "at_risk")
  const approvedBonds = bonds.filter((b) => (b.status ?? "").toLowerCase() === "approved")
  const totalValue = bonds.reduce((sum, b) => sum + (parseFloat(String(b.bond_amount ?? "0").replace(/[$,]/g, "")) || 0), 0)

  const kpis = [
    { label: "Active", value: String(activeBonds.length), color: Colors.green },
    { label: "At-Risk", value: String(atRiskBonds.length), color: Colors.red },
    { label: "Approved", value: String(approvedBonds.length), color: Colors.blueBright },
    { label: "Total Value", value: fmtMoney(totalValue), color: Colors.gold },
  ]

  const statusTabs = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "at_risk", label: "At-Risk" },
    { key: "approved", label: "Approved" },
    { key: "closed", label: "Closed" },
  ]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerIcon}>
          <Ionicons name="shield-checkmark-outline" size={17} color={Colors.blueBright} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Bonds</Text>
          <Text style={s.subtitle}>{bonds.length} total bonds</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={18} color={Colors.blueLight} />
          <Text style={s.addBtnText}>New Bond</Text>
        </TouchableOpacity>
      </View>

      {/* KPIs */}
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

      {/* Status tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsRow}>
        {statusTabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, statusFilter === t.key && s.tabActive]}
            onPress={() => { setStatusFilter(t.key); applyFilters(query, t.key) }}
          >
            <Text style={[s.tabText, statusFilter === t.key && s.tabTextActive]}>{t.label}</Text>
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={Colors.blue} />
          }
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="shield-outline" size={48} color={Colors.mutedDim} />
              <Text style={s.emptyTitle}>No bonds found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const initials = item.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"
            const status = (item.status ?? "pending").toLowerCase()
            const sc = STATUS_COLORS[status] ?? { bg: Colors.mutedDim + "18", text: Colors.mutedDim }
            const statusLabel = STATUS_LABELS[status] ?? item.status ?? "Unknown"
            const courtDate = item.court_date
              ? new Date(item.court_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : null
            const charges: string[] = Array.isArray(item.charges)
              ? item.charges.map((c: any) => typeof c === "string" ? c : c.charge ?? c.type ?? "").filter(Boolean)
              : (item.charges ? [item.charges] : [])
            const isExpanded = expandedId === item.id
            const isCanceling = cancelingId === item.id

            return (
              <View style={s.card}>
                {/* Tappable card body toggles detail */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <View style={s.cardTop}>
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.defName}>{item.name || "Unknown"}</Text>
                      {!!item.bond_number && <Text style={s.bondNum}>Bond #{item.bond_number}</Text>}
                      {!!item.case_number && <Text style={s.bondNum}>Case #{item.case_number}</Text>}
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                        <Text style={[s.statusText, { color: sc.text }]}>{statusLabel}</Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={12}
                        color={Colors.mutedDim}
                      />
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
                        <Text style={s.metaText}>{courtDate}{item.court_time ? ` · ${item.court_time}` : ""}</Text>
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
                      {(isExpanded ? charges : charges.slice(0, 2)).map((ch, ci) => (
                        <View key={ci} style={s.chargePill}>
                          <Text style={s.chargePillText} numberOfLines={1}>{ch.length > 30 ? ch.slice(0, 28) + "…" : ch}</Text>
                        </View>
                      ))}
                      {!isExpanded && charges.length > 2 && (
                        <View style={s.moreCharges}>
                          <Text style={s.moreChargesText}>+{charges.length - 2}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {(item.payments_count > 0 || item.documents_count > 0 || item.notes_count > 0) && (
                    <View style={s.countsRow}>
                      {item.payments_count > 0 && (
                        <View style={s.countChip}>
                          <Ionicons name="card-outline" size={10} color={Colors.green} />
                          <Text style={[s.countChipText, { color: Colors.green }]}>{item.payments_count} payments</Text>
                        </View>
                      )}
                      {item.documents_count > 0 && (
                        <View style={s.countChip}>
                          <Ionicons name="document-outline" size={10} color={Colors.blueLight} />
                          <Text style={[s.countChipText, { color: Colors.blueLight }]}>{item.documents_count} docs</Text>
                        </View>
                      )}
                      {item.notes_count > 0 && (
                        <View style={s.countChip}>
                          <Ionicons name="chatbox-outline" size={10} color={Colors.muted} />
                          <Text style={[s.countChipText, { color: Colors.muted }]}>{item.notes_count} notes</Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>

                {/* Expandable detail section */}
                {isExpanded && (
                  <View style={s.expandedSection}>
                    <View style={s.expandDivider} />
                    {!!item.case_number && (
                      <View style={s.expandRow}>
                        <Text style={s.expandLabel}>Case #</Text>
                        <Text style={s.expandValue}>{item.case_number}</Text>
                      </View>
                    )}
                    {!!item.surety && (
                      <View style={s.expandRow}>
                        <Text style={s.expandLabel}>Surety</Text>
                        <Text style={s.expandValue}>{item.surety}</Text>
                      </View>
                    )}
                    {!!item.agent && (
                      <View style={s.expandRow}>
                        <Text style={s.expandLabel}>Agent</Text>
                        <Text style={s.expandValue}>{item.agent}</Text>
                      </View>
                    )}
                    {!!item.notes && (
                      <View style={{ marginTop: 6 }}>
                        <Text style={s.expandLabel}>Notes</Text>
                        <Text style={s.expandNotes}>{item.notes}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Action buttons row */}
                <View style={s.actionsRow}>
                  <TouchableOpacity style={s.actionBtn} onPress={() => openPayModal(item)}>
                    <Ionicons name="card-outline" size={13} color={Colors.green} />
                    <Text style={[s.actionBtnText, { color: Colors.green }]}>Payment</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionBtn} onPress={() => openUpdateModal(item)}>
                    <Ionicons name="create-outline" size={13} color={Colors.blueBright} />
                    <Text style={[s.actionBtnText, { color: Colors.blueBright }]}>Update</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, isCanceling && { opacity: 0.5 }]}
                    onPress={() => handleCancelBond(item)}
                    disabled={isCanceling}
                  >
                    {isCanceling
                      ? <ActivityIndicator size="small" color={Colors.red} />
                      : (
                        <>
                          <Ionicons name="close-circle-outline" size={13} color={Colors.red} />
                          <Text style={[s.actionBtnText, { color: Colors.red }]}>Cancel</Text>
                        </>
                      )
                    }
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionBtn} onPress={() => openTimelineModal(item)}>
                    <Ionicons name="git-branch-outline" size={13} color={Colors.gold} />
                    <Text style={[s.actionBtnText, { color: Colors.gold }]}>Timeline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          }}
        />
      )}

      {/* ── New Bond Modal ── */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
            <ScrollView style={s.modalCard} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={s.dragHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>New Bond</Text>
                <TouchableOpacity onPress={() => setShowAdd(false)}>
                  <Ionicons name="close" size={22} color={Colors.muted} />
                </TouchableOpacity>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Defendant Name *</Text>
                <TextInput style={s.fieldInput} value={addForm.defendant_name} onChangeText={(v) => setAddForm((f) => ({ ...f, defendant_name: v }))} placeholder="Full legal name" placeholderTextColor={Colors.mutedDim} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Bond Amount</Text>
                <TextInput style={s.fieldInput} value={addForm.bond_amount} onChangeText={(v) => setAddForm((f) => ({ ...f, bond_amount: v }))} placeholder="e.g. 50000" placeholderTextColor={Colors.mutedDim} keyboardType="numeric" />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Premium Amount</Text>
                <TextInput style={s.fieldInput} value={addForm.premium_amount} onChangeText={(v) => setAddForm((f) => ({ ...f, premium_amount: v }))} placeholder="e.g. 5000" placeholderTextColor={Colors.mutedDim} keyboardType="numeric" />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>County</Text>
                <TextInput style={s.fieldInput} value={addForm.county} onChangeText={(v) => setAddForm((f) => ({ ...f, county: v }))} placeholder="e.g. Los Angeles" placeholderTextColor={Colors.mutedDim} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Case Number</Text>
                <TextInput style={s.fieldInput} value={addForm.case_number} onChangeText={(v) => setAddForm((f) => ({ ...f, case_number: v }))} placeholder="e.g. 2024-CR-0001" placeholderTextColor={Colors.mutedDim} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Court Date (YYYY-MM-DD)</Text>
                <TextInput style={s.fieldInput} value={addForm.court_date} onChangeText={(v) => setAddForm((f) => ({ ...f, court_date: v }))} placeholder="e.g. 2025-03-15" placeholderTextColor={Colors.mutedDim} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Surety</Text>
                <TextInput style={s.fieldInput} value={addForm.surety} onChangeText={(v) => setAddForm((f) => ({ ...f, surety: v }))} placeholder="Surety company" placeholderTextColor={Colors.mutedDim} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Bond Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {["Surety", "Cash", "Property", "Federal"].map((t) => (
                    <TouchableOpacity key={t} style={[s.typeChip, addForm.bond_type === t && s.typeChipActive]} onPress={() => setAddForm((f) => ({ ...f, bond_type: t }))}>
                      <Text style={[s.typeChipText, addForm.bond_type === t && { color: "#fff" }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Notes</Text>
                <TextInput style={[s.fieldInput, { height: 80, textAlignVertical: "top" }]} value={addForm.notes} onChangeText={(v) => setAddForm((f) => ({ ...f, notes: v }))} placeholder="Additional notes..." placeholderTextColor={Colors.mutedDim} multiline />
              </View>
              <TouchableOpacity style={[s.submitBtn, adding && { opacity: 0.6 }]} onPress={handleNewBond} disabled={adding}>
                {adding ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.submitBtnText}>Create Bond</Text>}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Add Payment Modal ── */}
      <Modal visible={activeModal === "addPayment"} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
            <ScrollView style={s.modalCard} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={s.dragHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Add Payment</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Ionicons name="close" size={22} color={Colors.muted} />
                </TouchableOpacity>
              </View>
              {!!activeBond && <Text style={s.modalSubtitle}>{activeBond.name}</Text>}
              <View style={s.field}>
                <Text style={s.fieldLabel}>Amount *</Text>
                <TextInput style={s.fieldInput} value={payForm.amount} onChangeText={(v) => setPayForm((f) => ({ ...f, amount: v }))} placeholder="e.g. 500" placeholderTextColor={Colors.mutedDim} keyboardType="numeric" />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Payment Date * (YYYY-MM-DD)</Text>
                <TextInput style={s.fieldInput} value={payForm.payment_date} onChangeText={(v) => setPayForm((f) => ({ ...f, payment_date: v }))} placeholder="e.g. 2025-01-15" placeholderTextColor={Colors.mutedDim} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Payment Method</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {["Cash", "Card", "Check", "ACH"].map((t) => (
                    <TouchableOpacity key={t} style={[s.typeChip, payForm.payment_method === t && s.typeChipActive]} onPress={() => setPayForm((f) => ({ ...f, payment_method: t }))}>
                      <Text style={[s.typeChipText, payForm.payment_method === t && { color: "#fff" }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Notes</Text>
                <TextInput style={[s.fieldInput, { height: 70, textAlignVertical: "top" }]} value={payForm.notes} onChangeText={(v) => setPayForm((f) => ({ ...f, notes: v }))} placeholder="Optional notes..." placeholderTextColor={Colors.mutedDim} multiline />
              </View>
              <TouchableOpacity style={[s.submitBtn, { backgroundColor: Colors.green }, paying && { opacity: 0.6 }]} onPress={handleAddPayment} disabled={paying}>
                {paying ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.submitBtnText}>Record Payment</Text>}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Update Bond Modal ── */}
      <Modal visible={activeModal === "updateBond"} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
            <ScrollView style={s.modalCard} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={s.dragHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Update Bond</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Ionicons name="close" size={22} color={Colors.muted} />
                </TouchableOpacity>
              </View>
              {!!activeBond && <Text style={s.modalSubtitle}>{activeBond.name}</Text>}
              <View style={s.field}>
                <Text style={s.fieldLabel}>Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {["Active", "At-Risk", "Approved", "Closed"].map((t) => (
                    <TouchableOpacity key={t} style={[s.typeChip, updateForm.status === t && s.typeChipActive]} onPress={() => setUpdateForm((f) => ({ ...f, status: t }))}>
                      <Text style={[s.typeChipText, updateForm.status === t && { color: "#fff" }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Court Date (YYYY-MM-DD)</Text>
                <TextInput style={s.fieldInput} value={updateForm.court_date} onChangeText={(v) => setUpdateForm((f) => ({ ...f, court_date: v }))} placeholder="e.g. 2025-03-15" placeholderTextColor={Colors.mutedDim} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Court Time</Text>
                <TextInput style={s.fieldInput} value={updateForm.court_time} onChangeText={(v) => setUpdateForm((f) => ({ ...f, court_time: v }))} placeholder="e.g. 09:00 AM" placeholderTextColor={Colors.mutedDim} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Surety</Text>
                <TextInput style={s.fieldInput} value={updateForm.surety} onChangeText={(v) => setUpdateForm((f) => ({ ...f, surety: v }))} placeholder="Surety company" placeholderTextColor={Colors.mutedDim} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Agent</Text>
                <TextInput style={s.fieldInput} value={updateForm.agent} onChangeText={(v) => setUpdateForm((f) => ({ ...f, agent: v }))} placeholder="Agent name" placeholderTextColor={Colors.mutedDim} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Notes</Text>
                <TextInput style={[s.fieldInput, { height: 70, textAlignVertical: "top" }]} value={updateForm.notes} onChangeText={(v) => setUpdateForm((f) => ({ ...f, notes: v }))} placeholder="Additional notes..." placeholderTextColor={Colors.mutedDim} multiline />
              </View>
              <TouchableOpacity style={[s.submitBtn, updating && { opacity: 0.6 }]} onPress={handleUpdateBond} disabled={updating}>
                {updating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.submitBtnText}>Save Changes</Text>}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Timeline Modal ── */}
      <Modal visible={activeModal === "timeline"} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { maxHeight: "80%" }]}>
            <View style={s.dragHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Bond Timeline</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={22} color={Colors.muted} />
              </TouchableOpacity>
            </View>
            {!!activeBond && <Text style={s.modalSubtitle}>{activeBond.name}</Text>}
            {timelineLoading ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color={Colors.blue} />
              </View>
            ) : timeline.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <Ionicons name="git-branch-outline" size={36} color={Colors.mutedDim} />
                <Text style={{ color: Colors.muted, marginTop: 10, fontFamily: Font.semibold, fontSize: FontSize.sm }}>No timeline events</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {timeline.map((ev: any, idx: number) => (
                  <View key={idx} style={s.timelineItem}>
                    <View style={s.timelineLine}>
                      <View style={s.timelineDot} />
                      {idx < timeline.length - 1 && <View style={s.timelineConnector} />}
                    </View>
                    <View style={s.timelineContent}>
                      <Text style={s.timelineDate}>{fmtDate(ev.date ?? ev.created_at)}</Text>
                      <Text style={s.timelineEvent}>{ev.event ?? ev.action ?? ev.title ?? ""}</Text>
                      {!!(ev.description ?? ev.notes) && (
                        <Text style={s.timelineDesc}>{ev.description ?? ev.notes}</Text>
                      )}
                    </View>
                  </View>
                ))}
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginHorizontal: Spacing.xl, marginVertical: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerIcon: { width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.blueIconBg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.blueIconBorder },
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
  tab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.xl, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  tabText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  tabTextActive: { color: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.bold },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.blueIconBg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.blueIconBorder },
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
  chargesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: Spacing.sm },
  chargePill: { backgroundColor: Colors.red + "14", borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.red + "25", paddingHorizontal: 8, paddingVertical: 3 },
  chargePillText: { fontSize: 10, color: Colors.red + "cc", fontFamily: Font.medium },
  moreCharges: { backgroundColor: Colors.bgPanel, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  moreChargesText: { fontSize: 10, color: Colors.mutedDim },
  countsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: Spacing.sm },
  countChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.bgPanel, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.border },
  countChipText: { fontSize: 10, fontFamily: Font.medium },
  expandedSection: { paddingTop: 8 },
  expandDivider: { height: 1, backgroundColor: Colors.borderFaint, marginBottom: 10 },
  expandRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  expandLabel: { fontSize: FontSize.xs, color: Colors.mutedDim, fontFamily: Font.semibold },
  expandValue: { fontSize: FontSize.xs, color: Colors.text, fontFamily: Font.semibold },
  expandNotes: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 4, lineHeight: 18 },
  actionsRow: { flexDirection: "row", gap: 6, marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderFaint },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 7, borderRadius: Radius.sm, backgroundColor: Colors.bgPanel, borderWidth: 1, borderColor: Colors.border },
  actionBtnText: { fontSize: 10, fontFamily: Font.semibold },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.bgPanel, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, maxHeight: "90%" },
  dragHandle: { width: 40, height: 4, backgroundColor: Colors.dragHandle, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.sm },
  modalTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.extrabold },
  modalSubtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginBottom: Spacing.lg },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold, marginBottom: 6 },
  fieldInput: { backgroundColor: Colors.bgInput, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 13, color: Colors.text, fontSize: FontSize.sm },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.xl, backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border },
  typeChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  typeChipText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold, letterSpacing: 0.2 },
  submitBtn: { height: 52, borderRadius: Radius.lg, backgroundColor: Colors.blue, alignItems: "center", justifyContent: "center", marginTop: Spacing.md },
  submitBtnText: { color: "#fff", fontSize: FontSize.md, fontFamily: Font.bold },
  timelineItem: { flexDirection: "row", gap: 12, marginBottom: 16 },
  timelineLine: { alignItems: "center", width: 20 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.blue, borderWidth: 2, borderColor: Colors.blueBright },
  timelineConnector: { flex: 1, width: 2, backgroundColor: Colors.border, marginTop: 3 },
  timelineContent: { flex: 1, paddingBottom: 4 },
  timelineDate: { fontSize: 10, color: Colors.mutedDim, fontFamily: Font.semibold, marginBottom: 2 },
  timelineEvent: { fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.bold },
  timelineDesc: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 3, lineHeight: 18 },
})
