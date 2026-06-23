import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

export function CountyCoverageScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [counties, setCounties] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showRequest, setShowRequest] = useState(false)
  const [requestForm, setRequestForm] = useState({ county_name: "", state: "", notes: "" })
  const [requesting, setRequesting] = useState(false)

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const res: any = await api.counties(identity)
      const list = res?.results ?? res?.data ?? res
      const arr = Array.isArray(list) ? list : []
      setCounties(arr)
      setFiltered(arr)
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const handleRequest = async () => {
    if (!identity) return
    if (!requestForm.county_name.trim()) { Alert.alert("Required", "Please enter the county name."); return }
    setRequesting(true)
    try {
      await api.requestCounty(identity, requestForm)
      setShowRequest(false)
      setRequestForm({ county_name: "", state: "", notes: "" })
      Alert.alert("Request Submitted", "Your county coverage request has been submitted for review.")
      load()
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not submit request")
    } finally { setRequesting(false) }
  }

  const handleSearch = (text: string) => {
    setQuery(text)
    if (!text.trim()) { setFiltered(counties); return }
    const q = text.toLowerCase()
    setFiltered(counties.filter(c => (c.county_name ?? c.name ?? c.county ?? "").toLowerCase().includes(q)))
  }

  const active = counties.filter(c => (c.status ?? c.is_active ? "active" : "pending").toLowerCase() === "active").length
  const pending = counties.filter(c => (c.status ?? "").toLowerCase() === "pending").length
  const totalClients = counties.reduce((sum, c) => sum + (c.client_count ?? c.clients ?? 0), 0)
  const totalBonds = counties.reduce((sum, c) => sum + (c.bond_count ?? c.bonds ?? 0), 0)

  const kpis = [
    { label: "Active Counties", value: String(active), color: Colors.green },
    { label: "Pending", value: String(pending), color: Colors.gold },
    { label: "Total Clients", value: String(totalClients), color: Colors.blueBright },
    { label: "Active Bonds", value: String(totalBonds), color: Colors.text },
  ]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.blueIconBg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.blueIconBorder }}>
          <Ionicons name="map-outline" size={17} color={Colors.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>County Coverage</Text>
          <Text style={s.subtitle}>Assigned Counties</Text>
        </View>
        <TouchableOpacity style={s.requestBtn} onPress={() => setShowRequest(true)}>
          <Ionicons name="add" size={16} color={Colors.blueBright} />
          <Text style={s.requestText}>Request</Text>
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
        <TextInput style={s.searchInput} placeholder="Search counties..." placeholderTextColor={Colors.mutedDim} value={query} onChangeText={handleSearch} />
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
          ListEmptyComponent={<Text style={s.empty}>No counties assigned.</Text>}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => {
            const name = item.county_name ?? item.name ?? item.county ?? "Unknown"
            const state = item.state ?? ""
            const status = item.status ?? (item.is_active ? "Active" : "Pending")
            const isActive = status.toLowerCase() === "active"
            const clients = item.client_count ?? item.clients ?? 0
            const bonds = item.bond_count ?? item.bonds ?? 0
            return (
              <View style={s.card}>
                <View style={s.cardTop}>
                  <View style={[s.mapIcon, { backgroundColor: isActive ? Colors.blue + "18" : Colors.gold + "14" }]}>
                    <Ionicons name="location-outline" size={20} color={isActive ? Colors.blue : Colors.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.countyName}>{name}</Text>
                    {!!state && <Text style={s.stateName}>{state}</Text>}
                  </View>
                  <View style={[s.badge, { backgroundColor: isActive ? Colors.green + "22" : Colors.gold + "22" }]}>
                    <Text style={[s.badgeText, { color: isActive ? Colors.green : Colors.gold }]}>{status}</Text>
                  </View>
                </View>
                {isActive && (clients > 0 || bonds > 0) && (
                  <View style={s.countyMeta}>
                    <View style={s.metaItem}>
                      <Ionicons name="people-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>{clients} clients</Text>
                    </View>
                    <View style={s.metaItem}>
                      <Ionicons name="shield-outline" size={12} color={Colors.mutedDim} />
                      <Text style={s.metaText}>{bonds} bonds</Text>
                    </View>
                  </View>
                )}
                {!isActive && <Text style={s.pendingNote}>Coverage request pending approval</Text>}
              </View>
            )
          }}
        />
      )}
      <Modal visible={showRequest} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
            <View style={s.modalCard}>
                <View style={{ width: 40, height: 4, backgroundColor: Colors.dragHandle, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Request County Coverage</Text>
                <TouchableOpacity onPress={() => setShowRequest(false)}>
                  <Ionicons name="close" size={22} color={Colors.muted} />
                </TouchableOpacity>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>County Name *</Text>
                <TextInput style={s.fieldInput} value={requestForm.county_name} onChangeText={(v) => setRequestForm((f) => ({ ...f, county_name: v }))} placeholder="e.g. Los Angeles" placeholderTextColor={Colors.mutedDim} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>State</Text>
                <TextInput style={s.fieldInput} value={requestForm.state} onChangeText={(v) => setRequestForm((f) => ({ ...f, state: v }))} placeholder="e.g. CA" placeholderTextColor={Colors.mutedDim} autoCapitalize="characters" maxLength={2} />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Notes</Text>
                <TextInput style={[s.fieldInput, { height: 80, textAlignVertical: "top" }]} value={requestForm.notes} onChangeText={(v) => setRequestForm((f) => ({ ...f, notes: v }))} placeholder="Reason for request..." placeholderTextColor={Colors.mutedDim} multiline />
              </View>
              <TouchableOpacity style={[s.submitBtn, requesting && { opacity: 0.6 }]} onPress={handleRequest} disabled={requesting}>
                {requesting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.submitBtnText}>Submit Request</Text>}
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
  requestBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.blueSubtle, borderWidth: 1, borderColor: Colors.blueBorder },
  requestText: { fontSize: FontSize.xs, color: Colors.blueLight, fontFamily: Font.bold },
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.blueBorder, padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold, color: Colors.text },
  kpiLabel: { fontSize: 9, fontFamily: Font.semibold, marginTop: 3, textAlign: "center" },
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.blueBorder, paddingHorizontal: Spacing.md, height: 42, gap: Spacing.sm },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  empty: { textAlign: "center", color: Colors.mutedDim, marginTop: 40, fontSize: FontSize.md },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.blueBorder, padding: Spacing.lg },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.sm },
  mapIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  countyName: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  stateName: { fontSize: FontSize.xs, color: Colors.mutedDim },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  badgeText: { fontSize: 10, fontFamily: Font.bold },
  countyMeta: { flexDirection: "row", gap: Spacing.lg, paddingLeft: 52 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.mutedDim },
  pendingNote: { fontSize: FontSize.xs, color: Colors.gold, paddingLeft: 52, fontStyle: "italic" },
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
