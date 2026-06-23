import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, RefreshControl, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

function timeAgo(dateStr: string, timeStr?: string): string {
  if (!dateStr) return ""
  try {
    let d: Date
    if (timeStr) {
      const [y, m, day] = dateStr.split("-").map(Number)
      const [h, min, s] = (timeStr || "00:00:00").split(":").map(Number)
      d = new Date(y, m - 1, day, h, min, s)
    } else {
      d = new Date(dateStr)
    }
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  } catch { return "" }
}

function bookingAgeColor(booking_date: string, booking_time?: string) {
  try {
    const [y, m, d] = booking_date.split("-").map(Number)
    const [h, min] = (booking_time || "00:00:00").split(":").map(Number)
    const hrs = (Date.now() - new Date(y, m - 1, d, h, min).getTime()) / 3600000
    if (hrs < 1)  return Colors.green
    if (hrs < 6)  return Colors.blue
    if (hrs < 24) return Colors.gold
    return Colors.mutedDim
  } catch { return Colors.mutedDim }
}

function fmtBond(v: any): string {
  const n = parseFloat(String(v ?? "0").replace(/[$,]/g, ""))
  if (!n) return "N/A"
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}`
}

export function ArrestAlertScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [bookings, setBookings] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [counties, setCounties] = useState<string[]>([])
  const [selectedCounty, setSelectedCounty] = useState("All")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [newOnly, setNewOnly] = useState(false)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [ignoredIds, setIgnoredIds] = useState<Set<number>>(new Set())

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const res: any = await api.arrests(identity, { page_size: "50" })
      const list = res?.bookings ?? res?.results ?? res?.data ?? res
      const arr = Array.isArray(list) ? list : []
      setBookings(arr)
      applyFilters(query, selectedCounty, newOnly, arr)
      const cnts = Array.from(new Set(arr.map((b: any) => b.arresting_agency ?? b.county ?? "").filter(Boolean))) as string[]
      setCounties(cnts)
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const handleAddClient = async (item: any) => {
    if (!identity) return
    Alert.alert(
      "Add as Client",
      `Add ${item.full_name ?? "this person"} as a new client?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Add Client", onPress: async () => {
          setAddingId(item.id)
          try {
            await api.inmateToClient(identity, { inmate_id: item.id, booking_id: item.id })
            const updated = bookings.map((b) => b.id === item.id ? { ...b, is_client_added: true } : b)
            setBookings(updated)
            applyFilters(query, selectedCounty, newOnly, updated)
            Alert.alert("Success", `${item.full_name ?? "Client"} has been added.`)
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Could not add client.")
          } finally { setAddingId(null) }
        }},
      ]
    )
  }

  const handleIgnore = (item: any) => {
    setIgnoredIds((prev) => new Set([...prev, item.id]))
    const updated = bookings.filter((b) => b.id !== item.id)
    setBookings(updated)
    applyFilters(query, selectedCounty, newOnly, updated)
  }

  const applyFilters = (q: string, county: string, onlyNew: boolean, source = bookings) => {
    let out = source
    if (onlyNew) out = out.filter((b) => b.is_new || !b.is_client_added)
    if (county !== "All") out = out.filter((b) => (b.arresting_agency ?? b.county ?? "") === county)
    if (q.trim()) {
      const lq = q.toLowerCase()
      out = out.filter((b) =>
        (b.full_name ?? "").toLowerCase().includes(lq) ||
        (b.booking_number ?? "").toLowerCase().includes(lq) ||
        (b.arresting_agency ?? b.county ?? "").toLowerCase().includes(lq)
      )
    }
    setFiltered(out)
  }

  const newCount = bookings.filter((b) => !b.is_client_added).length

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.red + "18", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="warning-outline" size={17} color={Colors.red} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Arrest Alerts</Text>
          <View style={s.liveRow}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>LIVE MONITORING</Text>
          </View>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={() => load()}>
          <Ionicons name="refresh-outline" size={20} color={Colors.blueBright} />
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <View style={s.statsBar}>
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: Colors.text }]}>{bookings.length}</Text>
          <Text style={s.statLab}>Total</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: Colors.green }]}>{newCount}</Text>
          <Text style={s.statLab}>New Bookings</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: Colors.purple }]}>{bookings.filter((b) => b.prior_client_match || b.is_prior_client).length}</Text>
          <Text style={s.statLab}>Prior Clients</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: Colors.blueBright }]}>{counties.length}</Text>
          <Text style={s.statLab}>Counties</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
          <TextInput
            style={s.searchInput}
            placeholder="Search name, booking #, county..."
            placeholderTextColor={Colors.mutedDim}
            value={query}
            onChangeText={(t) => { setQuery(t); applyFilters(t, selectedCounty, newOnly) }}
          />
          {!!query && (
            <TouchableOpacity onPress={() => { setQuery(""); applyFilters("", selectedCounty, newOnly) }}>
              <Ionicons name="close-circle" size={16} color={Colors.mutedDim} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[s.filterToggle, newOnly && s.filterToggleActive]}
          onPress={() => { setNewOnly(!newOnly); applyFilters(query, selectedCounty, !newOnly) }}
        >
          <Ionicons name="flash-outline" size={14} color={newOnly ? Colors.text : Colors.mutedDim} />
          <Text style={[s.filterToggleText, newOnly && { color: Colors.text }]}>New</Text>
        </TouchableOpacity>
      </View>

      {/* County chips */}
      {counties.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={s.chipRow}>
          {["All", ...counties].map((c) => (
            <TouchableOpacity
              key={c}
              style={[s.chip, selectedCounty === c && s.chipActive]}
              onPress={() => { setSelectedCounty(c); applyFilters(query, c, newOnly) }}
            >
              <Text style={[s.chipText, selectedCounty === c && s.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id ?? Math.random())}
          contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={Colors.blue} />}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="checkmark-circle-outline" size={48} color={Colors.green} />
              <Text style={s.emptyTitle}>No Alerts</Text>
              <Text style={s.emptyText}>No bookings match your filters.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const name = item.full_name ?? item.name ?? "Unknown"
            const county = item.arresting_agency ?? item.county ?? ""
            const timeStr = timeAgo(item.booking_date ?? item.created_at ?? "", item.booking_time)
            const ageColor = item.booking_date ? bookingAgeColor(item.booking_date, item.booking_time) : Colors.mutedDim
            const charges: string[] = Array.isArray(item.charges)
              ? item.charges.map((c: any) => typeof c === "string" ? c : c.charge ?? c.description ?? "").filter(Boolean)
              : []
            const bondAmt = fmtBond(item.bond_amount)
            const bondType = item.bond_type ?? "Surety"
            const isNew = !item.is_client_added
            const isPrior = item.prior_client_match || item.is_prior_client
            const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()

            return (
              <View style={[s.card, isNew && s.cardNew]}>
                {/* Card header */}
                <View style={s.cardHeader}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{initials || "?"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.nameRow}>
                      <Text style={s.personName}>{name}</Text>
                      {isNew && (
                        <View style={s.newBadge}>
                          <Text style={s.newBadgeText}>NEW BOOKING</Text>
                        </View>
                      )}
                      {isPrior && (
                        <View style={s.priorBadge}>
                          <Text style={s.priorBadgeText}>PRIOR CLIENT</Text>
                        </View>
                      )}
                    </View>
                    {!!item.booking_number && (
                      <Text style={s.bookingNum}>#{item.booking_number}</Text>
                    )}
                  </View>
                  <View style={[s.ageBadge, { backgroundColor: ageColor + "18", borderColor: ageColor + "40" }]}>
                    <View style={[s.ageDot, { backgroundColor: ageColor }]} />
                    <Text style={[s.ageText, { color: ageColor }]}>{timeStr}</Text>
                  </View>
                </View>

                {/* Location */}
                {!!county && (
                  <View style={s.locationRow}>
                    <Ionicons name="location-outline" size={13} color={Colors.mutedDim} />
                    <Text style={s.locationText}>{county}</Text>
                    {!!item.state && <Text style={s.locationText}>, {item.state}</Text>}
                  </View>
                )}

                {/* Person details */}
                <View style={s.detailRow}>
                  {!!item.date_of_birth && (
                    <View style={s.detailChip}>
                      <Text style={s.detailChipText}>DOB: {item.date_of_birth}</Text>
                    </View>
                  )}
                  {!!item.gender && (
                    <View style={s.detailChip}>
                      <Text style={s.detailChipText}>{item.gender}</Text>
                    </View>
                  )}
                  {!!item.race && (
                    <View style={s.detailChip}>
                      <Text style={s.detailChipText}>{item.race}</Text>
                    </View>
                  )}
                </View>

                {/* Charges */}
                {charges.length > 0 && (
                  <View style={s.chargesWrap}>
                    {charges.slice(0, 3).map((ch, ci) => (
                      <View key={ci} style={s.chargePill}>
                        <Text style={s.chargePillText} numberOfLines={1}>{ch.length > 35 ? ch.slice(0, 33) + "…" : ch}</Text>
                      </View>
                    ))}
                    {charges.length > 3 && (
                      <View style={s.moreCharges}>
                        <Text style={s.moreChargesText}>+{charges.length - 3} more</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Bond */}
                <View style={s.bondRow}>
                  <View style={s.bondAmt}>
                    <Text style={s.bondLabel}>Bond Amount</Text>
                    <Text style={s.bondValue}>{bondAmt}</Text>
                  </View>
                  <View style={s.bondType}>
                    <Text style={s.bondLabel}>Type</Text>
                    <Text style={s.bondTypeText}>{bondType}</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={s.actions}>
                  {item.is_client_added ? (
                    <View style={[s.actionBtnPrimary, { backgroundColor: Colors.green, flex: 1 }]}>
                      <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
                      <Text style={s.actionBtnPrimaryText}>Client Added</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[s.actionBtnPrimary, addingId === item.id && { opacity: 0.6 }]}
                      onPress={() => handleAddClient(item)}
                      disabled={addingId === item.id}
                    >
                      {addingId === item.id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <><Ionicons name="person-add-outline" size={14} color="#fff" /><Text style={s.actionBtnPrimaryText}>Add Client</Text></>
                      }
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={s.actionBtn} onPress={() => handleIgnore(item)}>
                    <Ionicons name="eye-off-outline" size={14} color={Colors.mutedDim} />
                    <Text style={s.actionBtnText}>Ignore</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginHorizontal: Spacing.xl, marginVertical: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.green },
  liveText: { fontSize: 9, color: Colors.green, fontFamily: Font.bold, letterSpacing: 1 },
  refreshBtn: { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  statsBar: { flexDirection: "row", alignItems: "center", marginHorizontal: Spacing.xl, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, marginBottom: Spacing.md },
  statItem: { flex: 1, alignItems: "center" },
  statVal: { fontSize: FontSize.xl, fontFamily: Font.extrabold },
  statLab: { fontSize: 9, color: Colors.mutedDim, marginTop: 2, textAlign: "center" },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  searchRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
  searchWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, height: 42 },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm },
  filterToggle: { flexDirection: "row", alignItems: "center", gap: 4, height: 42, paddingHorizontal: 12, borderRadius: Radius.md, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  filterToggleActive: { backgroundColor: Colors.blue + "18", borderColor: Colors.blue + "50" },
  filterToggleText: { fontSize: FontSize.xs, color: Colors.mutedDim, fontFamily: Font.semibold },
  chipScroll: { marginBottom: Spacing.md },
  chipRow: { paddingHorizontal: Spacing.xl, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.xl, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  chipText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  chipTextActive: { color: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.bold },
  emptyText: { fontSize: FontSize.sm, color: Colors.mutedDim },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  cardNew: { borderColor: Colors.green + "40", borderLeftWidth: 3, borderLeftColor: Colors.green },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md, marginBottom: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.blueIconBg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.blueIconBorder },
  avatarText: { fontSize: FontSize.md, color: Colors.blueBright, fontFamily: Font.extrabold },
  nameRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 3 },
  personName: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  bookingNum: { fontSize: FontSize.xs, color: Colors.mutedDim },
  newBadge: { backgroundColor: "transparent", borderWidth: 1, borderColor: Colors.red + "60", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  newBadgeText: { fontSize: 8, color: Colors.red, fontFamily: Font.bold, letterSpacing: 0.5 },
  priorBadge: { backgroundColor: Colors.purple + "18", borderWidth: 1, borderColor: Colors.purple + "40", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  priorBadgeText: { fontSize: 8, color: Colors.purple, fontFamily: Font.bold, letterSpacing: 0.5 },
  ageBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 7, paddingVertical: 4 },
  ageDot: { width: 6, height: 6, borderRadius: 3 },
  ageText: { fontSize: 10, fontFamily: Font.semibold },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: Spacing.sm },
  locationText: { fontSize: FontSize.xs, color: Colors.muted },
  detailRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: Spacing.sm },
  detailChip: { backgroundColor: Colors.bgPanel, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.border },
  detailChipText: { fontSize: 10, color: Colors.muted },
  chargesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: Spacing.md },
  chargePill: { backgroundColor: Colors.red + "14", borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.red + "25", paddingHorizontal: 8, paddingVertical: 3 },
  chargePillText: { fontSize: 10, color: Colors.red + "cc", fontFamily: Font.medium },
  moreCharges: { backgroundColor: Colors.bgPanel, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  moreChargesText: { fontSize: 10, color: Colors.mutedDim },
  bondRow: { flexDirection: "row", gap: Spacing.xl, marginBottom: Spacing.lg, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderFaint },
  bondAmt: {},
  bondLabel: { fontSize: 10, color: Colors.mutedDim, marginBottom: 2 },
  bondValue: { fontSize: FontSize.lg, color: Colors.green, fontFamily: Font.extrabold },
  bondType: {},
  bondTypeText: { fontSize: FontSize.sm, color: Colors.muted, fontFamily: Font.semibold },
  actions: { flexDirection: "row", gap: 8 },
  actionBtnPrimary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, height: 36, borderRadius: Radius.md, backgroundColor: Colors.blue },
  actionBtnPrimaryText: { fontSize: FontSize.xs, color: "#fff", fontFamily: Font.bold },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, height: 36, paddingHorizontal: 12, borderRadius: Radius.md, backgroundColor: Colors.bgPanel, borderWidth: 1, borderColor: Colors.border },
  actionBtnText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
})
