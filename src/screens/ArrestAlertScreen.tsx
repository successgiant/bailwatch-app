import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, RefreshControl, Alert,
} from "react-native"
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
      const [h, min, sec] = (timeStr || "00:00:00").split(":").map(Number)
      d = new Date(y, m - 1, day, h, min, sec)
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

function bookingAgeColor(booking_date: string, booking_time?: string): string {
  try {
    const [y, m, d] = booking_date.split("-").map(Number)
    const [h, min] = (booking_time || "00:00:00").split(":").map(Number)
    const hrs = (Date.now() - new Date(y, m - 1, d, h, min).getTime()) / 3600000
    if (hrs < 1) return Colors.green
    if (hrs < 6) return Colors.blue
    if (hrs < 24) return Colors.gold
    return Colors.mutedDim
  } catch { return Colors.mutedDim }
}

function fmtBond(v: any): string {
  const n = parseFloat(String(v ?? "0").replace(/[$,]/g, ""))
  if (!n) return "N/A"
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}`
}

function avgBond(list: any[]): string {
  const amounts = list
    .map((b) => parseFloat(String(b.bond_amount ?? "0").replace(/[$,]/g, "")))
    .filter((n) => n > 0)
  if (!amounts.length) return "N/A"
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
  return `$${Math.round(avg).toLocaleString("en-US")}`
}

const TIMEFRAMES = [
  { key: "1h", label: "1h" },
  { key: "6h", label: "6h" },
  { key: "24h", label: "24h" },
  { key: "48h", label: "48h" },
  { key: "7d", label: "7d" },
]

const SORT_OPTIONS = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "bond-high", label: "Bond ↓" },
  { key: "bond-low", label: "Bond ↑" },
]

export function ArrestAlertScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [bookings, setBookings] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [timeframe, setTimeframe] = useState("24h")
  const [sortBy, setSortBy] = useState("newest")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [addingId, setAddingId] = useState<number | null>(null)

  const load = async (quiet = false, tf = timeframe) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const res: any = await api.arrests(identity, { timeframe: tf, page_size: "50" })
      const list = res?.bookings ?? res?.results ?? res?.data ?? res
      const arr = Array.isArray(list) ? list : []
      setBookings(arr)
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const handleTimeframeChange = (tf: string) => {
    setTimeframe(tf)
    load(false, tf)
  }

  const handleAddClient = async (item: any) => {
    if (!identity) return
    Alert.alert(
      "Add as Client",
      `Add ${item.full_name ?? "this person"} as a new client?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add Client",
          onPress: async () => {
            setAddingId(item.id)
            try {
              await api.inmateToClient(identity, { inmate_id: item.id })
              setBookings((prev) =>
                prev.map((b) => b.id === item.id ? { ...b, is_client_added: true } : b)
              )
              Alert.alert("Success", `${item.full_name ?? "Client"} has been added.`)
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Could not add client.")
            } finally { setAddingId(null) }
          },
        },
      ]
    )
  }

  const sortedFiltered = (() => {
    let out = [...bookings]
    if (query.trim()) {
      const lq = query.toLowerCase()
      out = out.filter((b) =>
        (b.full_name ?? "").toLowerCase().includes(lq) ||
        (b.booking_number ?? "").toLowerCase().includes(lq) ||
        (b.arresting_agency ?? b.county ?? "").toLowerCase().includes(lq)
      )
    }
    if (sortBy === "newest") {
      out.sort((a, b) => {
        const da = new Date(`${a.booking_date ?? ""}T${a.booking_time ?? "00:00:00"}`).getTime()
        const db = new Date(`${b.booking_date ?? ""}T${b.booking_time ?? "00:00:00"}`).getTime()
        return db - da
      })
    } else if (sortBy === "oldest") {
      out.sort((a, b) => {
        const da = new Date(`${a.booking_date ?? ""}T${a.booking_time ?? "00:00:00"}`).getTime()
        const db = new Date(`${b.booking_date ?? ""}T${b.booking_time ?? "00:00:00"}`).getTime()
        return da - db
      })
    } else if (sortBy === "bond-high") {
      out.sort((a, b) =>
        parseFloat(String(b.bond_amount ?? "0").replace(/[$,]/g, "")) -
        parseFloat(String(a.bond_amount ?? "0").replace(/[$,]/g, ""))
      )
    } else if (sortBy === "bond-low") {
      out.sort((a, b) =>
        parseFloat(String(a.bond_amount ?? "0").replace(/[$,]/g, "")) -
        parseFloat(String(b.bond_amount ?? "0").replace(/[$,]/g, ""))
      )
    }
    return out
  })()

  const newCount = bookings.filter((b) => b.booking_type === "new" || b.type === "new" || (!b.is_client_added && !b.is_re_arrest && b.type !== "re_arrest")).length
  const reArrestCount = bookings.filter((b) => b.is_re_arrest || b.type === "re_arrest" || b.booking_type === "re_arrest").length

  const kpis = [
    { label: "Total", value: String(bookings.length), color: Colors.text },
    { label: "New Bookings", value: String(newCount), color: Colors.green },
    { label: "Re-Arrests", value: String(reArrestCount), color: Colors.red },
    { label: "Avg Bond", value: avgBond(bookings), color: Colors.gold },
  ]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={s.headerIconWrap}>
          <Ionicons name="warning-outline" size={17} color={Colors.red} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Arrest Alerts</Text>
          <View style={s.liveRow}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>LIVE · {bookings.length} bookings</Text>
          </View>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={() => { setRefreshing(true); load(true) }}>
          <Ionicons name="refresh-outline" size={18} color={Colors.blueLight} />
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.chipScroll}
        contentContainerStyle={s.chipRow}
      >
        <Text style={s.chipGroupLabel}>Timeframe:</Text>
        {TIMEFRAMES.map((t) => {
          const active = timeframe === t.key
          return (
            <TouchableOpacity
              key={t.key}
              style={[s.chip, active && s.chipActive]}
              onPress={() => handleTimeframeChange(t.key)}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.chipScroll}
        contentContainerStyle={s.chipRow}
      >
        <Text style={s.chipGroupLabel}>Sort:</Text>
        {SORT_OPTIONS.map((t) => {
          const active = sortBy === t.key
          return (
            <TouchableOpacity
              key={t.key}
              style={[s.chip, active && s.chipActive]}
              onPress={() => setSortBy(t.key)}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <View style={s.searchRow}>
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
          <TextInput
            style={s.searchInput}
            placeholder="Search name, booking #, county..."
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
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      ) : (
        <FlatList
          data={sortedFiltered}
          keyExtractor={(item) => String(item.id ?? Math.random())}
          contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32, gap: 12 }}
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
                <Ionicons name="checkmark-circle-outline" size={32} color={Colors.green} />
              </View>
              <Text style={s.emptyTitle}>No Arrests Found</Text>
              <Text style={s.emptyText}>No bookings match your filters for the selected timeframe.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const name = item.full_name ?? item.name ?? "Unknown"
            const county = item.arresting_agency ?? item.county ?? ""
            const timeStr = timeAgo(item.booking_date ?? item.created_at ?? "", item.booking_time)
            const ageColor = item.booking_date
              ? bookingAgeColor(item.booking_date, item.booking_time)
              : Colors.mutedDim
            const charges: string[] = Array.isArray(item.charges)
              ? item.charges.map((c: any) => typeof c === "string" ? c : c.charge ?? c.description ?? "").filter(Boolean)
              : []
            const bondAmt = fmtBond(item.bond_amount)
            const bondType = item.bond_type ?? "Surety"
            const isReArrest = item.is_re_arrest || item.type === "re_arrest" || item.booking_type === "re_arrest"
            const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()

            return (
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{initials || "?"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.nameRow}>
                      <Text style={s.personName} numberOfLines={1}>{name}</Text>
                      <View style={[s.typeBadge, isReArrest ? s.typeBadgeRed : s.typeBadgeAmber]}>
                        <Text style={[s.typeBadgeText, isReArrest ? s.typeBadgeTextRed : s.typeBadgeTextAmber]}>
                          {isReArrest ? "RE-ARREST" : "NEW"}
                        </Text>
                      </View>
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

                {!!county && (
                  <View style={s.locationRow}>
                    <Ionicons name="location-outline" size={13} color={Colors.mutedDim} />
                    <Text style={s.locationText}>{county}</Text>
                    {!!item.state && <Text style={s.locationText}>, {item.state}</Text>}
                  </View>
                )}

                {(!!item.age || !!item.gender) && (
                  <View style={s.detailRow}>
                    {!!item.age && (
                      <View style={s.detailChip}>
                        <Text style={s.detailChipText}>Age: {item.age}</Text>
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
                )}

                {charges.length > 0 && (
                  <View style={s.chargesWrap}>
                    {charges.slice(0, 2).map((ch, ci) => (
                      <View key={ci} style={s.chargePill}>
                        <Text style={s.chargePillText} numberOfLines={1}>
                          {ch.length > 38 ? ch.slice(0, 36) + "…" : ch}
                        </Text>
                      </View>
                    ))}
                    {charges.length > 2 && (
                      <View style={s.moreCharges}>
                        <Text style={s.moreChargesText}>+{charges.length - 2} more</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={s.bondRow}>
                  <View>
                    <Text style={s.bondLabel}>Bond Amount</Text>
                    <Text style={s.bondValue}>{bondAmt}</Text>
                  </View>
                  <View>
                    <Text style={s.bondLabel}>Type</Text>
                    <Text style={s.bondTypeText}>{bondType}</Text>
                  </View>
                  {!!item.bond_status && (
                    <View>
                      <Text style={s.bondLabel}>Status</Text>
                      <Text style={s.bondTypeText}>{item.bond_status}</Text>
                    </View>
                  )}
                </View>

                <View style={s.actions}>
                  {item.is_client_added ? (
                    <View style={s.addedBadge}>
                      <Ionicons name="checkmark-circle-outline" size={14} color={Colors.green} />
                      <Text style={s.addedBadgeText}>Already Added</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[s.addBtn, addingId === item.id && { opacity: 0.6 }]}
                      onPress={() => handleAddClient(item)}
                      disabled={addingId === item.id}
                    >
                      {addingId === item.id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : (
                          <>
                            <Ionicons name="person-add-outline" size={14} color="#fff" />
                            <Text style={s.addBtnText}>Add Client</Text>
                          </>
                        )
                      }
                    </TouchableOpacity>
                  )}
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
  header: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    marginHorizontal: Spacing.xl, marginVertical: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  backBtn: { width: 36, height: 36, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  headerIconWrap: {
    width: 34, height: 34, borderRadius: Radius.sm,
    backgroundColor: Colors.red + "18", alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.green },
  liveText: { fontSize: 9, color: Colors.green, fontFamily: Font.bold, letterSpacing: 0.8 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: Colors.blueSubtle, borderWidth: 1, borderColor: Colors.blueBorder,
    alignItems: "center", justifyContent: "center",
  },
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
  chipScroll: { marginBottom: 6, height: 36 },
  chipRow: { paddingHorizontal: Spacing.xl, gap: 8, alignItems: "center" },
  chipGroupLabel: { fontSize: FontSize.xs, color: Colors.mutedDim, fontFamily: Font.semibold },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.xl,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  chipText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  chipTextActive: { color: "#fff" },
  searchRow: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, height: 42,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm },
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
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md, marginBottom: Spacing.md },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.blueIconBg, borderWidth: 1, borderColor: Colors.blueIconBorder,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: FontSize.md, color: Colors.blueBright, fontFamily: Font.extrabold },
  nameRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 3 },
  personName: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold, flexShrink: 1 },
  bookingNum: { fontSize: FontSize.xs, color: Colors.mutedDim },
  typeBadge: {
    borderWidth: 1, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  typeBadgeRed: { borderColor: Colors.red + "60", backgroundColor: "transparent" },
  typeBadgeAmber: { borderColor: Colors.gold + "60", backgroundColor: "transparent" },
  typeBadgeText: { fontSize: 8, fontFamily: Font.bold, letterSpacing: 0.5 },
  typeBadgeTextRed: { color: Colors.red },
  typeBadgeTextAmber: { color: Colors.gold },
  ageBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 7, paddingVertical: 4,
  },
  ageDot: { width: 6, height: 6, borderRadius: 3 },
  ageText: { fontSize: 10, fontFamily: Font.semibold },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: Spacing.sm },
  locationText: { fontSize: FontSize.xs, color: Colors.muted },
  detailRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: Spacing.sm },
  detailChip: {
    backgroundColor: Colors.bgPanel, borderRadius: Radius.sm,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.border,
  },
  detailChipText: { fontSize: 10, color: Colors.muted },
  chargesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: Spacing.md },
  chargePill: {
    backgroundColor: Colors.red + "14", borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.red + "25",
    paddingHorizontal: 8, paddingVertical: 3,
  },
  chargePillText: { fontSize: 10, color: Colors.red + "cc", fontFamily: Font.medium },
  moreCharges: { backgroundColor: Colors.bgPanel, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  moreChargesText: { fontSize: 10, color: Colors.mutedDim },
  bondRow: {
    flexDirection: "row", gap: Spacing.xl, marginBottom: Spacing.lg,
    paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderFaint,
  },
  bondLabel: { fontSize: 10, color: Colors.mutedDim, marginBottom: 2 },
  bondValue: { fontSize: FontSize.lg, color: Colors.green, fontFamily: Font.extrabold },
  bondTypeText: { fontSize: FontSize.sm, color: Colors.muted, fontFamily: Font.semibold },
  actions: { flexDirection: "row", gap: 8 },
  addBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, height: 36, borderRadius: Radius.md, backgroundColor: Colors.blue,
  },
  addBtnText: { fontSize: FontSize.xs, color: "#fff", fontFamily: Font.bold },
  addedBadge: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, height: 36, borderRadius: Radius.md,
    backgroundColor: Colors.green + "18", borderWidth: 1, borderColor: Colors.green + "40",
  },
  addedBadgeText: { fontSize: FontSize.xs, color: Colors.green, fontFamily: Font.bold },
})
