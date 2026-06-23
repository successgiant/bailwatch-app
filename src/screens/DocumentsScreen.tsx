import React, { useEffect, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useAuth } from "../context/AuthContext"
import { apiGet } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

type NavProp = NativeStackNavigationProp<any>

// ─── Types ────────────────────────────────────────────────────────────────────

type Doc = {
  id: string
  name: string
  client_name: string
  doc_type: string
  file_url: string
  created_at: string
  size: number | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DOC_TYPES = ["All", "Bond Contract", "ID Document", "Court Order", "Receipt", "Indemnity Agreement", "Other"]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapDoc(raw: any): Doc {
  return {
    id: String(raw.id ?? Math.random()),
    name: raw.name ?? raw.document_name ?? raw.file_name ?? "Document",
    client_name: raw.client_name ?? raw.defendant_name ?? "",
    doc_type: raw.document_type ?? raw.doc_type ?? raw.type ?? "Other",
    file_url: raw.file_url ?? raw.url ?? raw.download_url ?? "",
    created_at: raw.created_at ?? raw.uploaded_at ?? "",
    size: raw.file_size ?? raw.size ?? null,
  }
}

function fmtDate(d: string): string {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch { return d }
}

function fmtBytes(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getDocTypeColor(type: string): { bg: string; text: string } {
  switch (type) {
    case "Bond Contract":      return { bg: Colors.blue + "20",   text: Colors.blueLight }
    case "ID Document":        return { bg: Colors.green + "20",  text: Colors.green }
    case "Court Order":        return { bg: Colors.gold + "20",   text: Colors.gold }
    case "Receipt":            return { bg: Colors.emerald + "20", text: Colors.emerald }
    case "Indemnity Agreement":return { bg: Colors.purple + "20", text: Colors.purple }
    default:                   return { bg: Colors.mutedDim + "18", text: Colors.mutedDim }
  }
}

function thisMonth(docs: Doc[]): number {
  const now = new Date()
  return docs.filter(d => {
    if (!d.created_at) return false
    try {
      const dt = new Date(d.created_at)
      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
    } catch { return false }
  }).length
}

function mostCommonType(docs: Doc[]): string {
  if (!docs.length) return "—"
  const counts: Record<string, number> = {}
  docs.forEach(d => { counts[d.doc_type] = (counts[d.doc_type] ?? 0) + 1 })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"
}

// ─── Document Card ────────────────────────────────────────────────────────────

function DocCard({ doc }: { doc: Doc }) {
  const tc = getDocTypeColor(doc.doc_type)
  const size = fmtBytes(doc.size)
  const url = doc.file_url

  const openUrl = () => {
    if (!url) { Alert.alert("No file", "This document has no file attached."); return }
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open document."))
  }

  return (
    <View style={s.docCard}>
      <View style={s.docIconWrap}>
        <Ionicons name="document-text-outline" size={20} color={Colors.blueLight} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.docName} numberOfLines={1}>{doc.name}</Text>
        {!!doc.client_name && <Text style={s.docClient}>{doc.client_name}</Text>}
        <View style={s.docMeta}>
          <View style={[s.chip, { backgroundColor: tc.bg }]}>
            <Text style={[s.chipText, { color: tc.text }]}>{doc.doc_type}</Text>
          </View>
          {!!size && <Text style={s.docSize}>{size}</Text>}
          {!!doc.created_at && <Text style={s.docDate}>{fmtDate(doc.created_at)}</Text>}
        </View>
      </View>
      {!!url && (
        <View style={s.docActions}>
          <TouchableOpacity style={s.iconBtn} onPress={openUrl} activeOpacity={0.7}>
            <Ionicons name="eye-outline" size={16} color={Colors.blueLight} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={openUrl} activeOpacity={0.7}>
            <Ionicons name="download-outline" size={16} color={Colors.blueLight} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function DocumentsScreen() {
  const navigation = useNavigation<NavProp>()
  const { identity } = useAuth()

  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("All")

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const res: any = await apiGet("documents/", identity, { page_size: "50" })
      const raw = res?.data?.results ?? res?.results ?? res?.data ?? res ?? []
      setDocs(Array.isArray(raw) ? raw.map(mapDoc) : [])
    } catch {
      setDocs([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const filtered = docs.filter(doc => {
    const matchesType = typeFilter === "All" || doc.doc_type === typeFilter
    const matchesSearch = !search.trim() ||
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      (doc.client_name ?? "").toLowerCase().includes(search.toLowerCase())
    return matchesType && matchesSearch
  })

  const kpis = [
    { label: "Total",      value: String(docs.length),        color: Colors.text },
    { label: "This Month", value: String(thisMonth(docs)),    color: Colors.blueLight },
    { label: "Top Type",   value: mostCommonType(docs),       color: Colors.gold },
  ]

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={s.headerIconWrap}>
          <Ionicons name="documents-outline" size={17} color={Colors.blueBright} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Documents & Files</Text>
          <Text style={s.headerSubtitle}>{docs.length} total documents</Text>
        </View>
        <TouchableOpacity
          style={s.uploadBtn}
          onPress={() =>
            Alert.alert(
              "Upload Documents",
              "Documents can be uploaded from the web dashboard. Tap OK to open.",
              [{ text: "Cancel", style: "cancel" }, { text: "OK" }]
            )
          }
          activeOpacity={0.75}
        >
          <Ionicons name="cloud-upload-outline" size={14} color={Colors.blueLight} />
          <Text style={s.uploadBtnText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {/* KPI row */}
      <View style={s.kpiRow}>
        {kpis.map(k => (
          <View key={k.label} style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: k.color }]} numberOfLines={1}>{k.value}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* Search bar */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or client..."
          placeholderTextColor={Colors.mutedDim}
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color={Colors.mutedDim} />
          </TouchableOpacity>
        )}
      </View>

      {/* Type filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={s.filterRow}
      >
        {DOC_TYPES.map(t => (
          <TouchableOpacity
            key={t}
            style={[s.filterChip, typeFilter === t && s.filterChipActive]}
            onPress={() => setTypeFilter(t)}
            activeOpacity={0.7}
          >
            <Text style={[s.filterChipText, typeFilter === t && s.filterChipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 32, gap: 10 }}
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
              <Ionicons name="documents-outline" size={48} color={Colors.mutedDim} />
              <Text style={s.emptyTitle}>No documents found</Text>
              <Text style={s.emptyText}>
                {search || typeFilter !== "All"
                  ? "Try adjusting your search or filter."
                  : "Upload documents from the web dashboard."}
              </Text>
            </View>
          }
          renderItem={({ item }) => <DocCard doc={item} />}
        />
      )}
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginHorizontal: Spacing.lg, marginVertical: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.bgPanel, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  headerIconWrap: { width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.blueIconBg, borderWidth: 1, borderColor: Colors.blueIconBorder, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 2 },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.blueSubtle, borderWidth: 1, borderColor: Colors.blueBorder },
  uploadBtnText: { fontSize: FontSize.xs, color: Colors.blueLight, fontFamily: Font.bold },

  // KPI
  kpiRow: { flexDirection: "row", gap: 8, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  kpiCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: "center" },
  kpiValue: { fontSize: FontSize.xl, fontFamily: Font.extrabold },
  kpiLabel: { fontSize: 9, color: Colors.muted, fontFamily: Font.semibold, marginTop: 3, textAlign: "center" },

  // Search
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, height: 44 },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm },

  // Filter chips
  filterScroll: { marginBottom: Spacing.md, height: 38 },
  filterRow: { paddingHorizontal: Spacing.lg, gap: 8, alignItems: "center" },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.xl, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  filterChipText: { fontSize: FontSize.xs, color: Colors.muted, fontFamily: Font.semibold },
  filterChipTextActive: { color: "#fff" },

  // Doc card
  docCard: { flexDirection: "row", alignItems: "center", gap: Spacing.md, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  docIconWrap: { width: 42, height: 42, borderRadius: Radius.md, backgroundColor: Colors.blueIconBg, borderWidth: 1, borderColor: Colors.blueIconBorder, alignItems: "center", justifyContent: "center" },
  docName: { fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.bold },
  docClient: { fontSize: FontSize.xs, color: Colors.muted },
  docMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 2 },
  docSize: { fontSize: FontSize.xs, color: Colors.mutedDim },
  docDate: { fontSize: FontSize.xs, color: Colors.mutedDim },
  docActions: { flexDirection: "row", gap: 6 },
  iconBtn: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.blueSubtle, borderWidth: 1, borderColor: Colors.blueBorder, alignItems: "center", justifyContent: "center" },

  // Chip
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  chipText: { fontSize: 10, fontFamily: Font.bold },

  // Misc
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.bold },
  emptyText: { fontSize: FontSize.sm, color: Colors.mutedDim, textAlign: "center" },
})
