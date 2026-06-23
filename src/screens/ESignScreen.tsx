import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform, Linking } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { api, apiPatch } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

function fmtDate(d: string): string {
  if (!d) return "—"
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }
  catch { return d }
}

type DisplayStatus = "Awaiting" | "Signed" | "Expired" | "Voided" | "Draft"

function mapStatus(raw: string): DisplayStatus {
  const s = (raw ?? "").toLowerCase()
  if (s === "signed" || s === "completed") return "Signed"
  if (s === "expired") return "Expired"
  if (s === "voided") return "Voided"
  if (s === "draft") return "Draft"
  return "Awaiting"
}

const STATUS_CONFIG: Record<DisplayStatus, { bg: string; text: string; icon: string }> = {
  Awaiting: { bg: Colors.gold + "18", text: Colors.gold, icon: "time-outline" },
  Signed: { bg: Colors.green + "18", text: Colors.green, icon: "checkmark-circle-outline" },
  Expired: { bg: Colors.red + "18", text: Colors.red, icon: "alert-circle-outline" },
  Voided: { bg: Colors.mutedDim + "18", text: Colors.mutedDim, icon: "close-circle-outline" },
  Draft: { bg: Colors.mutedDim + "18", text: Colors.mutedDim, icon: "document-outline" },
}

const DOC_TYPES = ["Indemnity Agreement", "Power of Attorney", "Bond Application", "Receipt", "Other"]
const SEND_VIA = ["SMS", "Email", "Both"]
const FILTER_TABS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Awaiting", label: "Awaiting" },
  { key: "Signed", label: "Signed" },
  { key: "Expired", label: "Expired" },
  { key: "Draft", label: "Drafts" },
]

