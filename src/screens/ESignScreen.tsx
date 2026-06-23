import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, ScrollView } from "react-native"
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

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  pending: { bg: Colors.gold + "18", text: Colors.gold, icon: "time-outline" },
  pending_signature: { bg: Colors.gold + "18", text: Colors.gold, icon: "time-outline" },
  "Pending Signature": { bg: Colors.gold + "18", text: Colors.gold, icon: "time-outline" },
  signed: { bg: Colors.green + "18", text: Colors.green, icon: "checkmark-circle-outline" },
  Signed: { bg: Colors.green + "18", text: Colors.green, icon: "checkmark-circle-outline" },
  completed: { bg: Colors.green + "18", text: Colors.green, icon: "checkmark-circle-outline" },
  expired: { bg: Colors.red + "18", text: Colors.red, icon: "alert-circle-outline" },
  Expired: { bg: Colors.red + "18", text: Colors.red, icon: "alert-circle-outline" },
  voided: { bg: Colors.mutedDim + "18", text: Colors.mutedDim, icon: "close-circle-outline" },
  draft: { bg: Colors.mutedDim + "18", text: Colors.mutedDim, icon: "document-outline" },
}

const DOC_TYPE_ICONS: Record<string, string> = {
  bond_agreement: "shield-outline",
  indemnity: "document-text-outline",
  collateral: "lock-closed-outline",
  receipt: "receipt-outline",
  power_of_attorney: "briefcase-outline",
}

export function ESignScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [docs, setDocs] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!identity) return
    api.esign(identity).then((res: any) => {
      const raw = res?.data?.results ?? res?.data ?? res?.results ?? res
      setDocs(Array.isArray(raw) ? raw : [])
      setFiltered(Array.isArray(raw) ? raw : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [identity])

  const applyFilters = (q: string, status: string, source = docs) => {
    let out = source
    if (status !== "all") {
      out = out.filter((d) => {
        const st = (d.status ?? "").toLowerCase().replace(/ /g, "_")
        const filterSt = status.toLowerCase().replace(/ /g, "_")
        return st.includes(filterSt) || filterSt.includes(st)
      })
    }
    if (q.trim()) {
      const lq = q.toLowerCase()
      out = out.filter((d) =>
        (d.document_name ?? d.name ?? d.title ?? "").toLowerCase().includes(lq) ||
        (d.client_name ?? d.signer_name ?? "").toLowerCase().includes(lq)
      )
    }
    setFiltered(out)
  }

  const pending = docs.filter((d) => (d.status ?? "").toLowerCase().includes("pending")).length
  const signed = docs.filter((d) => ["signed", "completed"].includes((d.status ?? "").toLowerCase())).length
  const expired = docs.filter((d) => (d.status ?? "").toLowerCase() === "expired").length

  const kpis = [
    { label: "Total", value: String(docs.length), color: Colors.text },
    { label: "Pending", value: String(pending), color: Colors.gold },
    { label: "Signed", value: String(signed), color: Colors.green },
    { label: "Expired", value: String(expired), color: Colors.red },
  ]

  const statusTabs = ["all", "pending", "signed", "expired", "draft"]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.gold + "18", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="create-outline" size={17} color={Colors.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>eSign Documents</Text>
          <Text style={s.subtitle}>Electronic signatures</Text>
        </View>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="add" size={18} color="#fff" />
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
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="document-text-outline" size={48} color={Colors.mutedDim} />
              <Text style={s.emptyTitle}>No documents found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const docName = item.document_name ?? item.name ?? item.title ?? "Document"
            const clientName = item.client_name ?? item.signer_name ?? ""
            const status = item.status ?? "pending"
            const sc = STATUS_COLORS[status] ?? STATUS_COLORS.pending
            const sentDate = item.sent_at ?? item.created_at ?? ""
            const signedDate = item.signed_at ?? item.completed_at ?? ""
            const expiresDate = item.expires_at ?? item.expiry_date ?? ""
            const docType = item.document_type ?? item.type ?? "document"
            const docIcon = DOC_TYPE_ICONS[docType] ?? "document-text-outline"
            const isPending = (status ?? "").toLowerCase().includes("pending")

            return (
              <View style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.docIcon}>
                    <Ionicons name={docIcon as any} size={20} color={Colors.blue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.docName}>{docName}</Text>
                    {!!clientName && <Text style={s.clientName}>{clientName}</Text>}
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                    <Ionicons name={sc.icon as any} size={10} color={sc.text} />
                    <Text style={[s.statusText, { color: sc.text }]}>{status.replace(/_/g, " ")}</Text>
                  </View>
                </View>

                <View style={s.metaRow}>
                  {!!sentDate && (
                    <View style={s.metaItem}>
                      <Ionicons name="send-outline" size={11} color={Colors.mutedDim} />
                      <Text style={s.metaText}>Sent {fmtDate(sentDate)}</Text>
                    </View>
                  )}
                  {!!signedDate && (
                    <View style={s.metaItem}>
                      <Ionicons name="checkmark-outline" size={11} color={Colors.green} />
                      <Text style={[s.metaText, { color: Colors.green }]}>Signed {fmtDate(signedDate)}</Text>
                    </View>
                  )}
                  {!!expiresDate && !signedDate && (
                    <View style={s.metaItem}>
                      <Ionicons name="time-outline" size={11} color={Colors.mutedDim} />
                      <Text style={s.metaText}>Expires {fmtDate(expiresDate)}</Text>
                    </View>
                  )}
                </View>

                <View style={s.cardFooter}>
                  <TouchableOpacity style={s.footerAction}>
                    <Ionicons name="eye-outline" size={14} color={Colors.blueBright} />
                    <Text style={s.footerActionText}>View</Text>
                  </TouchableOpacity>
                  {isPending && (
                    <TouchableOpacity style={s.footerAction}>
                      <Ionicons name="mail-outline" size={14} color={Colors.gold} />
                      <Text style={[s.footerActionText, { color: Colors.gold }]}>Resend</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={s.footerAction}>
                    <Ionicons name="download-outline" size={14} color={Colors.mutedDim} />
                    <Text style={[s.footerActionText, { color: Colors.mutedDim }]}>Download</Text>
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
  subtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: Radius.sm, backgroundColor: Colors.blue },
  addBtnText: { fontSize: FontSize.xs, color: "#fff", fontFamily: Font.bold },
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold },
  kpiLabel: { fontSize: 9, color: Colors.mutedDim, marginTop: 2, textAlign: "center" },
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
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md, marginBottom: Spacing.md },
  docIcon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.blue + "14", alignItems: "center", justifyContent: "center" },
  docName: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  clientName: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  statusText: { fontSize: 10, fontFamily: Font.bold, textTransform: "capitalize" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: Spacing.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.muted },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 4, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderFaint },
  footerAction: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5, paddingHorizontal: 8 },
  footerActionText: { fontSize: FontSize.xs, color: Colors.blueBright, fontFamily: Font.semibold },
})
