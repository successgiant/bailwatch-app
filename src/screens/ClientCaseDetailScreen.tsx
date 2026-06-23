import React, { useEffect, useRef, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useRoute } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useAuth } from "../context/AuthContext"
import { api, apiGet } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

type NavProp = NativeStackNavigationProp<any>

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtMoney(v: any): string {
  const n = parseFloat(String(v ?? "0").replace(/[$,]/g, ""))
  if (isNaN(n) || n === 0) return "$0"
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}`
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch { return d }
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"
}

const AVATAR_COLORS = [Colors.blue, Colors.purple, Colors.green, Colors.gold, Colors.red, Colors.blueBright]
function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

const STATUS_MAP: Record<string, { bg: string; text: string }> = {
  active:      { bg: Colors.green + "20",   text: Colors.green },
  active_bond: { bg: Colors.green + "20",   text: Colors.green },
  pending:     { bg: Colors.gold + "20",    text: Colors.gold },
  in_process:  { bg: Colors.blueBright + "20", text: Colors.blueBright },
  closed:      { bg: Colors.purple + "20",  text: Colors.purple },
  at_risk:     { bg: Colors.red + "20",     text: Colors.red },
  paid:        { bg: Colors.green + "20",   text: Colors.green },
  overdue:     { bg: Colors.red + "20",     text: Colors.red },
  upcoming:    { bg: Colors.blue + "20",    text: Colors.blueLight },
  completed:   { bg: Colors.mutedDim + "20", text: Colors.mutedDim },
}

function statusStyle(status: string) {
  return STATUS_MAP[status?.toLowerCase()] ?? { bg: Colors.mutedDim + "18", text: Colors.mutedDim }
}

// ─── Tab bar ────────────────────────────────────────────────────────────────

const TABS = ["Overview", "Payments", "Court Dates", "Documents", "Notes"] as const
type TabName = typeof TABS[number]

function TabBar({ active, onSelect }: { active: TabName; onSelect: (t: TabName) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ss.tabScroll} contentContainerStyle={ss.tabRow}>
      {TABS.map(t => (
        <TouchableOpacity key={t} style={[ss.tab, active === t && ss.tabActive]} onPress={() => onSelect(t)} activeOpacity={0.7}>
          <Text style={[ss.tabText, active === t && ss.tabTextActive]}>{t}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

// ─── Header ─────────────────────────────────────────────────────────────────

function ClientHeader({
  client,
  payments,
  onAddPayment,
  onAddCourtDate,
  onAddNote,
}: {
  client: any
  payments: any[]
  onAddPayment: () => void
  onAddCourtDate: () => void
  onAddNote: () => void
}) {
  const name = client.full_name ?? client.name ?? "Client"
  const initials = getInitials(name)
  const ac = avatarColor(name)
  const status = client.case_status ?? client.status ?? "pending"
  const sc = statusStyle(status)
  const totalPaid = payments.filter(p => p.status === "paid").reduce((s, p) => s + parseFloat(String(p.amount ?? 0)), 0)
  const balance = payments.filter(p => p.status === "pending").reduce((s, p) => s + parseFloat(String(p.amount ?? 0)), 0)

  return (
    <View style={ss.headerCard}>
      {/* Avatar + name */}
      <View style={ss.avatarRow}>
        <View style={[ss.avatar, { backgroundColor: ac + "22" }]}>
          <Text style={[ss.avatarText, { color: ac }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ss.clientName}>{name}</Text>
          <View style={ss.badgeRow}>
            <View style={[ss.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={[ss.statusText, { color: sc.text }]}>{status.replace(/_/g, " ").toUpperCase()}</Text>
            </View>
            {!!(client.booking_number ?? client.case_number) && (
              <Text style={ss.caseNumText}>#{client.booking_number ?? client.case_number}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Financial row */}
      <View style={ss.finRow}>
        {[
          { label: "Bond Amount", value: fmtMoney(client.bond_amount), color: Colors.text },
          { label: "Total Paid",  value: fmtMoney(totalPaid), color: Colors.green },
          { label: "Balance",     value: fmtMoney(balance),   color: Colors.gold },
        ].map(item => (
          <View key={item.label} style={ss.finCard}>
            <Text style={ss.finLabel}>{item.label}</Text>
            <Text style={[ss.finValue, { color: item.color }]}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* Action buttons */}
      <View style={ss.actionRow}>
        <TouchableOpacity style={ss.actionBtn} onPress={onAddPayment} activeOpacity={0.75}>
          <Ionicons name="card-outline" size={14} color={Colors.blueLight} />
          <Text style={ss.actionBtnText}>+ Payment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ss.actionBtn} onPress={onAddCourtDate} activeOpacity={0.75}>
          <Ionicons name="calendar-outline" size={14} color={Colors.blueLight} />
          <Text style={ss.actionBtnText}>+ Court Date</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ss.actionBtn} onPress={onAddNote} activeOpacity={0.75}>
          <Ionicons name="chatbubble-outline" size={14} color={Colors.blueLight} />
          <Text style={ss.actionBtnText}>+ Note</Text>
        </TouchableOpacity>
      </View>

      {/* Re-arrest banner */}
      {client.is_rearrested && (
        <View style={ss.rearrestBanner}>
          <Ionicons name="alert-circle" size={16} color={Colors.red} />
          <View style={{ flex: 1 }}>
            <Text style={ss.rearrestTitle}>RE-ARREST DETECTED</Text>
            <Text style={ss.rearrestText}>
              {client.rearrest_county ? `County: ${client.rearrest_county}` : ""}
              {client.rearrest_date ? `  •  ${fmtDate(client.rearrest_date)}` : ""}
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ client, payments, courtDates }: { client: any; payments: any[]; courtDates: any[] }) {
  const [showAllCharges, setShowAllCharges] = useState(false)
  const charges: any[] = client.charges ?? []
  const visibleCharges = showAllCharges ? charges : charges.slice(0, 3)
  const totalPaid = payments.filter(p => p.status === "paid").reduce((s, p) => s + parseFloat(String(p.amount ?? 0)), 0)
  const balance = payments.filter(p => p.status === "pending").reduce((s, p) => s + parseFloat(String(p.amount ?? 0)), 0)
  const upcoming = courtDates.filter(cd => (cd.status ?? "upcoming") !== "completed").slice(0, 3)
  const hasCoSigner = !!(client.indemnitor_name || client.indemnitor_phone || client.indemnitor_email)

  return (
    <ScrollView contentContainerStyle={ss.tabContent} showsVerticalScrollIndicator={false}>
      {/* Personal Info */}
      <InfoCard title="Personal Information" icon="person-outline" iconColor={Colors.blueBright}>
        <InfoRow label="Full Name" value={client.full_name ?? client.name ?? "—"} />
        <InfoRow
          label="Phone"
          value={client.phone_number ?? "—"}
          onPress={client.phone_number ? () => Linking.openURL(`tel:${client.phone_number}`) : undefined}
          valueColor={client.phone_number ? Colors.blueLight : undefined}
        />
        <InfoRow label="Email" value={client.email ?? "—"} />
        <InfoRow label="Booking Date" value={fmtDate(client.booking_date)} />
        <InfoRow label="County" value={client.county ?? client.arresting_agency ?? "—"} />
      </InfoCard>

      {/* Co-Signer */}
      {hasCoSigner && (
        <InfoCard title="Co-Signer" icon="shield-outline" iconColor={Colors.purple}>
          <InfoRow label="Name"  value={client.indemnitor_name  ?? "—"} />
          <InfoRow label="Phone" value={client.indemnitor_phone ?? "—"} />
          <InfoRow label="Email" value={client.indemnitor_email ?? "—"} />
        </InfoCard>
      )}

      {/* Case Info */}
      <InfoCard title="Case Information" icon="document-text-outline" iconColor={Colors.gold}>
        <InfoRow label="Booking #"   value={client.booking_number ?? "—"} />
        <InfoRow label="Case #"      value={client.case_number ?? "—"} />
        <InfoRow label="Bond Amount" value={fmtMoney(client.bond_amount)} />
        <InfoRow label="Court Date"  value={fmtDate(client.court_date)} />
        {charges.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <Text style={ss.infoRowLabel}>Charges</Text>
            {visibleCharges.map((c: any, i: number) => (
              <View key={i} style={ss.chargeRow}>
                <Text style={ss.chargeText}>{c.charge ?? c.description ?? "Unknown"}</Text>
                {c.statute ? <Text style={ss.chargeSub}>{c.statute}</Text> : null}
              </View>
            ))}
            {charges.length > 3 && (
              <TouchableOpacity onPress={() => setShowAllCharges(!showAllCharges)} style={{ marginTop: 6 }}>
                <Text style={ss.showMore}>{showAllCharges ? "Show less" : `+${charges.length - 3} more charges`}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </InfoCard>

      {/* Financial Summary */}
      <InfoCard title="Financial Summary" icon="cash-outline" iconColor={Colors.green}>
        <InfoRow label="Bond Amount" value={fmtMoney(client.bond_amount)} />
        <InfoRow label="Total Paid"  value={fmtMoney(totalPaid)} valueColor={Colors.green} />
        <InfoRow label="Balance"     value={fmtMoney(balance)}   valueColor={Colors.gold} />
      </InfoCard>

      {/* Upcoming Court Dates */}
      <InfoCard title="Upcoming Court Dates" icon="calendar-outline" iconColor={Colors.blue}>
        {upcoming.length === 0 ? (
          <Text style={ss.emptyCardText}>No upcoming court dates.</Text>
        ) : (
          upcoming.map((cd, i) => (
            <View key={cd.id ?? i} style={[ss.courtRow, i < upcoming.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.borderFaint }]}>
              <Text style={ss.courtDate}>{fmtDate(cd.event_date)}{cd.event_time ? ` • ${cd.event_time}` : ""}</Text>
              <Text style={ss.courtName}>{cd.court_name ?? cd.court ?? ""}</Text>
            </View>
          ))
        )}
      </InfoCard>
    </ScrollView>
  )
}

// ─── Shared tiny components ───────────────────────────────────────────────────

function InfoCard({ title, icon, iconColor, children }: { title: string; icon: any; iconColor: string; children: React.ReactNode }) {
  return (
    <View style={ss.infoCard}>
      <View style={ss.infoCardHeader}>
        <View style={[ss.infoIcon, { backgroundColor: iconColor + "18" }]}>
          <Ionicons name={icon} size={14} color={iconColor} />
        </View>
        <Text style={ss.infoCardTitle}>{title}</Text>
      </View>
      <View style={ss.infoCardBody}>{children}</View>
    </View>
  )
}

function InfoRow({ label, value, onPress, valueColor }: { label: string; value: string; onPress?: () => void; valueColor?: string }) {
  return (
    <View style={ss.infoRow}>
      <Text style={ss.infoRowLabel}>{label}</Text>
      {onPress ? (
        <TouchableOpacity onPress={onPress}>
          <Text style={[ss.infoRowValue, { color: valueColor ?? Colors.text }]}>{value}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={[ss.infoRowValue, { color: valueColor ?? Colors.text }]} numberOfLines={2}>{value}</Text>
      )}
    </View>
  )
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({
  payments,
  onRefresh,
  onAddPayment,
}: {
  payments: any[]
  onRefresh: () => void
  onAddPayment: () => void
}) {
  const totalPaid = payments.filter(p => p.status === "paid").reduce((s, p) => s + parseFloat(String(p.amount ?? 0)), 0)
  const outstanding = payments.filter(p => p.status === "pending").reduce((s, p) => s + parseFloat(String(p.amount ?? 0)), 0)
  const overdue = payments.filter(p => p.status === "overdue").reduce((s, p) => s + parseFloat(String(p.amount ?? 0)), 0)

  return (
    <View style={{ flex: 1 }}>
      {/* KPI row */}
      <View style={ss.kpiRow}>
        {[
          { label: "Total Paid",  value: fmtMoney(totalPaid),   color: Colors.green },
          { label: "Outstanding", value: fmtMoney(outstanding), color: Colors.gold },
          { label: "Overdue",     value: fmtMoney(overdue),     color: Colors.red },
        ].map(k => (
          <View key={k.label} style={ss.kpiCard}>
            <Text style={[ss.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={ss.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={ss.primaryBtn} onPress={onAddPayment} activeOpacity={0.75}>
        <Ionicons name="add-circle-outline" size={16} color="#fff" />
        <Text style={ss.primaryBtnText}>Add Payment</Text>
      </TouchableOpacity>

      <FlatList
        data={payments}
        keyExtractor={item => String(item.id ?? Math.random())}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 24, gap: 8, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        ListEmptyComponent={<EmptyState icon="card-outline" title="No Payments" subtitle="Record payments to track bond progress." />}
        renderItem={({ item }) => {
          const sc = statusStyle(item.status ?? "pending")
          return (
            <View style={ss.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={ss.listRowTitle}>{fmtDate(item.payment_date)}</Text>
                <Text style={ss.listRowSub}>{item.payment_method ?? item.payment_type ?? "—"}{item.notes ? `  •  ${item.notes}` : ""}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={ss.listRowAmount}>{fmtMoney(item.amount)}</Text>
                <View style={[ss.chip, { backgroundColor: sc.bg }]}>
                  <Text style={[ss.chipText, { color: sc.text }]}>{item.status_display ?? item.status ?? "—"}</Text>
                </View>
              </View>
            </View>
          )
        }}
      />
    </View>
  )
}

// ─── Court Dates Tab ──────────────────────────────────────────────────────────

function CourtDatesTab({
  courtDates,
  onRefresh,
  onAddCourtDate,
}: {
  courtDates: any[]
  onRefresh: () => void
  onAddCourtDate: () => void
}) {
  const upcoming = courtDates.filter(cd => (cd.status ?? "upcoming") !== "completed")
  const past = courtDates.filter(cd => (cd.status ?? "") === "completed")

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false} scrollEnabled={false}>
      <TouchableOpacity style={[ss.primaryBtn, { margin: Spacing.lg }]} onPress={onAddCourtDate} activeOpacity={0.75}>
        <Ionicons name="add-circle-outline" size={16} color="#fff" />
        <Text style={ss.primaryBtnText}>Add Court Date</Text>
      </TouchableOpacity>

      <SectionHeader title={`Upcoming (${upcoming.length})`} color={Colors.blueLight} />
      {upcoming.length === 0 ? (
        <EmptyState icon="calendar-outline" title="No Upcoming Dates" subtitle="Add court dates to track this case." />
      ) : (
        <View style={{ paddingHorizontal: Spacing.lg, gap: 8 }}>
          {upcoming.map((cd, i) => <CourtDateRow key={cd.id ?? i} cd={cd} />)}
        </View>
      )}

      {past.length > 0 && (
        <>
          <SectionHeader title={`Past (${past.length})`} color={Colors.mutedDim} />
          <View style={{ paddingHorizontal: Spacing.lg, gap: 8 }}>
            {past.map((cd, i) => <CourtDateRow key={cd.id ?? i} cd={cd} />)}
          </View>
        </>
      )}
    </ScrollView>
  )
}

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <View style={ss.sectionHeader}>
      <Text style={[ss.sectionHeaderText, { color }]}>{title}</Text>
    </View>
  )
}

function CourtDateRow({ cd }: { cd: any }) {
  const sc = statusStyle(cd.status ?? "upcoming")
  return (
    <View style={ss.listRow}>
      <View style={[ss.listRowIcon, { backgroundColor: Colors.blue + "18" }]}>
        <Ionicons name="calendar-outline" size={16} color={Colors.blueLight} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ss.listRowTitle}>{fmtDate(cd.event_date)}{cd.event_time ? ` • ${cd.event_time}` : ""}</Text>
        <Text style={ss.listRowSub}>{cd.court_name ?? cd.court ?? "—"}{cd.event_type ? `  •  ${cd.event_type}` : ""}</Text>
      </View>
      <View style={[ss.chip, { backgroundColor: sc.bg }]}>
        <Text style={[ss.chipText, { color: sc.text }]}>{cd.status ?? "upcoming"}</Text>
      </View>
    </View>
  )
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

function DocumentsTab({ clientId }: { clientId: string | number }) {
  const { identity } = useAuth()
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!identity) return
    setLoading(true)
    apiGet("documents/", identity, { client_id: String(clientId) })
      .then((d: any) => {
        const arr = d?.data?.results ?? d?.results ?? d?.data ?? d ?? []
        setDocs(Array.isArray(arr) ? arr : [])
      })
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }, [clientId, identity])

  if (loading) return <View style={ss.center}><ActivityIndicator color={Colors.blue} /></View>

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        style={[ss.primaryBtn, { margin: Spacing.lg }]}
        onPress={() => Alert.alert("Upload Documents", "Documents can be uploaded from the web dashboard.")}
        activeOpacity={0.75}
      >
        <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
        <Text style={ss.primaryBtnText}>Upload Document</Text>
      </TouchableOpacity>

      <FlatList
        data={docs}
        keyExtractor={item => String(item.id ?? Math.random())}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 24, gap: 8 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        ListEmptyComponent={<EmptyState icon="document-outline" title="No Documents" subtitle="Upload documents from the web dashboard." />}
        renderItem={({ item }) => {
          const name = item.name ?? item.document_name ?? item.file_name ?? "Document"
          const docType = item.document_type ?? item.doc_type ?? item.type ?? "Other"
          const createdAt = item.created_at ?? item.uploaded_at ?? ""
          const fileUrl = item.file_url ?? item.url ?? item.download_url ?? ""
          return (
            <View style={ss.listRow}>
              <View style={[ss.listRowIcon, { backgroundColor: Colors.purple + "18" }]}>
                <Ionicons name="document-text-outline" size={16} color={Colors.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ss.listRowTitle}>{name}</Text>
                <Text style={ss.listRowSub}>{docType}{createdAt ? `  •  ${fmtDate(createdAt)}` : ""}</Text>
              </View>
              {!!fileUrl && (
                <TouchableOpacity onPress={() => Linking.openURL(fileUrl)} style={ss.iconBtn}>
                  <Ionicons name="download-outline" size={18} color={Colors.blueLight} />
                </TouchableOpacity>
              )}
            </View>
          )
        }}
      />
    </View>
  )
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────

function NotesTab({
  notes,
  clientId,
  onRefresh,
}: {
  notes: any[]
  clientId: string | number
  onRefresh: () => void
}) {
  const { identity } = useAuth()
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  const handleSave = async () => {
    if (!identity || !text.trim()) return
    setSaving(true)
    try {
      await api.addClientNote(identity, clientId, { note: text.trim(), content: text.trim() })
      setText("")
      onRefresh()
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save note")
    } finally { setSaving(false) }
  }

  const sorted = [...notes].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false} scrollEnabled={false}>
        {sorted.length === 0 && <EmptyState icon="chatbubble-outline" title="No Notes" subtitle="Add notes to track case details." />}
        {sorted.map((note, i) => (
          <View key={note.id ?? i} style={ss.noteCard}>
            <View style={ss.noteHeader}>
              <Text style={ss.noteBy}>{note.created_by ?? note.user ?? "Agent"}</Text>
              <Text style={ss.noteDate}>{fmtDate(note.created_at)}</Text>
            </View>
            <Text style={ss.noteContent}>{note.content ?? note.text ?? note.note ?? ""}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={ss.noteInputWrap}>
        <TextInput
          style={ss.noteInput}
          placeholder="Write a note..."
          placeholderTextColor={Colors.mutedDim}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[ss.noteSendBtn, (!text.trim() || saving) && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={!text.trim() || saving}
          activeOpacity={0.75}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <View style={ss.emptyState}>
      <Ionicons name={icon} size={40} color={Colors.mutedDim} />
      <Text style={ss.emptyTitle}>{title}</Text>
      <Text style={ss.emptySubtitle}>{subtitle}</Text>
    </View>
  )
}

// ─── Add Payment Modal ────────────────────────────────────────────────────────

const PAYMENT_TYPES = ["Cash", "Card", "Check", "ACH"]

function AddPaymentModal({
  visible,
  clientId,
  identity,
  onClose,
  onSaved,
}: {
  visible: boolean
  clientId: string | number
  identity: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({ amount: "", payment_date: "", payment_method: "Cash", notes: "" })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.amount) return
    setSaving(true)
    try {
      await api.createPayment(identity, {
        defendant_id: clientId,
        amount: parseFloat(form.amount),
        payment_date: form.payment_date || new Date().toISOString().slice(0, 10),
        payment_method: form.payment_method,
        notes: form.notes,
      })
      setForm({ amount: "", payment_date: "", payment_method: "Cash", notes: "" })
      onSaved()
      onClose()
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save payment")
    } finally { setSaving(false) }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ss.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
          <View style={ss.modalSheet}>
            <View style={ss.dragHandle} />
            <View style={ss.modalHeader}>
              <Text style={ss.modalTitle}>Add Payment</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={Colors.muted} /></TouchableOpacity>
            </View>

            <View style={ss.field}>
              <Text style={ss.fieldLabel}>Amount *</Text>
              <TextInput style={ss.fieldInput} value={form.amount} onChangeText={v => setForm(f => ({ ...f, amount: v }))} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.mutedDim} />
            </View>

            <View style={ss.field}>
              <Text style={ss.fieldLabel}>Payment Date (YYYY-MM-DD)</Text>
              <TextInput style={ss.fieldInput} value={form.payment_date} onChangeText={v => setForm(f => ({ ...f, payment_date: v }))} placeholder="2025-01-15" placeholderTextColor={Colors.mutedDim} />
            </View>

            <View style={ss.field}>
              <Text style={ss.fieldLabel}>Payment Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {PAYMENT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[ss.chip, { backgroundColor: form.payment_method === t ? Colors.blue : Colors.bgCard, borderWidth: 1, borderColor: form.payment_method === t ? Colors.blue : Colors.border, paddingHorizontal: 14, paddingVertical: 8 }]}
                    onPress={() => setForm(f => ({ ...f, payment_method: t }))}
                  >
                    <Text style={[ss.chipText, { color: form.payment_method === t ? "#fff" : Colors.muted }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={ss.field}>
              <Text style={ss.fieldLabel}>Notes</Text>
              <TextInput style={[ss.fieldInput, { minHeight: 70 }]} value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} placeholder="Optional notes..." placeholderTextColor={Colors.mutedDim} multiline />
            </View>

            <TouchableOpacity style={[ss.primaryBtn, (!form.amount || saving) && { opacity: 0.5 }]} onPress={handleSave} disabled={!form.amount || saving} activeOpacity={0.75}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={ss.primaryBtnText}>Save Payment</Text>}
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

// ─── Add Court Date Modal ─────────────────────────────────────────────────────

const EVENT_TYPES = ["Court Date", "Check-In", "Payment Due", "Meeting", "Other"]

function AddCourtDateModal({
  visible,
  clientName,
  clientId,
  identity,
  onClose,
  onSaved,
}: {
  visible: boolean
  clientName: string
  clientId: string | number
  identity: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({ court: "", event_date: "", event_time: "", event_type: "Court Date", judge: "", notes: "" })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.event_date) return
    setSaving(true)
    try {
      await api.createCourtDate(identity, {
        defendant: clientId,
        defendant_name: clientName,
        court_name: form.court,
        event_date: form.event_date,
        event_time: form.event_time,
        event_type: form.event_type,
        judge: form.judge,
        notes: form.notes,
        status: "upcoming",
      })
      setForm({ court: "", event_date: "", event_time: "", event_type: "Court Date", judge: "", notes: "" })
      onSaved()
      onClose()
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save court date")
    } finally { setSaving(false) }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ss.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
          <ScrollView>
            <View style={ss.modalSheet}>
              <View style={ss.dragHandle} />
              <View style={ss.modalHeader}>
                <Text style={ss.modalTitle}>Add Court Date</Text>
                <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={Colors.muted} /></TouchableOpacity>
              </View>

              <View style={ss.field}>
                <Text style={ss.fieldLabel}>Court Name</Text>
                <TextInput style={ss.fieldInput} value={form.court} onChangeText={v => setForm(f => ({ ...f, court: v }))} placeholder="Harris County Courthouse" placeholderTextColor={Colors.mutedDim} />
              </View>

              <View style={ss.field}>
                <Text style={ss.fieldLabel}>Date * (YYYY-MM-DD)</Text>
                <TextInput style={ss.fieldInput} value={form.event_date} onChangeText={v => setForm(f => ({ ...f, event_date: v }))} placeholder="2025-01-15" placeholderTextColor={Colors.mutedDim} />
              </View>

              <View style={ss.field}>
                <Text style={ss.fieldLabel}>Time (HH:MM)</Text>
                <TextInput style={ss.fieldInput} value={form.event_time} onChangeText={v => setForm(f => ({ ...f, event_time: v }))} placeholder="09:00" placeholderTextColor={Colors.mutedDim} />
              </View>

              <View style={ss.field}>
                <Text style={ss.fieldLabel}>Event Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {EVENT_TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[ss.chip, { backgroundColor: form.event_type === t ? Colors.blue : Colors.bgCard, borderWidth: 1, borderColor: form.event_type === t ? Colors.blue : Colors.border, paddingHorizontal: 12, paddingVertical: 8 }]}
                      onPress={() => setForm(f => ({ ...f, event_type: t }))}
                    >
                      <Text style={[ss.chipText, { color: form.event_type === t ? "#fff" : Colors.muted }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={ss.field}>
                <Text style={ss.fieldLabel}>Judge</Text>
                <TextInput style={ss.fieldInput} value={form.judge} onChangeText={v => setForm(f => ({ ...f, judge: v }))} placeholder="Judge Name" placeholderTextColor={Colors.mutedDim} />
              </View>

              <View style={ss.field}>
                <Text style={ss.fieldLabel}>Notes</Text>
                <TextInput style={[ss.fieldInput, { minHeight: 70 }]} value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} placeholder="Optional notes..." placeholderTextColor={Colors.mutedDim} multiline />
              </View>

              <TouchableOpacity style={[ss.primaryBtn, (!form.event_date || saving) && { opacity: 0.5 }]} onPress={handleSave} disabled={!form.event_date || saving} activeOpacity={0.75}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={ss.primaryBtnText}>Save Court Date</Text>}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function ClientCaseDetailScreen() {
  const navigation = useNavigation<NavProp>()
  const route = useRoute()
  const { identity } = useAuth()
  const params = (route.params ?? {}) as { client?: any; clientId?: string | number }

  const [client, setClient] = useState<any>(params.client ?? null)
  const [payments, setPayments] = useState<any[]>([])
  const [courtDates, setCourtDates] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(!params.client)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabName>("Overview")
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showCourtModal, setShowCourtModal] = useState(false)

  const clientId = params.client?.id ?? params.clientId ?? client?.id

  const loadAll = async (quiet = false) => {
    if (!identity || !clientId) return
    if (!quiet) setLoading(true)
    try {
      const [clientRes, paymentsRes, courtRes, notesRes] = await Promise.allSettled([
        api.client(identity, clientId),
        api.payments(identity),
        api.courtDates(identity, { defendant: String(clientId) }),
        api.clientNotes(identity, clientId),
      ])

      if (clientRes.status === "fulfilled" && clientRes.value) {
        const d = (clientRes.value as any)?.data ?? clientRes.value
        if (d) setClient(d)
      }

      if (paymentsRes.status === "fulfilled") {
        const raw = (paymentsRes.value as any)?.data?.results ?? (paymentsRes.value as any)?.data ?? (paymentsRes.value as any)?.results ?? paymentsRes.value
        const arr: any[] = Array.isArray(raw) ? raw : []
        setPayments(arr.filter((p: any) => String(p.defendant_id ?? p.defendant ?? p.client_id ?? "") === String(clientId)))
      }

      if (courtRes.status === "fulfilled") {
        const raw = (courtRes.value as any)?.data?.results ?? (courtRes.value as any)?.data ?? (courtRes.value as any)?.results ?? courtRes.value
        setCourtDates(Array.isArray(raw) ? raw : [])
      }

      if (notesRes.status === "fulfilled") {
        const raw = (notesRes.value as any)?.data?.results ?? (notesRes.value as any)?.data ?? (notesRes.value as any)?.results ?? notesRes.value
        setNotes(Array.isArray(raw) ? raw : [])
      }
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadAll() }, [clientId, identity])

  if (loading && !client) {
    return (
      <SafeAreaView style={ss.safe} edges={["top"]}>
        <View style={ss.center}><ActivityIndicator size="large" color={Colors.blue} /></View>
      </SafeAreaView>
    )
  }

  if (!client) {
    return (
      <SafeAreaView style={ss.safe} edges={["top"]}>
        <TouchableOpacity style={{ margin: Spacing.lg }} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={ss.center}><Text style={ss.emptyTitle}>Client not found</Text></View>
      </SafeAreaView>
    )
  }

  const clientName = client.full_name ?? client.name ?? "Client"

  return (
    <SafeAreaView style={ss.safe} edges={["top"]}>
      {/* Top bar */}
      <View style={ss.topBar}>
        <TouchableOpacity style={ss.backBtnRow} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={ss.topTitle} numberOfLines={1}>{clientName}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(true) }} tintColor={Colors.blue} />}
      >
        <ClientHeader
          client={client}
          payments={payments}
          onAddPayment={() => setShowPaymentModal(true)}
          onAddCourtDate={() => setShowCourtModal(true)}
          onAddNote={() => setActiveTab("Notes")}
        />

        <TabBar active={activeTab} onSelect={setActiveTab} />

        <View style={{ minHeight: 400, paddingTop: Spacing.md }}>
          {activeTab === "Overview" && (
            <OverviewTab client={client} payments={payments} courtDates={courtDates} />
          )}
          {activeTab === "Payments" && (
            <PaymentsTab
              payments={payments}
              onRefresh={() => loadAll(true)}
              onAddPayment={() => setShowPaymentModal(true)}
            />
          )}
          {activeTab === "Court Dates" && (
            <CourtDatesTab
              courtDates={courtDates}
              onRefresh={() => loadAll(true)}
              onAddCourtDate={() => setShowCourtModal(true)}
            />
          )}
          {activeTab === "Documents" && <DocumentsTab clientId={clientId} />}
          {activeTab === "Notes" && (
            <NotesTab notes={notes} clientId={clientId} onRefresh={() => loadAll(true)} />
          )}
        </View>
      </ScrollView>

      <AddPaymentModal
        visible={showPaymentModal}
        clientId={clientId}
        identity={identity ?? ""}
        onClose={() => setShowPaymentModal(false)}
        onSaved={() => loadAll(true)}
      />

      <AddCourtDateModal
        visible={showCourtModal}
        clientName={clientName}
        clientId={clientId}
        identity={identity ?? ""}
        onClose={() => setShowCourtModal(false)}
        onSaved={() => loadAll(true)}
      />
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  topBar: { flexDirection: "row", alignItems: "center", gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: 10, backgroundColor: Colors.bg },
  backBtnRow: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },

  // Header card
  headerCard: { margin: Spacing.lg, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: 14 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: FontSize.xl, fontFamily: Font.extrabold },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" },
  clientName: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.extrabold },
  caseNumText: { fontSize: FontSize.xs, color: Colors.mutedDim, fontFamily: Font.medium },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  statusText: { fontSize: 10, fontFamily: Font.bold, textTransform: "uppercase" },
  finRow: { flexDirection: "row", gap: 8 },
  finCard: { flex: 1, backgroundColor: Colors.bgPanel, borderRadius: Radius.sm, padding: 10, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  finLabel: { fontSize: 9, color: Colors.mutedDim, fontFamily: Font.semibold, textAlign: "center" },
  finValue: { fontSize: FontSize.sm, fontFamily: Font.extrabold, marginTop: 3, textAlign: "center" },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 9, borderRadius: Radius.sm, backgroundColor: Colors.blueSubtle, borderWidth: 1, borderColor: Colors.blueBorder },
  actionBtnText: { fontSize: FontSize.xs, color: Colors.blueLight, fontFamily: Font.bold },
  rearrestBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: Colors.red + "12", borderRadius: Radius.sm, padding: 12, borderWidth: 1, borderColor: Colors.red + "30" },
  rearrestTitle: { fontSize: FontSize.xs, color: Colors.red, fontFamily: Font.extrabold },
  rearrestText: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },

  // Tab bar
  tabScroll: { height: 44, backgroundColor: Colors.bgPanel, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabRow: { paddingHorizontal: Spacing.lg, gap: 8, alignItems: "center" },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.xl, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  tabText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  tabTextActive: { color: "#fff" },

  // Tab content
  tabContent: { padding: Spacing.lg, gap: 14, paddingBottom: 40 },

  // Info card
  infoCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  infoCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: Spacing.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderFaint, backgroundColor: Colors.bgPanel },
  infoIcon: { width: 28, height: 28, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
  infoCardTitle: { fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.bold },
  infoCardBody: { padding: Spacing.lg, gap: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  infoRowLabel: { fontSize: FontSize.xs, color: Colors.mutedDim, fontFamily: Font.medium, flex: 1 },
  infoRowValue: { fontSize: FontSize.xs, color: Colors.text, fontFamily: Font.semibold, textAlign: "right", flex: 2 },
  chargeRow: { backgroundColor: Colors.bgPanel, borderRadius: Radius.sm, padding: 10, marginBottom: 4 },
  chargeText: { fontSize: FontSize.xs, color: Colors.text, fontFamily: Font.semibold },
  chargeSub: { fontSize: 10, color: Colors.mutedDim, marginTop: 2 },
  showMore: { fontSize: FontSize.xs, color: Colors.blueLight, fontFamily: Font.semibold },
  courtRow: { paddingVertical: 10 },
  courtDate: { fontSize: FontSize.xs, color: Colors.text, fontFamily: Font.semibold },
  courtName: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 2 },
  emptyCardText: { fontSize: FontSize.xs, color: Colors.mutedDim, textAlign: "center", paddingVertical: 8 },

  // KPI
  kpiRow: { flexDirection: "row", gap: 8, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.md, fontFamily: Font.extrabold },
  kpiLabel: { fontSize: 9, color: Colors.muted, fontFamily: Font.semibold, marginTop: 3, textAlign: "center" },

  // List rows
  listRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  listRowIcon: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
  listRowTitle: { fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.semibold },
  listRowSub: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 2 },
  listRowAmount: { fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.extrabold },

  // Section headers
  sectionHeader: { paddingHorizontal: Spacing.lg, paddingTop: 14, paddingBottom: 6 },
  sectionHeaderText: { fontSize: FontSize.xs, fontFamily: Font.bold, letterSpacing: 0.8 },

  // Chip
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  chipText: { fontSize: 10, fontFamily: Font.bold, textTransform: "capitalize" },

  // Notes
  noteCard: { marginHorizontal: Spacing.lg, marginTop: 10, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  noteHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  noteBy: { fontSize: FontSize.xs, color: Colors.blueLight, fontFamily: Font.bold },
  noteDate: { fontSize: FontSize.xs, color: Colors.mutedDim },
  noteContent: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
  noteInputWrap: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: Spacing.lg, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.bg },
  noteInput: { flex: 1, backgroundColor: Colors.bgInput, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 10, color: Colors.text, fontSize: FontSize.sm, maxHeight: 100 },
  noteSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.blue, alignItems: "center", justifyContent: "center" },

  // Buttons
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 48, borderRadius: Radius.lg, backgroundColor: Colors.blue, marginHorizontal: Spacing.lg },
  primaryBtnText: { color: "#fff", fontSize: FontSize.sm, fontFamily: Font.bold },
  iconBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.blueSubtle, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.blueBorder },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.bgPanel, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12 },
  dragHandle: { width: 40, height: 4, backgroundColor: Colors.dragHandle, borderRadius: 2, alignSelf: "center", marginBottom: 18 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.extrabold },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold, marginBottom: 6 },
  fieldInput: { backgroundColor: Colors.bgInput, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 12, color: Colors.text, fontSize: FontSize.sm },

  // Misc
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: Spacing.md },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.bold },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.mutedDim, textAlign: "center" },
})
