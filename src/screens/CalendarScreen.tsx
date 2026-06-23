import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { api, apiPatch } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

function fmtTime(t: string): string {
  if (!t) return ""
  try {
    const [h, m] = t.split(":").map(Number)
    const ampm = h >= 12 ? "PM" : "AM"
    const hr = h % 12 || 12
    return `${hr}:${String(m).padStart(2, "0")} ${ampm}`
  } catch { return t }
}

function daysUntil(d: string): number {
  if (!d) return Infinity
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const target = new Date(d); target.setHours(0, 0, 0, 0)
    return Math.ceil((target.getTime() - today.getTime()) / 86400000)
  } catch { return Infinity }
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  "Court Date":  { bg: Colors.blue + "18", text: Colors.blueBright },
  "Check-In":    { bg: Colors.purple + "18", text: Colors.purple },
  "Payment Due": { bg: Colors.gold + "18", text: Colors.gold },
  "Meeting":     { bg: Colors.green + "18", text: Colors.green },
  "Other":       { bg: Colors.mutedDim + "18", text: Colors.mutedDim },
}

const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  completed: { bg: Colors.green + "18", text: Colors.green },
  missed:    { bg: Colors.red + "18", text: Colors.red },
  today:     { bg: Colors.blue + "18", text: Colors.blueBright },
  upcoming:  { bg: Colors.mutedDim + "18", text: Colors.mutedDim },
}

const EVENT_TYPES = ["Court Date", "Check-In", "Payment Due", "Meeting", "Other"]

