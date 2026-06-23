import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, RefreshControl, Alert, Modal,
  Linking,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { api, apiDelete } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

function fmtDate(d: string): string {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch { return d }
}

type DisplayStatus = "Sent" | "Received" | "Completed" | "Expired"

function mapStatus(raw: string): DisplayStatus {
  const s = (raw ?? "").toLowerCase()
  if (s === "approved" || s === "completed") return "Completed"
  if (s === "in_review" || s === "submitted") return "Received"
  if (s === "declined" || s === "expired") return "Expired"
  return "Sent"
}

const STATUS_COLORS: Record<DisplayStatus, { bg: string; text: string }> = {
  Sent: { bg: Colors.gold + "20", text: Colors.gold },
  Received: { bg: Colors.blue + "20", text: Colors.blueBright },
  Completed: { bg: Colors.green + "20", text: Colors.green },
  Expired: { bg: Colors.red + "20", text: Colors.red },
}

const FILTER_TABS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Sent", label: "Sent" },
  { key: "Received", label: "Received" },
  { key: "Completed", label: "Completed" },
  { key: "Expired", label: "Expired" },
]

const SEND_VIA_OPTIONS = ["SMS", "Email", "Both"] as const
type SendVia = typeof SEND_VIA_OPTIONS[number]

