import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from "react-native"
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

  useEffect(() => {
    if (!identity) return
    api.messages(identity).then((res: any) => {
      const raw = res?.results ?? res?.data ?? res
      setMessages(Array.isArray(raw) ? raw : [])
      setFiltered(Array.isArray(raw) ? raw : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [identity])

  const handleSearch = (text: string) => {
    setQuery(text)
    if (!text.trim()) { setFiltered(messages); return }
    const q = text.toLowerCase()
    setFiltered(messages.filter((m) =>
      (m.recipient_name ?? m.client_name ?? m.name ?? "").toLowerCase().includes(q) ||
      (m.body ?? m.message ?? m.content ?? "").toLowerCase().includes(q)
    ))
  }

  const unread = messages.filter((m) => m.read === false || m.status === "unread").length

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.blue + "18", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chatbubbles-outline" size={17} color={Colors.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Messages</Text>
          {unread > 0 && <Text style={s.subtitle}>{unread} unread message{unread > 1 ? "s" : ""}</Text>}
        </View>
        <TouchableOpacity style={s.composeBtn}>
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={s.composeBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
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
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginHorizontal: Spacing.xl, marginVertical: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  subtitle: { fontSize: FontSize.xs, color: Colors.blue, marginTop: 2 },
  composeBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: Radius.sm, backgroundColor: Colors.blue },
  composeBtnText: { fontSize: FontSize.xs, color: "#fff", fontFamily: Font.bold },
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
})