export function CalendarScreen() {
  const { identity } = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [activeFilter, setActiveFilter] = useState("upcoming")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({
    client_name: "", court_date: "", court_time: "", court_name: "",
    county: "", event_type: "Court Date", judge: "", address: "", notes: "",
  })
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [completingId, setCompletingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleItem, setRescheduleItem] = useState<any>(null)
  const [rescheduleDate, setRescheduleDate] = useState("")
  const [rescheduleTime, setRescheduleTime] = useState("")
  const [rescheduling, setRescheduling] = useState(false)

  const getEventDate = (item: any) => item.event_date ?? item.court_date ?? item.date ?? ""
  const getEventStatus = (item: any): string => {
    if (item.status) return item.status
    const days = daysUntil(getEventDate(item))
    if (days === 0) return "today"
    if (days < 0) return "missed"
    return "upcoming"
  }

  const applyFilter = (filter: string, source = events) => {
    const td = todayStr()
    let out = source
    if (filter === "today") {
      out = source.filter((e) => getEventDate(e).slice(0, 10) === td)
    } else if (filter === "upcoming") {
      out = source.filter((e) => {
        const d = getEventDate(e).slice(0, 10)
        return d >= td && (e.status ?? "") !== "missed" && (e.status ?? "") !== "completed"
      })
    } else if (filter === "missed") {
      out = source.filter((e) => (e.status ?? "") === "missed" || (getEventDate(e).slice(0, 10) < td && (e.status ?? "") !== "completed"))
    }
    setFiltered(out)
    setActiveFilter(filter)
  }

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const res: any = await api.courtDates(identity, { page_size: "50" })
      const raw = res?.data ?? res?.results ?? res
      const arr = Array.isArray(raw) ? raw : []
      const sorted = arr.sort((a: any, b: any) =>
        new Date(getEventDate(a)).getTime() - new Date(getEventDate(b)).getTime()
      )
      setEvents(sorted)
      applyFilter(activeFilter, sorted)
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const handleAddDate = async () => {
    if (!identity) return
    if (!addForm.client_name.trim() || !addForm.court_date.trim()) {
      Alert.alert("Required", "Please enter client name and court date."); return
    }
    setAdding(true)
    try {
      await api.createCourtDate(identity, { ...addForm, court: addForm.court_name })
      setShowAdd(false)
      setAddForm({ client_name: "", court_date: "", court_time: "", court_name: "", county: "", event_type: "Court Date", judge: "", address: "", notes: "" })
      load()
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not add court date")
    } finally { setAdding(false) }
  }

  const handleDelete = (item: any) => {
    if (!identity) return
    Alert.alert("Delete Event", `Remove this event for ${item.defendant_name ?? item.client_name ?? item.name ?? "this client"}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setDeletingId(item.id)
        try {
          await api.deleteCourtDate(identity, item.id)
          const updated = events.filter((e) => e.id !== item.id)
          setEvents(updated)
          applyFilter(activeFilter, updated)
        } catch (e: any) {
          Alert.alert("Error", e?.message ?? "Could not delete")
        } finally { setDeletingId(null) }
      }},
    ])
  }

  const handleMarkCompleted = (item: any) => {
    if (!identity) return
    Alert.alert(
      "Mark as Completed",
      `Mark court date for ${item.defendant_name ?? item.client_name ?? item.name ?? "client"} as completed?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Complete", onPress: async () => {
          setCompletingId(item.id)
          try {
            await apiPatch("calendar/events/" + item.id + "/", identity, { status: "completed" })
            const updated = events.map((e) => e.id === item.id ? { ...e, status: "completed" } : e)
            setEvents(updated)
            applyFilter(activeFilter, updated)
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Could not update")
          } finally { setCompletingId(null) }
        }},
      ]
    )
  }

  const handleSendReminder = (_item: any) => {
    Alert.alert("Reminder Sent", "A reminder has been sent for this court date.")
  }

  const openReschedule = (item: any) => {
    setRescheduleItem(item)
    setRescheduleDate("")
    setRescheduleTime("")
    setShowReschedule(true)
  }

  const handleReschedule = async () => {
    if (!identity || !rescheduleItem) return
    if (!rescheduleDate.trim()) {
      Alert.alert("Required", "Please enter a new date (YYYY-MM-DD)."); return
    }
    setRescheduling(true)
    try {
      await apiPatch("calendar/events/" + rescheduleItem.id + "/", identity, {
        event_date: rescheduleDate,
        ...(rescheduleTime.trim() ? { event_time: rescheduleTime } : {}),
        status: "upcoming",
      })
      const updated = events.map((e) =>
        e.id === rescheduleItem.id
          ? { ...e, event_date: rescheduleDate, ...(rescheduleTime.trim() ? { event_time: rescheduleTime } : {}), status: "upcoming" }
          : e
      )
      setEvents(updated)
      applyFilter(activeFilter, updated)
      setShowReschedule(false)
      setRescheduleItem(null)
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not reschedule")
    } finally { setRescheduling(false) }
  }

  const td = todayStr()
  const todayCount = events.filter((e) => getEventDate(e).slice(0, 10) === td).length
  const upcomingCount = events.filter((e) => {
    const d = getEventDate(e).slice(0, 10)
    return d >= td && (e.status ?? "") !== "missed" && (e.status ?? "") !== "completed"
  }).length
  const missedCount = events.filter((e) => (e.status ?? "") === "missed" || (getEventDate(e).slice(0, 10) < td && (e.status ?? "") !== "completed")).length

  const kpis = [
    { label: "Today", value: String(todayCount), color: Colors.red },
    { label: "Upcoming", value: String(upcomingCount), color: Colors.blueBright },
    { label: "Missed", value: String(missedCount), color: Colors.red },
    { label: "Total", value: String(events.length), color: Colors.text },
  ]

  const filterTabs = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "upcoming", label: "Upcoming" },
    { key: "missed", label: "Missed" },
  ]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.gold + "12", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.gold + "30" }}>
          <Ionicons name="calendar-outline" size={17} color={Colors.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Court Calendar</Text>
          <Text style={s.subtitle}>Upcoming hearing dates</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="calendar-outline" size={16} color={Colors.blueLight} />
          <Text style={s.addBtnText}>Add Date</Text>
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsRow}>
        {filterTabs.map((t) => (
          <TouchableOpacity key={t.key} style={[s.tab, activeFilter === t.key && s.tabActive]} onPress={() => applyFilter(t.key)}>
            <Text style={[s.tabText, activeFilter === t.key && s.tabTextActive]}>{t.label}</Text>
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
              <Ionicons name="calendar-outline" size={48} color={Colors.mutedDim} />
              <Text style={s.emptyTitle}>No events</Text>
              <Text style={s.emptyText}>No events match the selected filter.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const name = item.defendant_name ?? item.client_name ?? item.name ?? "Unknown"
            const dateStr = getEventDate(item)
            const timeStr = item.event_time ?? item.court_time ?? item.time ?? ""
            const courtName = item.court ?? item.court_name ?? ""
            const county = item.county ?? item.location ?? ""
            const caseNum = item.booking_number ?? item.case_number ?? ""
            const eventType = item.type ?? item.event_type ?? item.hearing_type ?? "Court Date"
            const typeColor = EVENT_TYPE_COLORS[eventType] ?? EVENT_TYPE_COLORS["Other"]
            const itemStatus = getEventStatus(item)
            const statusColor = STATUS_BADGE_COLORS[itemStatus] ?? STATUS_BADGE_COLORS.upcoming
            const days = daysUntil(dateStr)
            const judge = item.judge ?? ""
            const address = item.address ?? ""
            const notes = item.notes ?? ""
            const charges: any[] = Array.isArray(item.charges) ? item.charges : Array.isArray(item.all_charges) ? item.all_charges : []
            const isCompleted = itemStatus === "completed"
            const isExpanded = expandedId === item.id
            const hasDetail = !!(judge || address || notes || charges.length)

            let urgencyColor = Colors.mutedDim
            let urgencyText = ""
            if (days === 0) { urgencyColor = Colors.red; urgencyText = "TODAY" }
            else if (days === 1) { urgencyColor = Colors.orange; urgencyText = "TOMORROW" }
            else if (days <= 7 && days > 0) { urgencyColor = Colors.gold; urgencyText = `${days}d` }
            else if (days > 0) { urgencyText = `${days}d` }

            return (
              <View style={[s.card, days === 0 && s.cardToday, days === 1 && s.cardTomorrow, itemStatus === "missed" && s.cardMissed]}>
                {/* Card body — tapping toggles expanded detail */}
                <TouchableOpacity activeOpacity={0.7} onPress={() => hasDetail && setExpandedId(isExpanded ? null : item.id)}>
                  <View style={s.cardTop}>
                    <View style={s.dateBox}>
                      {dateStr ? (
                        <>
                          <Text style={s.dateMonth}>{new Date(dateStr).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</Text>
                          <Text style={[s.dateDay, days <= 1 && days >= 0 && { color: urgencyColor }]}>
                            {new Date(dateStr).getDate()}
                          </Text>
                        </>
                      ) : (
                        <Text style={s.dateTbd}>TBD</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.clientName}>{name}</Text>
                      {!!courtName && <Text style={s.courtName}>{courtName}</Text>}
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 5 }}>
                      {!!urgencyText && (
                        <View style={[s.urgencyBadge, { backgroundColor: urgencyColor + "18", borderColor: urgencyColor + "40" }]}>
                          <Text style={[s.urgencyText, { color: urgencyColor }]}>{urgencyText}</Text>
                        </View>
                      )}
                      <View style={[s.statusBadge, { backgroundColor: statusColor.bg }]}>
                        <Text style={[s.statusText, { color: statusColor.text }]}>{itemStatus}</Text>
                      </View>
                      {hasDetail && <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color={Colors.mutedDim} />}
                    </View>
                  </View>

                  <View style={s.typesRow}>
                    <View style={[s.typeChipDisplay, { backgroundColor: typeColor.bg }]}>
                      <Text style={[s.typeChipDisplayText, { color: typeColor.text }]}>{eventType}</Text>
                    </View>
                  </View>

                  <View style={s.metaRow}>
                    {!!timeStr && <View style={s.metaItem}><Ionicons name="time-outline" size={12} color={Colors.mutedDim} /><Text style={s.metaText}>{fmtTime(timeStr)}</Text></View>}
                    {!!county && <View style={s.metaItem}><Ionicons name="location-outline" size={12} color={Colors.mutedDim} /><Text style={s.metaText}>{county}</Text></View>}
                    {!!caseNum && <View style={s.metaItem}><Ionicons name="document-outline" size={12} color={Colors.mutedDim} /><Text style={s.metaText}>#{caseNum}</Text></View>}
                  </View>
                </TouchableOpacity>

                {/* Expanded detail */}
                {isExpanded && hasDetail && (
                  <View style={s.expandedSection}>
                    {!!judge && (
                      <View style={s.expandedRow}>
                        <Ionicons name="person-outline" size={13} color={Colors.mutedDim} />
                        <Text style={s.expandedLabel}>Judge:</Text>
                        <Text style={s.expandedValue}>{judge}</Text>
                      </View>
                    )}
                    {!!address && (
                      <View style={s.expandedRow}>
                        <Ionicons name="map-outline" size={13} color={Colors.mutedDim} />
                        <Text style={s.expandedLabel}>Address:</Text>
                        <Text style={s.expandedValue}>{address}</Text>
                      </View>
                    )}
                    {!!notes && (
                      <View style={s.expandedRow}>
                        <Ionicons name="document-text-outline" size={13} color={Colors.mutedDim} />
                        <Text style={s.expandedLabel}>Notes:</Text>
                        <Text style={s.expandedValue}>{notes}</Text>
                      </View>
                    )}
                    {charges.length > 0 && (
                      <View style={s.expandedRow}>
                        <Ionicons name="alert-circle-outline" size={13} color={Colors.mutedDim} />
                        <Text style={s.expandedLabel}>Charges:</Text>
                        <Text style={s.expandedValue}>{charges.map((c: any) => c.description ?? c.name ?? String(c)).join(", ")}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Action row */}
                <View style={s.cardFooter}>
                  <TouchableOpacity style={s.footerAction} onPress={() => handleSendReminder(item)}>
                    <Ionicons name="phone-portrait-outline" size={14} color={Colors.blueBright} />
                    <Text style={s.footerActionText}>Remind</Text>
                  </TouchableOpacity>

                  {!isCompleted && (
                    <TouchableOpacity
                      style={[s.footerAction, { backgroundColor: Colors.green + "18", borderRadius: Radius.sm }]}
                      onPress={() => handleMarkCompleted(item)}
                      disabled={completingId === item.id}
                    >
                      {completingId === item.id
                        ? <ActivityIndicator size="small" color={Colors.green} />
                        : <><Ionicons name="checkmark-circle-outline" size={14} color={Colors.green} /><Text style={[s.footerActionText, { color: Colors.green }]}>Complete</Text></>
                      }
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={s.footerAction} onPress={() => openReschedule(item)}>
                    <Ionicons name="refresh-outline" size={14} color={Colors.gold} />
                    <Text style={[s.footerActionText, { color: Colors.gold }]}>Reschedule</Text>
                  </TouchableOpacity>

                  <View style={{ flex: 1 }} />

                  <TouchableOpacity style={s.footerAction} onPress={() => handleDelete(item)} disabled={deletingId === item.id}>
                    {deletingId === item.id
                      ? <ActivityIndicator size="small" color={Colors.red} />
                      : <><Ionicons name="trash-outline" size={14} color={Colors.red} /><Text style={[s.footerActionText, { color: Colors.red }]}>Delete</Text></>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )
          }}
        />
      )}

      {/* Add Court Date Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
            <ScrollView style={s.modalCard} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={{ width: 40, height: 4, backgroundColor: Colors.dragHandle, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Add Court Date</Text>
                <TouchableOpacity onPress={() => setShowAdd(false)}><Ionicons name="close" size={22} color={Colors.muted} /></TouchableOpacity>
              </View>
              {([
                { key: "client_name", label: "Client Name *", placeholder: "Full name" },
                { key: "court_date", label: "Court Date * (YYYY-MM-DD)", placeholder: "2026-07-15" },
                { key: "court_time", label: "Time (HH:MM)", placeholder: "09:00" },
                { key: "court_name", label: "Court Name", placeholder: "Superior Court" },
                { key: "county", label: "County", placeholder: "Los Angeles" },
                { key: "judge", label: "Judge", placeholder: "Hon. John Smith" },
                { key: "address", label: "Address", placeholder: "123 Main St, City, CA" },
              ] as const).map((f) => (
                <View key={f.key} style={s.field}>
                  <Text style={s.fieldLabel}>{f.label}</Text>
                  <TextInput style={s.fieldInput} value={(addForm as any)[f.key]} onChangeText={(v) => setAddForm((prev) => ({ ...prev, [f.key]: v }))} placeholder={f.placeholder} placeholderTextColor={Colors.mutedDim} />
                </View>
              ))}
              <View style={s.field}>
                <Text style={s.fieldLabel}>Event Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {EVENT_TYPES.map((t) => (
                    <TouchableOpacity key={t} style={[s.typeChip, addForm.event_type === t && s.typeChipActive]} onPress={() => setAddForm((f) => ({ ...f, event_type: t }))}>
                      <Text style={[s.typeChipText, addForm.event_type === t && { color: "#fff" }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Notes</Text>
                <TextInput style={[s.fieldInput, { height: 70, textAlignVertical: "top" }]} value={addForm.notes} onChangeText={(v) => setAddForm((f) => ({ ...f, notes: v }))} placeholder="Additional notes..." placeholderTextColor={Colors.mutedDim} multiline />
              </View>
              <TouchableOpacity style={[s.submitBtn, adding && { opacity: 0.6 }]} onPress={handleAddDate} disabled={adding}>
                {adding ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.submitBtnText}>Add Court Date</Text>}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Reschedule Modal */}
      <Modal visible={showReschedule} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
            <View style={s.modalCardSmall}>
              <View style={{ width: 40, height: 4, backgroundColor: Colors.dragHandle, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Reschedule</Text>
                <TouchableOpacity onPress={() => { setShowReschedule(false); setRescheduleItem(null) }}><Ionicons name="close" size={22} color={Colors.muted} /></TouchableOpacity>
              </View>
              {!!rescheduleItem && (
                <Text style={s.rescheduleSubtitle}>{rescheduleItem.defendant_name ?? rescheduleItem.client_name ?? rescheduleItem.name ?? "Court Date"}</Text>
              )}
              <View style={s.field}>
                <Text style={s.fieldLabel}>New Date * (YYYY-MM-DD)</Text>
                <TextInput style={s.fieldInput} value={rescheduleDate} onChangeText={setRescheduleDate} placeholder="2026-08-01" placeholderTextColor={Colors.mutedDim} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>New Time (HH:MM)</Text>
                <TextInput style={s.fieldInput} value={rescheduleTime} onChangeText={setRescheduleTime} placeholder="09:00" placeholderTextColor={Colors.mutedDim} />
              </View>
              <TouchableOpacity style={[s.submitBtn, { backgroundColor: Colors.gold }, rescheduling && { opacity: 0.6 }]} onPress={handleReschedule} disabled={rescheduling}>
                {rescheduling ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.submitBtnText}>Confirm Reschedule</Text>}
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
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  subtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.blueSubtle, borderWidth: 1, borderColor: Colors.blueBorder },
  addBtnText: { fontSize: FontSize.xs, color: Colors.blueLight, fontFamily: Font.bold },
  kpiRow: { flexDirection: "row", gap: 8, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold },
  kpiLabel: { fontSize: 9, fontFamily: Font.semibold, marginTop: 3, textAlign: "center", color: Colors.muted },
  tabsScroll: { marginBottom: Spacing.md, height: 38 },
  tabsRow: { paddingHorizontal: Spacing.xl, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.xl, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  tabText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  tabTextActive: { color: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.bold },
  emptyText: { fontSize: FontSize.sm, color: Colors.mutedDim },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  cardToday: { borderLeftWidth: 3, borderLeftColor: Colors.red },
  cardTomorrow: { borderColor: Colors.orange + "40" },
  cardMissed: { borderLeftWidth: 3, borderLeftColor: Colors.red + "80" },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md, marginBottom: Spacing.sm },
  dateBox: { width: 48, alignItems: "center", backgroundColor: Colors.blue + "14", borderRadius: Radius.md, paddingVertical: 6, borderWidth: 1, borderColor: Colors.blue + "25" },
  dateMonth: { fontSize: 9, color: Colors.blueBright, fontFamily: Font.bold, letterSpacing: 0.5 },
  dateDay: { fontSize: FontSize.xxl, color: Colors.text, fontFamily: Font.extrabold, lineHeight: 28 },
  dateTbd: { fontSize: FontSize.xs, color: Colors.mutedDim, fontFamily: Font.semibold },
  clientName: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  courtName: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 3 },
  urgencyBadge: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 7, paddingVertical: 3 },
  urgencyText: { fontSize: 10, fontFamily: Font.bold, letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  statusText: { fontSize: 10, fontFamily: Font.bold, textTransform: "capitalize" },
  typesRow: { flexDirection: "row", gap: 6, marginBottom: Spacing.sm },
  typeChipDisplay: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  typeChipDisplayText: { fontSize: 10, fontFamily: Font.bold },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: Spacing.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.muted },
  expandedSection: { borderTopWidth: 1, borderTopColor: Colors.borderFaint, paddingTop: Spacing.sm, marginBottom: Spacing.sm, gap: 6 },
  expandedRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  expandedLabel: { fontSize: FontSize.xs, color: Colors.mutedDim, fontFamily: Font.semibold, minWidth: 60 },
  expandedValue: { fontSize: FontSize.xs, color: Colors.text, flex: 1 },
  cardFooter: { flexDirection: "row", alignItems: "center", paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderFaint, gap: 4, flexWrap: "wrap" },
  footerAction: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8 },
  footerActionText: { fontSize: FontSize.xs, color: Colors.blueBright, fontFamily: Font.semibold },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.bgPanel, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, maxHeight: "92%" },
  modalCardSmall: { backgroundColor: Colors.bgPanel, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.extrabold },
  rescheduleSubtitle: { fontSize: FontSize.sm, color: Colors.muted, marginBottom: Spacing.lg, marginTop: -Spacing.sm },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold, marginBottom: 6 },
  fieldInput: { backgroundColor: Colors.bgInput, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 13, color: Colors.text, fontSize: FontSize.sm },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.xl, backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border },
  typeChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  typeChipText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold, letterSpacing: 0.2 },
  submitBtn: { height: 52, borderRadius: Radius.lg, backgroundColor: Colors.blue, alignItems: "center", justifyContent: "center", marginTop: Spacing.md },
  submitBtnText: { color: "#fff", fontSize: FontSize.md, fontFamily: Font.bold },
})
