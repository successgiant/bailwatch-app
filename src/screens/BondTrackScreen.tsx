import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform, Linking } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

const STATUS_COLORS: Record<string, string> = {
  active: Colors.green, Active: Colors.green,
  alert: Colors.red, Alert: Colors.red,
  "missed check-in": Colors.gold, missed_checkin: Colors.gold,
  inactive: Colors.mutedDim, Inactive: Colors.mutedDim,
}

export function BondTrackScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [tracked, setTracked] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [resolvingId, setResolvingId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ client_name: "", phone: "", notes: "" })
  const [adding, setAdding] = useState(false)

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const res: any = await api.bondtrack(identity)
      const list = res?.results ?? res?.data ?? res
      const arr = Array.isArray(list) ? list : []
      setTracked(arr)
      applySearch(query, arr)
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const applySearch = (text: string, source = tracked) => {
    if (!text.trim()) { setFiltered(source); return }
    const q = text.toLowerCase()
    setFiltered(source.filter(t => (t.full_name ?? t.name ?? t.client_name ?? t.defendant_name ?? "").toLowerCase().includes(q)))
  }

  const handleSearch = (text: string) => {
    setQuery(text)
    applySearch(text)
  }

  const handleCall = (item: any) => {
    const phone = item.phone ?? item.phone_number ?? item.contact_phone ?? ""
    if (!phone) { Alert.alert("No Phone", "No phone number on file for this client."); return }
    Linking.openURL(`tel:${phone.replace(/\D/g, "")}`).catch(() => Alert.alert("Error", "Could not initiate call."))
  }

  const handleMap = (item: any) => {
    const lat = item.lat ?? item.latitude ?? ""
    const lng = item.lng ?? item.longitude ?? ""
    if (lat && lng) {
      Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`).catch(() => {})
    } else {
      const addr = item.last_location ?? item.location_label ?? item.address ?? ""
      if (addr) {
        Linking.openURL(`https://www.google.com/maps?q=${encodeURIComponent(addr)}`).catch(() => {})
      } else {
        Alert.alert("No Location", "No location data available for this client.")
      }
    }
  }

  const handleResolve = (item: any) => {
    if (!identity) return
    Alert.alert("Resolve Alert", `Mark the alert for ${item.full_name ?? item.name ?? item.client_name ?? "this client"} as resolved?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Resolve", style: "default", onPress: async () => {
        setResolvingId(item.id)
        try {
          await api.bondtrackResolve(identity, item.id)
          const updated = tracked.map(t => t.id === item.id ? { ...t, status: "active", has_alert: false, geofence_breach: false } : t)
          setTracked(updated)
          applySearch(query, updated)
        } catch (e: any) {
          Alert.alert("Error", e?.message ?? "Could not resolve alert")
        } finally { setResolvingId(null) }
      }},
    ])
  }

  const handleAddSession = async () => {
    if (!identity) return
    if (!addForm.client_name.trim()) { Alert.alert("Required", "Please enter client name."); return }
    setAdding(true)
    try {
      await api.createBondTrack(identity, addForm)
      setShowAdd(false)
      setAddForm({ client_name: "", phone: "", notes: "" })
      load()
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not add tracking session")
    } finally { setAdding(false) }
  }

  const alertItems = tracked.filter(t => ["VIOLATION", "alert", "Alert"].includes(t.status ?? "") || t.has_alert)
  const activeItems = tracked.filter(t => ["ACTIVE", "active", "Active"].includes(t.status ?? ""))

  const kpis = [
    { label: "Tracked", value: String(tracked.length), color: Colors.blueBright },
    { label: "Active", value: String(activeItems.length), color: Colors.green },
    { label: "Alerts", value: String(alertItems.length), color: Colors.red },
    { label: "Geofence", value: String(tracked.filter(t => t.geofence_breach || t.geofence_alert).length), color: Colors.gold },
  ]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.green + "12", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.green + "30" }}>
          <Ionicons name="location-outline" size={17} color={Colors.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>BondTrack GPS</Text>
          <Text style={s.subtitle}>Real-Time Monitoring</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={22} color="#fff" />
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

      {alertItems.length > 0 && (
        <View style={s.alertBanner}>
          <Ionicons name="warning" size={16} color={Colors.red} />
          <Text style={s.alertText} numberOfLines={1}>
            {alertItems[0]?.full_name ?? alertItems[0]?.client_name ?? "Alert"} — Geofence breach or alert detected
          </Text>
          <TouchableOpacity onPress={() => handleResolve(alertItems[0])}>
            <Text style={s.alertAction}>Resolve</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
        <TextInput style={s.searchInput} placeholder="Search tracked clients..." placeholderTextColor={Colors.mutedDim} value={query} onChangeText={handleSearch} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id ?? Math.random())}
          contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={Colors.blue} />}
          ListEmptyComponent={<Text style={s.empty}>No tracked clients.</Text>}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const name = item.defendant_name ?? item.full_name ?? item.name ?? item.client_name ?? "Unknown"
            const status = item.status ?? (item.has_alert ? "Alert" : "Active")
            const sc = STATUS_COLORS[status] ?? Colors.muted
            const hasAlert = ["VIOLATION", "alert", "Alert"].includes(status) || item.has_alert || item.geofence_breach
            const lastSeen = item.location_label ?? item.last_location ?? item.last_seen_location ?? ""
            const lastCheck = item.last_seen ?? item.last_checkin ?? ""
            const caseNum = item.case_number ?? item.bond_id ?? ""
            return (
              <TouchableOpacity style={[s.card, hasAlert && s.cardAlert]}>
                <View style={s.cardTop}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{name[0]?.toUpperCase() ?? "?"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cname}>{name}</Text>
                    <Text style={s.sub}>{caseNum ? `#${caseNum}` : ""}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: sc + "22" }]}>
                    <Text style={[s.badgeText, { color: sc }]}>{status}</Text>
                  </View>
                </View>

                <View style={s.locationRow}>
                  {!!lastSeen && (
                    <View style={s.locationItem}>
                      <Ionicons name="location-outline" size={14} color={hasAlert ? Colors.red : Colors.blue} />
                      <Text style={[s.locationText, { color: hasAlert ? Colors.red : Colors.muted }]}>{lastSeen}</Text>
                    </View>
                  )}
                </View>

                <View style={s.footer}>
                  <View style={s.footerLeft}>
                    <Ionicons name="time-outline" size={12} color={Colors.mutedDim} />
                    <Text style={s.footerText}>
                      {lastCheck ? `Last: ${new Date(lastCheck).toLocaleString()}` : "No check-in data"}
                    </Text>
                  </View>
                  <View style={s.footerActions}>
                    <TouchableOpacity style={s.actionBtn} onPress={() => handleMap(item)}>
                      <Ionicons name="map-outline" size={16} color={Colors.blueBright} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actionBtn} onPress={() => handleCall(item)}>
                      <Ionicons name="call-outline" size={16} color={Colors.mutedDim} />
                    </TouchableOpacity>
                    {hasAlert && (
                      <TouchableOpacity style={s.resolveBtn} onPress={() => handleResolve(item)} disabled={resolvingId === item.id}>
                        {resolvingId === item.id
                          ? <ActivityIndicator size="small" color={Colors.green} />
                          : <Text style={s.resolveText}>Resolve</Text>
                        }
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
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
                <Text style={s.modalTitle}>Add Tracking Session</Text>
                <TouchableOpacity onPress={() => setShowAdd(false)}>
                  <Ionicons name="close" size={22} color={Colors.muted} />
                </TouchableOpacity>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Client Name *</Text>
                <TextInput style={s.fieldInput} value={addForm.client_name} onChangeText={(v) => setAddForm((f) => ({ ...f, client_name: v }))} placeholder="Full name" placeholderTextColor={Colors.mutedDim} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Phone Number</Text>
                <TextInput style={s.fieldInput} value={addForm.phone} onChangeText={(v) => setAddForm((f) => ({ ...f, phone: v }))} placeholder="e.g. (555) 555-5555" placeholderTextColor={Colors.mutedDim} keyboardType="phone-pad" />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Notes</Text>
                <TextInput style={[s.fieldInput, { height: 80, textAlignVertical: "top" }]} value={addForm.notes} onChangeText={(v) => setAddForm((f) => ({ ...f, notes: v }))} placeholder="Case details..." placeholderTextColor={Colors.mutedDim} multiline />
              </View>
              <TouchableOpacity style={[s.submitBtn, adding && { opacity: 0.6 }]} onPress={handleAddSession} disabled={adding}>
                {adding ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.submitBtnText}>Start Tracking</Text>}
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.md, marginHorizontal: Spacing.xl, marginVertical: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  subtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 4 },
  addBtn: { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Colors.blue, alignItems: "center", justifyContent: "center" },
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.blueBorder, padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold, color: Colors.text },
  kpiLabel: { fontSize: 9, fontFamily: Font.semibold, marginTop: 3, textAlign: "center" },
  alertBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: Spacing.xl, marginBottom: Spacing.md, backgroundColor: Colors.red + "14", borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.red + "33", padding: Spacing.md },
  alertText: { flex: 1, fontSize: FontSize.xs, color: Colors.red, fontFamily: Font.medium },
  alertAction: { fontSize: FontSize.xs, color: Colors.red, fontFamily: Font.bold },
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.blueBorder, paddingHorizontal: Spacing.md, height: 42, gap: Spacing.sm },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  empty: { textAlign: "center", color: Colors.mutedDim, marginTop: 40, fontSize: FontSize.md },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.blueBorder, padding: Spacing.lg },
  cardAlert: { borderColor: Colors.red + "55", borderLeftWidth: 3, borderLeftColor: Colors.red },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.blueIconBg, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: FontSize.md, color: Colors.blueBright, fontFamily: Font.bold },
  cname: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  sub: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  badgeText: { fontSize: 10, fontFamily: Font.bold },
  locationRow: { gap: 6, marginBottom: Spacing.md, paddingLeft: 2 },
  locationItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationText: { fontSize: FontSize.sm, fontFamily: Font.medium },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: Colors.rowDivider, paddingTop: Spacing.md },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: FontSize.xs, color: Colors.mutedDim },
  footerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.rowDivider, alignItems: "center", justifyContent: "center" },
  resolveBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm, backgroundColor: Colors.green + "18", borderWidth: 1, borderColor: Colors.green + "33" },
  resolveText: { fontSize: FontSize.xs, color: Colors.green, fontFamily: Font.bold },
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