export function BondAppScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [apps, setApps] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [decidingId, setDecidingId] = useState<number | null>(null)
  const [sendingId, setSendingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    applicant_name: "",
    applicant_phone: "",
    applicant_email: "",
    county_name: "",
  })
  const [sendVia, setSendVia] = useState<SendVia>("Both")

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const res: any = await api.bondapp(identity)
      const raw = res?.data?.results ?? res?.data ?? res?.results ?? res
      const list = Array.isArray(raw) ? raw : []
      setApps(list)
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const mapped = apps.map((a) => ({ ...a, _displayStatus: mapStatus(a.status ?? "") }))

  const filtered = mapped.filter((a) => {
    const matchesStatus = statusFilter === "all" || a._displayStatus === statusFilter
    const matchesQuery = !query.trim() || (
      (a.applicant_name ?? a.defendant_name ?? "").toLowerCase().includes(query.toLowerCase()) ||
      (a.county_name ?? "").toLowerCase().includes(query.toLowerCase()) ||
      (a.applicant_phone ?? "").includes(query)
    )
    return matchesStatus && matchesQuery
  })

  const countForTab = (key: string) =>
    key === "all"
      ? mapped.length
      : mapped.filter((a) => a._displayStatus === key).length

  const kpis = [
    { label: "Total", value: String(mapped.length), color: Colors.text },
    { label: "Sent", value: String(mapped.filter((a) => a._displayStatus === "Sent").length), color: Colors.gold },
    { label: "Received", value: String(mapped.filter((a) => a._displayStatus === "Received").length), color: Colors.blueBright },
    { label: "Completed", value: String(mapped.filter((a) => a._displayStatus === "Completed").length), color: Colors.green },
  ]

  const handleDecision = (item: any, decision: "approved" | "denied") => {
    if (!identity) return
    Alert.alert(
      decision === "approved" ? "Approve Application" : "Deny Application",
      `${decision === "approved" ? "Approve" : "Deny"} application for ${item.applicant_name ?? "this applicant"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: decision === "approved" ? "Approve" : "Deny",
          style: decision === "denied" ? "destructive" : "default",
          onPress: async () => {
            setDecidingId(item.id)
            try {
              await api.bondappDecision(identity, item.id, decision)
              setApps((prev) => prev.map((a) => a.id === item.id ? { ...a, status: decision } : a))
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Could not update application")
            } finally { setDecidingId(null) }
          },
        },
      ]
    )
  }

  const handleResend = async (item: any) => {
    if (!identity) return
    setSendingId(item.id)
    try {
      await api.bondappSendLink(identity, item.id)
      Alert.alert("Sent", "Application link has been resent to the applicant.")
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not resend link")
    } finally { setSendingId(null) }
  }

  const handleView = (item: any) => {
    const token = item.application_token
    if (token) {
      Linking.openURL(`https://bailwatchpro.com/bond-app/client/${token}`).catch(() => {
        Alert.alert("Error", "Could not open application link")
      })
    } else {
      Alert.alert("No Link", "Application link is not available.")
    }
  }

  const handleDelete = (item: any) => {
    if (!identity) return
    Alert.alert(
      "Delete Application",
      `Delete application for ${item.applicant_name ?? "this applicant"}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            setDeletingId(item.id)
            try {
              await apiDelete(`applications/${item.id}/`, identity)
              setApps((prev) => prev.filter((a) => a.id !== item.id))
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Could not delete application")
            } finally { setDeletingId(null) }
          },
        },
      ]
    )
  }

  const handleCreate = async () => {
    if (!form.applicant_name.trim()) {
      Alert.alert("Required", "Applicant name is required.")
      return
    }
    if (!identity) return
    setCreating(true)
    try {
      await api.createBondApp(identity, {
        applicant_name: form.applicant_name,
        applicant_phone: form.applicant_phone,
        applicant_email: form.applicant_email,
        county_name: form.county_name,
        send_via: sendVia,
      })
      setShowModal(false)
      setForm({ applicant_name: "", applicant_phone: "", applicant_email: "", county_name: "" })
      setSendVia("Both")
      await load(true)
      Alert.alert("Sent!", `Application sent via ${sendVia}.`)
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not create application")
    } finally { setCreating(false) }
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={s.headerIconWrap}>
          <Ionicons name="document-text-outline" size={17} color={Colors.purple} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Bond Applications</Text>
          <Text style={s.headerSub}>{mapped.length} application{mapped.length !== 1 ? "s" : ""}</Text>
        </View>
        <TouchableOpacity
          style={s.intakeBtn}
          onPress={() => Alert.alert("Public Intake", "Share your public intake link from the web dashboard → BondApp → Public Intake Link")}
        >
          <Text style={s.intakeBtnText}>Intake Form →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="send-outline" size={13} color={Colors.blueLight} />
          <Text style={s.addBtnText}>Send New</Text>
        </TouchableOpacity>
      </View>

      <View style={s.kpiRow}>
        {kpis.map((k, i) => (
          <View key={k.label} style={[s.kpiCard, i < kpis.length - 1 && s.kpiCardBorder]}>
            <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
        <TextInput
          style={s.searchInput}
          placeholder="Search applicant, county, phone..."
          placeholderTextColor={Colors.mutedDim}
          value={query}
          onChangeText={setQuery}
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={16} color={Colors.mutedDim} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabsScroll}
        contentContainerStyle={s.tabsRow}
      >
        {FILTER_TABS.map((t) => {
          const count = countForTab(t.key)
          const active = statusFilter === t.key
          return (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setStatusFilter(t.key)}
            >
              <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
              <View style={[s.tabCount, active && s.tabCountActive]}>
                <Text style={[s.tabCountText, active && s.tabCountTextActive]}>{count}</Text>
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true) }}
              tintColor={Colors.blue}
            />
          }
          ListEmptyComponent={
            <View style={s.center}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="document-text-outline" size={32} color={Colors.blue} />
              </View>
              <Text style={s.emptyTitle}>No Applications Found</Text>
              <Text style={s.emptyText}>No applications match your current filters.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const name = item.applicant_name ?? item.defendant_name ?? "Unknown"
            const displayStatus: DisplayStatus = item._displayStatus ?? "Sent"
            const sc = STATUS_COLORS[displayStatus]
            const county = item.county_name ?? ""
            const phone = item.applicant_phone ?? ""
            const dateSent = fmtDate(item.created_at ?? "")
            const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"
            const rawStatus = (item.status ?? "").toLowerCase()
            const canDecide = ["new", "in_review", "submitted"].includes(rawStatus)
            const isExpanded = expandedId === item.id
            const isDeleting = deletingId === item.id

            return (
              <View style={s.card}>
                {/* Tappable card top toggles expand */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <View style={s.cardTop}>
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.appName}>{name}</Text>
                      <View style={s.metaRow}>
                        {!!county && (
                          <View style={s.metaItem}>
                            <Ionicons name="location-outline" size={11} color={Colors.mutedDim} />
                            <Text style={s.metaText}>{county}</Text>
                          </View>
                        )}
                        {!!phone && (
                          <View style={s.metaItem}>
                            <Ionicons name="call-outline" size={11} color={Colors.mutedDim} />
                            <Text style={s.metaText}>{phone}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                        <Text style={[s.statusText, { color: sc.text }]}>{displayStatus}</Text>
                      </View>
                      {isDeleting
                        ? <ActivityIndicator size="small" color={Colors.red} />
                        : (
                          <TouchableOpacity
                            style={s.deleteBtn}
                            onPress={() => handleDelete(item)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="trash-outline" size={14} color={Colors.red} />
                          </TouchableOpacity>
                        )
                      }
                    </View>
                  </View>

                  {!!dateSent && dateSent !== "—" && (
                    <View style={s.dateRow}>
                      <Ionicons name="calendar-outline" size={11} color={Colors.mutedDim} />
                      <Text style={s.dateText}>Sent {dateSent}</Text>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={11}
                        color={Colors.mutedDim}
                        style={{ marginLeft: "auto" }}
                      />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <View style={s.expandedSection}>
                    <View style={s.expandDivider} />
                    {!!item.applicant_address && (
                      <View style={s.expandRow}>
                        <Text style={s.expandLabel}>Address</Text>
                        <Text style={s.expandValue}>{item.applicant_address}</Text>
                      </View>
                    )}
                    {!!item.applicant_email && (
                      <View style={s.expandRow}>
                        <Text style={s.expandLabel}>Email</Text>
                        <Text style={s.expandValue}>{item.applicant_email}</Text>
                      </View>
                    )}
                    {!!item.applicant_phone && (
                      <View style={s.expandRow}>
                        <Text style={s.expandLabel}>Phone</Text>
                        <Text style={s.expandValue}>{item.applicant_phone}</Text>
                      </View>
                    )}
                    {!!item.county_name && (
                      <View style={s.expandRow}>
                        <Text style={s.expandLabel}>County</Text>
                        <Text style={s.expandValue}>{item.county_name}</Text>
                      </View>
                    )}
                    {!!item.submitted_at && (
                      <View style={s.expandRow}>
                        <Text style={s.expandLabel}>Submitted</Text>
                        <Text style={s.expandValue}>{fmtDate(item.submitted_at)}</Text>
                      </View>
                    )}
                    {!!item.application_token && (
                      <TouchableOpacity
                        style={s.linkRow}
                        onPress={() => Linking.openURL(`https://bailwatchpro.com/bond-app/client/${item.application_token}`).catch(() => Alert.alert("Error", "Could not open link"))}
                      >
                        <Ionicons name="link-outline" size={13} color={Colors.blueBright} />
                        <Text style={s.linkText}>View Application Link</Text>
                        <Ionicons name="open-outline" size={12} color={Colors.blueBright} />
                      </TouchableOpacity>
                    )}
                    {!!(item.case_notes ?? item.intake_notes) && (
                      <View style={{ marginTop: 6 }}>
                        <Text style={s.expandLabel}>Notes</Text>
                        <Text style={s.expandNotes}>{item.case_notes ?? item.intake_notes}</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={s.cardFooter}>
                  <TouchableOpacity
                    style={s.footerBtn}
                    onPress={() => handleResend(item)}
                    disabled={sendingId === item.id}
                  >
                    {sendingId === item.id
                      ? <ActivityIndicator size="small" color={Colors.blueBright} />
                      : (
                        <>
                          <Ionicons name="send-outline" size={13} color={Colors.blueBright} />
                          <Text style={s.footerBtnText}>Resend</Text>
                        </>
                      )
                    }
                  </TouchableOpacity>

                  <TouchableOpacity style={s.footerBtn} onPress={() => handleView(item)}>
                    <Ionicons name="eye-outline" size={13} color={Colors.muted} />
                    <Text style={[s.footerBtnText, { color: Colors.muted }]}>View</Text>
                  </TouchableOpacity>

                  {canDecide && (
                    <>
                      <TouchableOpacity
                        style={[s.footerBtn, s.footerBtnGreen]}
                        onPress={() => handleDecision(item, "approved")}
                        disabled={decidingId === item.id}
                      >
                        {decidingId === item.id
                          ? <ActivityIndicator size="small" color={Colors.green} />
                          : (
                            <>
                              <Ionicons name="checkmark-outline" size={13} color={Colors.green} />
                              <Text style={[s.footerBtnText, { color: Colors.green }]}>Approve</Text>
                            </>
                          )
                        }
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.footerBtn, s.footerBtnRed]}
                        onPress={() => handleDecision(item, "denied")}
                        disabled={decidingId === item.id}
                      >
                        <Ionicons name="close-outline" size={13} color={Colors.red} />
                        <Text style={[s.footerBtnText, { color: Colors.red }]}>Deny</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            )
          }}
        />
      )}

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.dragHandle} />

            <View style={s.modalHeader}>
              <View style={s.modalHeaderIcon}>
                <Ionicons name="send-outline" size={16} color={Colors.blueLight} />
              </View>
              <Text style={s.modalTitle}>Send New Application</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={s.modalClose}>
                <Ionicons name="close" size={20} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              <View>
                <Text style={s.fieldLabel}>Full Name *</Text>
                <TextInput
                  style={s.fieldInput}
                  placeholder="Enter full name"
                  placeholderTextColor={Colors.mutedDim}
                  value={form.applicant_name}
                  onChangeText={(t) => setForm((f) => ({ ...f, applicant_name: t }))}
                />
              </View>

              <View>
                <Text style={s.fieldLabel}>Phone Number</Text>
                <TextInput
                  style={s.fieldInput}
                  placeholder="(555) 000-0000"
                  placeholderTextColor={Colors.mutedDim}
                  keyboardType="phone-pad"
                  value={form.applicant_phone}
                  onChangeText={(t) => setForm((f) => ({ ...f, applicant_phone: t }))}
                />
              </View>

              <View>
                <Text style={s.fieldLabel}>Email Address</Text>
                <TextInput
                  style={s.fieldInput}
                  placeholder="email@example.com"
                  placeholderTextColor={Colors.mutedDim}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.applicant_email}
                  onChangeText={(t) => setForm((f) => ({ ...f, applicant_email: t }))}
                />
              </View>

              <View>
                <Text style={s.fieldLabel}>County</Text>
                <TextInput
                  style={s.fieldInput}
                  placeholder="County name"
                  placeholderTextColor={Colors.mutedDim}
                  value={form.county_name}
                  onChangeText={(t) => setForm((f) => ({ ...f, county_name: t }))}
                />
              </View>

              <View>
                <Text style={s.fieldLabel}>Send Via</Text>
                <View style={s.sendViaRow}>
                  {SEND_VIA_OPTIONS.map((opt) => {
                    const active = sendVia === opt
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[s.sendViaChip, active && s.sendViaChipActive]}
                        onPress={() => setSendVia(opt)}
                      >
                        <Text style={[s.sendViaText, active && s.sendViaTextActive]}>{opt}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={[s.createBtn, creating && { opacity: 0.7 }]}
                onPress={handleCreate}
                disabled={creating}
              >
                {creating
                  ? <ActivityIndicator size="small" color="#fff" />
                  : (
                    <>
                      <Ionicons name="send-outline" size={15} color="#fff" />
                      <Text style={s.createBtnText}>Create Application</Text>
                    </>
                  )
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    marginHorizontal: Spacing.xl, marginVertical: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  backBtn: { width: 36, height: 36, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  headerIconWrap: {
    width: 34, height: 34, borderRadius: Radius.sm,
    backgroundColor: Colors.purple + "12", borderWidth: 1, borderColor: Colors.purple + "30",
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  headerSub: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  intakeBtn: {
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: Radius.sm,
    backgroundColor: Colors.bgPanel, borderWidth: 1, borderColor: Colors.border,
  },
  intakeBtnText: { fontSize: 10, color: Colors.muted, fontFamily: Font.semibold },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm,
    backgroundColor: Colors.blueSubtle, borderWidth: 1, borderColor: Colors.blueBorder,
  },
  addBtnText: { fontSize: FontSize.xs, color: Colors.blueLight, fontFamily: Font.bold },
  kpiRow: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: Spacing.xl, marginBottom: Spacing.md,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
  },
  kpiCard: { flex: 1, alignItems: "center", paddingVertical: Spacing.md },
  kpiCardBorder: { borderRightWidth: 1, borderRightColor: Colors.border },
  kpiValue: { fontSize: FontSize.lg, fontFamily: Font.extrabold },
  kpiLabel: { fontSize: 9, color: Colors.mutedDim, marginTop: 2, textAlign: "center" },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: Spacing.xl, marginBottom: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, height: 44,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm },
  tabsScroll: { marginBottom: Spacing.md, height: 38 },
  tabsRow: { paddingHorizontal: Spacing.xl, gap: 8, alignItems: "center" },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.xl, backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  tabText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  tabTextActive: { color: "#fff" },
  tabCount: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.bgPanel, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabCountActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  tabCountText: { fontSize: 9, color: Colors.mutedDim, fontFamily: Font.bold },
  tabCountTextActive: { color: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: Spacing.md },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.blueIconBg, alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.bold },
  emptyText: { fontSize: FontSize.sm, color: Colors.mutedDim, textAlign: "center", paddingHorizontal: 32 },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: 8 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.blueIconBg, borderWidth: 1, borderColor: Colors.blueIconBorder,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: FontSize.md, color: Colors.blueBright, fontFamily: Font.extrabold },
  appName: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold, marginBottom: 4 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: FontSize.xs, color: Colors.muted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  statusText: { fontSize: 10, fontFamily: Font.bold },
  deleteBtn: { padding: 2 },
  dateRow: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginBottom: 8,
  },
  dateText: { fontSize: FontSize.xs, color: Colors.mutedDim },
  // Expanded section
  expandedSection: { paddingTop: 6, marginBottom: 8 },
  expandDivider: { height: 1, backgroundColor: Colors.borderFaint, marginBottom: 10 },
  expandRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  expandLabel: { fontSize: FontSize.xs, color: Colors.mutedDim, fontFamily: Font.semibold },
  expandValue: { fontSize: FontSize.xs, color: Colors.text, fontFamily: Font.semibold, flexShrink: 1, textAlign: "right", maxWidth: "65%" },
  expandNotes: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 4, lineHeight: 18 },
  linkRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 6, paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: Radius.sm, backgroundColor: Colors.blueSubtle,
    borderWidth: 1, borderColor: Colors.blueBorder,
  },
  linkText: { flex: 1, fontSize: FontSize.xs, color: Colors.blueBright, fontFamily: Font.semibold },
  cardFooter: {
    flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4,
    paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderFaint,
  },
  footerBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingVertical: 5, paddingHorizontal: 8,
    borderRadius: Radius.sm,
  },
  footerBtnGreen: { backgroundColor: Colors.green + "14" },
  footerBtnRed: { backgroundColor: Colors.red + "14" },
  footerBtnText: { fontSize: FontSize.xs, color: Colors.blueBright, fontFamily: Font.semibold },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.bgPanel,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg, paddingBottom: 36,
    maxHeight: "88%",
  },
  dragHandle: {
    width: 40, height: 4, backgroundColor: Colors.dragHandle,
    borderRadius: 2, alignSelf: "center", marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  modalHeaderIcon: {
    width: 34, height: 34, borderRadius: Radius.sm,
    backgroundColor: Colors.blueSubtle, borderWidth: 1, borderColor: Colors.blueBorder,
    alignItems: "center", justifyContent: "center",
  },
  modalTitle: { flex: 1, fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.bold },
  modalClose: { padding: 4 },
  fieldLabel: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold, marginBottom: 6 },
  fieldInput: {
    backgroundColor: Colors.bgInput, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    color: Colors.text, fontSize: FontSize.sm,
    paddingHorizontal: Spacing.md, height: 44,
  },
  sendViaRow: { flexDirection: "row", gap: 8 },
  sendViaChip: {
    flex: 1, height: 40, borderRadius: Radius.md,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
  },
  sendViaChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  sendViaText: { fontSize: FontSize.sm, color: Colors.muted, fontFamily: Font.semibold },
  sendViaTextActive: { color: "#fff" },
  createBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, height: 48, borderRadius: Radius.lg,
    backgroundColor: Colors.blue, marginTop: 4,
  },
  createBtnText: { fontSize: FontSize.md, color: "#fff", fontFamily: Font.bold },
})