export function ESignScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [docs, setDocs] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ document_name: "", client_name: "", document_type: "Indemnity Agreement", send_via: "Email" })
  const [creating, setCreating] = useState(false)
  const [resendingId, setResendingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const res: any = await api.esign(identity)
      const raw = res?.data?.results ?? res?.data ?? res?.results ?? res
      const arr = Array.isArray(raw) ? raw : []
      setDocs(arr)
      applyFilters(query, statusFilter, arr)
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const applyFilters = (q: string, status: string, source = docs) => {
    let out = source
    if (status !== "all") {
      if (status === "Draft") {
        out = out.filter((d) => (d.status ?? "").toLowerCase() === "draft")
      } else {
        out = out.filter((d) => mapStatus(d.status ?? "") === status)
      }
    }
    if (q.trim()) {
      const lq = q.toLowerCase()
      out = out.filter((d) =>
        (d.document_name ?? d.name ?? d.title ?? "").toLowerCase().includes(lq) ||
        (d.client_name ?? d.defendant_name ?? d.signer_name ?? "").toLowerCase().includes(lq)
      )
    }
    setFiltered(out)
  }

  const handleVoid = (item: any) => {
    if (!identity) return
    Alert.alert("Void Document", `Void "${item.document_name ?? item.name ?? "this document"}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Void", style: "destructive", onPress: async () => {
          try {
            await apiPatch("esign/documents/" + item.id + "/", identity, { status: "voided" })
            const updated = docs.map((d) => d.id === item.id ? { ...d, status: "voided" } : d)
            setDocs(updated)
            applyFilters(query, statusFilter, updated)
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Could not void document")
          }
        }
      },
    ])
  }

  const handleCreate = async () => {
    if (!identity) return
    if (!newForm.document_name.trim() || !newForm.client_name.trim()) {
      Alert.alert("Required", "Please enter document name and client name."); return
    }
    setCreating(true)
    try {
      await api.createESign(identity, {
        document_name: newForm.document_name,
        client_name: newForm.client_name,
        document_type: newForm.document_type,
        send_via: newForm.send_via,
      })
      setShowNew(false)
      setNewForm({ document_name: "", client_name: "", document_type: "Indemnity Agreement", send_via: "Email" })
      load()
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not create document")
    } finally { setCreating(false) }
  }

  const handleResend = async (item: any) => {
    if (!identity) return
    setResendingId(item.id)
    try {
      await api.resendESign(identity, item.id)
      Alert.alert("Sent", "Signature request resent successfully.")
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not resend")
    } finally { setResendingId(null) }
  }

  const handleViewSign = (item: any) => {
    const url = item.signing_url ?? item.download_url ?? item.signed_file_url ?? ""
    if (!url) { Alert.alert("Unavailable", "No link available for this document."); return }
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open link."))
  }

  const handleDownload = (item: any) => {
    const url = item.signed_file_url ?? item.download_url ?? item.uploaded_file_url ?? ""
    if (!url) { Alert.alert("Unavailable", "No download link available for this document."); return }
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open document."))
  }

  const totalAwaiting = docs.filter((d) => mapStatus(d.status ?? "") === "Awaiting").length
  const totalSigned = docs.filter((d) => mapStatus(d.status ?? "") === "Signed").length
  const totalExpired = docs.filter((d) => mapStatus(d.status ?? "") === "Expired").length
  const totalDrafts = docs.filter((d) => (d.status ?? "").toLowerCase() === "draft").length

  const kpis = [
    { label: "Total", value: String(docs.length), color: Colors.text },
    { label: "Awaiting", value: String(totalAwaiting), color: Colors.gold },
    { label: "Signed", value: String(totalSigned), color: Colors.green },
    { label: "Expired", value: String(totalExpired), color: Colors.red },
  ]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.blueIconBg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.blueIconBorder }}>
          <Ionicons name="create-outline" size={17} color={Colors.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>eSign Documents</Text>
          <Text style={s.subtitle}>Electronic signatures</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowNew(true)}>
          <Ionicons name="add" size={18} color={Colors.blueLight} />
          <Text style={s.addBtnText}>New</Text>
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
          placeholder="Search documents..."
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
        {FILTER_TABS.map((t) => {
          const isDrafts = t.key === "Draft"
          const showBadge = isDrafts && totalDrafts > 0
          return (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, statusFilter === t.key && s.tabActive]}
              onPress={() => { setStatusFilter(t.key); applyFilters(query, t.key) }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={[s.tabText, statusFilter === t.key && s.tabTextActive]}>{t.label}</Text>
                {showBadge && (
                  <View style={[s.tabBadge, statusFilter === t.key && { backgroundColor: Colors.mutedDim + "40" }]}>
                    <Text style={s.tabBadgeText}>{totalDrafts}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )
        })}
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
              <Ionicons name="document-text-outline" size={48} color={Colors.mutedDim} />
              <Text style={s.emptyTitle}>No documents found</Text>
              <Text style={s.emptyText}>Send a document to get started.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const docName = item.document_name ?? item.name ?? item.title ?? "Document"
            const clientName = item.client_name ?? item.defendant_name ?? item.signer_name ?? ""
            const county = item.county ?? ""
            const displayStatus = mapStatus(item.status ?? "")
            const sc = STATUS_CONFIG[displayStatus]
            const dateSent = item.date_sent ?? item.sent_at ?? item.created_at ?? ""
            const signedAt = item.signed_at ?? item.completed_at ?? ""
            const docType = item.document_type ?? ""
            const isAwaiting = displayStatus === "Awaiting"
            const isSigned = displayStatus === "Signed"
            const caseNumber = item.case_number ?? item.bond_number ?? ""
            const bondAmount = item.bond_amount ?? item.face_amount ?? null
            const isExpanded = expandedId === item.id

            return (
              <View style={s.card}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => setExpandedId(isExpanded ? null : item.id)}>
                  <View style={s.cardTop}>
                    <View style={s.docIcon}>
                      <Ionicons name="document-text-outline" size={20} color={Colors.blue} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.docName}>{docName}</Text>
                      {!!clientName && <Text style={s.clientName}>{clientName}</Text>}
                      {!!county && <Text style={s.countyText}>{county}</Text>}
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                      <Ionicons name={sc.icon as any} size={10} color={sc.text} />
                      <Text style={[s.statusText, { color: sc.text }]}>{displayStatus}</Text>
                    </View>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color={Colors.mutedDim} />
                  </View>

                  {!!docType && (
                    <View style={s.docTypeRow}>
                      <View style={s.docTypeChip}>
                        <Text style={s.docTypeText}>{docType}</Text>
                      </View>
                    </View>
                  )}

                  <View style={s.metaRow}>
                    {!!dateSent && (
                      <View style={s.metaItem}>
                        <Ionicons name="send-outline" size={11} color={Colors.mutedDim} />
                        <Text style={s.metaText}>Sent {fmtDate(dateSent)}</Text>
                      </View>
                    )}
                    {isSigned && !!signedAt && (
                      <View style={s.metaItem}>
                        <Ionicons name="checkmark-outline" size={11} color={Colors.green} />
                        <Text style={[s.metaText, { color: Colors.green }]}>Signed: {fmtDate(signedAt)}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={s.expandedSection}>
                    {!!docType && (
                      <View style={s.expandRow}>
                        <Text style={s.expandLabel}>Document Type</Text>
                        <Text style={s.expandValue}>{docType}</Text>
                      </View>
                    )}
                    {!!dateSent && (
                      <View style={s.expandRow}>
                        <Text style={s.expandLabel}>Date Sent</Text>
                        <Text style={s.expandValue}>{fmtDate(dateSent)}</Text>
                      </View>
                    )}
                    {!!signedAt && (
                      <View style={s.expandRow}>
                        <Text style={s.expandLabel}>Signed At</Text>
                        <Text style={s.expandValue}>{fmtDate(signedAt)}</Text>
                      </View>
                    )}
                    {!!caseNumber && (
                      <View style={s.expandRow}>
                        <Text style={s.expandLabel}>Case #</Text>
                        <Text style={s.expandValue}>{caseNumber}</Text>
                      </View>
                    )}
                    {bondAmount != null && (
                      <View style={s.expandRow}>
                        <Text style={s.expandLabel}>Bond Amount</Text>
                        <Text style={s.expandValue}>${parseFloat(String(bondAmount)).toLocaleString("en-US")}</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={s.cardFooter}>
                  <TouchableOpacity style={s.footerAction} onPress={() => handleViewSign(item)}>
                    <Ionicons name="eye-outline" size={14} color={Colors.blueBright} />
                    <Text style={s.footerActionText}>{item.signing_url ? "View/Sign" : "View"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.footerAction} onPress={() => handleDownload(item)}>
                    <Ionicons name="download-outline" size={14} color={Colors.muted} />
                    <Text style={[s.footerActionText, { color: Colors.muted }]}>Download</Text>
                  </TouchableOpacity>
                  {isAwaiting && (
                    <TouchableOpacity style={s.footerAction} onPress={() => handleResend(item)} disabled={resendingId === item.id}>
                      {resendingId === item.id
                        ? <ActivityIndicator size="small" color={Colors.gold} />
                        : <Ionicons name="mail-outline" size={14} color={Colors.gold} />
                      }
                      <Text style={[s.footerActionText, { color: Colors.gold }]}>Resend</Text>
                    </TouchableOpacity>
                  )}
                  {isAwaiting && (
                    <TouchableOpacity style={[s.footerAction, { marginLeft: "auto" }]} onPress={() => handleVoid(item)}>
                      <Ionicons name="close-circle-outline" size={14} color={Colors.red} />
                      <Text style={[s.footerActionText, { color: Colors.red }]}>Void</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )
          }}
        />
      )}

      <Modal visible={showNew} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
            <View style={s.modalCard}>
              <View style={{ width: 40, height: 4, backgroundColor: Colors.dragHandle, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>New Document</Text>
                <TouchableOpacity onPress={() => setShowNew(false)}>
                  <Ionicons name="close" size={22} color={Colors.muted} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={s.field}>
                  <Text style={s.fieldLabel}>Document Name *</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={newForm.document_name}
                    onChangeText={(v) => setNewForm((f) => ({ ...f, document_name: v }))}
                    placeholder="e.g. Bond Agreement - John Doe"
                    placeholderTextColor={Colors.mutedDim}
                  />
                </View>
                <View style={s.field}>
                  <Text style={s.fieldLabel}>Client Name *</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={newForm.client_name}
                    onChangeText={(v) => setNewForm((f) => ({ ...f, client_name: v }))}
                    placeholder="Signer's full name"
                    placeholderTextColor={Colors.mutedDim}
                  />
                </View>
                <View style={s.field}>
                  <Text style={s.fieldLabel}>Document Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                    {DOC_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[s.typeChip, newForm.document_type === t && s.typeChipActive]}
                        onPress={() => setNewForm((f) => ({ ...f, document_type: t }))}
                      >
                        <Text style={[s.typeChipText, newForm.document_type === t && { color: Colors.text }]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={s.field}>
                  <Text style={s.fieldLabel}>Send Via</Text>
                  <View style={s.chipRow}>
                    {SEND_VIA.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[s.typeChip, newForm.send_via === c && s.typeChipActive]}
                        onPress={() => setNewForm((f) => ({ ...f, send_via: c }))}
                      >
                        <Text style={[s.typeChipText, newForm.send_via === c && { color: Colors.text }]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <TouchableOpacity style={[s.submitBtn, creating && { opacity: 0.6 }]} onPress={handleCreate} disabled={creating}>
                  {creating ? <ActivityIndicator size="small" color={Colors.text} /> : <Text style={s.submitBtnText}>Create & Send</Text>}
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
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold, color: Colors.text },
  kpiLabel: { fontSize: 9, fontFamily: Font.semibold, marginTop: 3, textAlign: "center", color: Colors.mutedDim },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, height: 44 },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm },
  tabsScroll: { marginBottom: Spacing.md, height: 38 },
  tabsRow: { paddingHorizontal: Spacing.xl, gap: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.xl, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  tabText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  tabTextActive: { color: Colors.text },
  tabBadge: { backgroundColor: Colors.mutedDim + "28", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  tabBadgeText: { fontSize: 9, color: Colors.mutedDim, fontFamily: Font.bold },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.bold },
  emptyText: { fontSize: FontSize.sm, color: Colors.mutedDim },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md, marginBottom: Spacing.md },
  docIcon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.blueIconBg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.blueIconBorder },
  docName: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  clientName: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  countyText: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  docTypeRow: { marginBottom: Spacing.sm },
  docTypeChip: { alignSelf: "flex-start" as const, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm, backgroundColor: Colors.blueSubtle, borderWidth: 1, borderColor: Colors.blueBorder },
  docTypeText: { fontSize: 10, color: Colors.blueLight, fontFamily: Font.semibold },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  statusText: { fontSize: 10, fontFamily: Font.bold },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 4 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: Spacing.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.muted },
  expandedSection: { borderTopWidth: 1, borderTopColor: Colors.borderFaint, paddingTop: Spacing.md, marginTop: Spacing.sm, gap: 8 },
  expandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  expandLabel: { fontSize: FontSize.xs, color: Colors.mutedDim, fontFamily: Font.semibold },
  expandValue: { fontSize: FontSize.xs, color: Colors.text, fontFamily: Font.semibold, flexShrink: 1, textAlign: "right" },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 4, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderFaint },
  footerAction: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5, paddingHorizontal: 8 },
  footerActionText: { fontSize: FontSize.xs, color: Colors.blueBright, fontFamily: Font.semibold },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.bgPanel, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.extrabold },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold, marginBottom: 6 },
  fieldInput: { backgroundColor: Colors.bgInput, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 13, color: Colors.text, fontSize: FontSize.sm },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.xl, backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border },
  typeChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  typeChipText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold, letterSpacing: 0.2 },
  submitBtn: { height: 52, borderRadius: Radius.lg, backgroundColor: Colors.blue, alignItems: "center", justifyContent: "center", marginTop: Spacing.md },
  submitBtnText: { color: Colors.text, fontSize: FontSize.md, fontFamily: Font.bold },
})
