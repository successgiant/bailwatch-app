import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

function timeAgo(d: string): string {
  if (!d) return ""
  try {
    const diff = Date.now() - new Date(d).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return "just now"
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    const days = Math.floor(h / 24)
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days}d`
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  } catch { return "" }
}

const AVATAR_COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626"]
function avatarColor(s: string): string {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function MessagesScreen() {
  const { identity } = useAuth()
  const [messages, setMessages] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [composeForm, setComposeForm] = useState({ recipient: "", message: "", channel: "sms" })
  const [sending, setSending] = useState(false)

  const load = async (quiet = false) => {
    if (!identity) return
    if (!quiet) setLoading(true)
    try {
      const res: any = await api.messages(identity)
      const raw = res?.results ?? res?.data ?? res
      const arr = Array.isArray(raw) ? raw : []
      setMessages(arr)
      applySearch(query, arr)
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [identity])

  const applySearch = (text: string, source = messages) => {
    if (!text.trim()) { setFiltered(source); return }
    const q = text.toLowerCase()
    setFiltered(source.filter((m) =>
      (m.recipient_name ?? m.client_name ?? m.name ?? "").toLowerCase().includes(q) ||
      (m.body ?? m.message ?? m.content ?? "").toLowerCase().includes(q)
    ))
  }

  const handleSearch = (text: string) => {
    setQuery(text)
    applySearch(text)
  }

  const handleSend = async () => {
    if (!identity) return
    if (!composeForm.recipient.trim() || !composeForm.message.trim()) {
      Alert.alert("Required", "Please enter a recipient and message."); return
    }
    setSending(true)
    try {
      await api.sendMessage(identity, composeForm)
      setShowCompose(false)
      setComposeForm({ recipient: "", message: "", channel: "sms" })
      Alert.alert("Sent", "Your message has been sent.")
      load()
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not send message")
    } finally { setSending(false) }
  }

  const unread = messages.filter((m) => m.read === false || m.status === "unread").length

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.blueIconBg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.blueIconBorder }}>
          <Ionicons name="chatbubbles-outline" size={17} color={Colors.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Messages</Text>
          {unread > 0 && <Text style={s.subtitle}>{unread} unread message{unread > 1 ? "s" : ""}</Text>}
        </View>
        <TouchableOpacity style={s.composeBtn} onPress={() => setShowCompose(true)}>
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={s.composeBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
        <TextInput
          style={s.searchInput}
          placeholder="Search messages..."
          placeholderTextColor={Colors.mutedDim}
          value={query}
          onChangeText={handleSearch}
        />
        {!!query && (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <Ionicons name="close-circle" size={16} color={Colors.mutedDim} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id ?? Math.random())}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={Colors.blue} />}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.mutedDim} />
              <Text style={s.emptyTitle}>No messages</Text>
              <Text style={s.emptyText}>Send a message to get started.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const name = item.recipient_name ?? item.client_name ?? item.name ?? "Unknown"
            const body = item.body ?? item.message ?? item.content ?? ""
            const time = timeAgo(item.sent_at ?? item.created_at ?? item.timestamp ?? "")
            const isUnread = item.read === false || item.status === "unread"
            const acColor = avatarColor(name)
            const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"
            const channel = item.channel ?? item.type ?? "sms"
            const channelIcon = channel === "email" ? "mail-outline" : "phone-portrait-outline"

            return (
              <TouchableOpacity style={[s.row, isUnread && s.rowUnread]} activeOpacity={0.7}>
                <View style={[s.avatar, { backgroundColor: acColor + "22" }]}>
                  <Text style={[s.avatarText, { color: acColor }]}>{initials}</Text>
                  {isUnread && <View style={s.unreadDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.rowTop}>
                    <Text style={[s.msgName, isUnread && s.msgNameUnread]}>{name}</Text>
                    <Text style={s.msgTime}>{time}</Text>
                  </View>
                  <View style={s.rowBottom}>
                    <Ionicons name={channelIcon as any} size={11} color={Colors.mutedDim} />
                    <Text style={[s.msgPreview, isUnread && s.msgPreviewUnread]} numberOfLines={1}>{body || "No content"}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.mutedDim} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )
          }}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}

      <Modal visible={showCompose} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
            <View style={s.modalCard}>
                <View style={{ width: 40, height: 4, backgroundColor: Colors.dragHandle, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>New Message</Text>
                <TouchableOpacity onPress={() => setShowCompose(false)}>
                  <Ionicons name="close" size={22} color={Colors.muted} />
                </TouchableOpacity>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Recipient *</Text>
                <TextInput style={s.fieldInput} value={composeForm.recipient} onChangeText={(v) => setComposeForm((f) => ({ ...f, recipient: v }))} placeholder="Phone number or email" placeholderTextColor={Colors.mutedDim} autoCapitalize="none" />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Channel</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {["sms", "email"].map((c) => (
                    <TouchableOpacity key={c} style={[s.typeChip, composeForm.channel === c && s.typeChipActive]} onPress={() => setComposeForm((f) => ({ ...f, channel: c }))}>
                      <Text style={[s.typeChipText, composeForm.channel === c && { color: "#fff" }]}>{c.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Message *</Text>
                <TextInput style={[s.fieldInput, { height: 100, textAlignVertical: "top" }]} value={composeForm.message} onChangeText={(v) => setComposeForm((f) => ({ ...f, message: v }))} placeholder="Type your message..." placeholderTextColor={Colors.mutedDim} multiline />
              </View>
              <TouchableOpacity style={[s.submitBtn, sending && { opacity: 0.6 }]} onPress={handleSend} disabled={sending}>
                {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.submitBtnText}>Send Message</Text>}
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
  subtitle: { fontSize: FontSize.xs, color: Colors.blue, marginTop: 2 },
  composeBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.blueSubtle, borderWidth: 1, borderColor: Colors.blueBorder },
  composeBtnText: { fontSize: FontSize.xs, color: Colors.blueLight, fontFamily: Font.bold },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: Spacing.xl, marginBottom: Spacing.md, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, height: 44 },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.bold },
  emptyText: { fontSize: FontSize.sm, color: Colors.mutedDim },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.xl, paddingVertical: 14, gap: Spacing.md },
  rowUnread: { backgroundColor: Colors.blue + "08" },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: FontSize.md, fontFamily: Font.extrabold },
  unreadDot: { position: "absolute", top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.blue, borderWidth: 2, borderColor: Colors.bg },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  msgName: { fontSize: FontSize.sm, color: Colors.muted, fontFamily: Font.medium },
  msgNameUnread: { color: Colors.text, fontFamily: Font.bold },
  msgTime: { fontSize: FontSize.xs, color: Colors.mutedDim },
  rowBottom: { flexDirection: "row", alignItems: "center", gap: 4 },
  msgPreview: { flex: 1, fontSize: FontSize.xs, color: Colors.mutedDim },
  msgPreviewUnread: { color: Colors.muted },
  separator: { height: 1, backgroundColor: Colors.borderFaint, marginLeft: 80 },
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
  submitBtnText: { color: "#fff", fontSize: FontSize.md, fontFamily: Font.bold },
})
