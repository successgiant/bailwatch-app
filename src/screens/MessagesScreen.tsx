import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import { Colors, FontSize, Radius, Spacing } from "../constants/theme"

const CONVERSATIONS = [
  { id: "1", name: "Marcus Thompson", preview: "Got it, I'll be there.", time: "2m ago", unread: 2 },
  { id: "2", name: "James Rivera", preview: "Please call me ASAP.", time: "1h ago", unread: 1 },
  { id: "3", name: "Sara Mitchell", preview: "Thank you for the reminder.", time: "3h ago", unread: 0 },
  { id: "4", name: "David Kim", preview: "When is my next payment due?", time: "Yesterday", unread: 0 },
  { id: "5", name: "Angela Foster", preview: "I missed the court date.", time: "2 days ago", unread: 0 },
]

const MESSAGES: Record<string, { id: string; text: string; from: "me" | "them"; time: string }[]> = {
  "1": [
    { id: "1", text: "Hi Marcus, just a reminder your court date is Jun 24 at 9:00 AM — Dallas County.", from: "me", time: "Jun 22 10:00 AM" },
    { id: "2", text: "Got it, I'll be there.", from: "them", time: "Jun 22 10:02 AM" },
    { id: "3", text: "Perfect. Let me know if you need directions.", from: "me", time: "Jun 22 10:03 AM" },
  ],
  "2": [
    { id: "1", text: "James, you have an overdue payment of $800. Please contact us.", from: "me", time: "Jun 22 8:00 AM" },
    { id: "2", text: "Please call me ASAP.", from: "them", time: "Jun 22 9:10 AM" },
  ],
}

export function MessagesScreen() {
  const [selected, setSelected] = useState<string | null>(null)
  const [input, setInput] = useState("")

  const convo = selected ? CONVERSATIONS.find(c => c.id === selected) : null
  const msgs = selected ? (MESSAGES[selected] ?? []) : []

  if (selected && convo) {
    return (
      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {/* Thread Header */}
          <View style={s.threadHeader}>
            <TouchableOpacity style={s.backBtn} onPress={() => setSelected(null)}>
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </TouchableOpacity>
            <View style={s.threadAvatar}>
              <Text style={s.threadAvatarText}>{convo.name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.threadName}>{convo.name}</Text>
            </View>
            <TouchableOpacity style={s.callBtn}>
              <Ionicons name="call-outline" size={20} color={Colors.blueBright} />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            data={msgs}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ padding: Spacing.xl, gap: 12 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={[s.bubble, item.from === "me" ? s.bubbleMe : s.bubbleThem]}>
                <Text style={[s.bubbleText, item.from === "me" ? s.bubbleTextMe : s.bubbleTextThem]}>{item.text}</Text>
                <Text style={s.bubbleTime}>{item.time}</Text>
              </View>
            )}
          />

          {/* Compose */}
          <View style={s.compose}>
            <TextInput
              style={s.composeInput}
              placeholder="Type a message..."
              placeholderTextColor={Colors.mutedDim}
              value={input}
              onChangeText={setInput}
              multiline
            />
            <TouchableOpacity style={[s.sendBtn, input.length > 0 && s.sendBtnActive]}>
              <Ionicons name="send" size={18} color={input.length > 0 ? "#fff" : Colors.mutedDim} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>Messages</Text>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.mutedDim} />
        <TextInput style={s.searchInput} placeholder="Search conversations..." placeholderTextColor={Colors.mutedDim} />
      </View>

      <FlatList
        data={CONVERSATIONS}
        keyExtractor={(i) => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.convoCard, item.unread > 0 && s.convoCardUnread]} onPress={() => setSelected(item.id)}>
            <View style={s.convoAvatar}>
              <Text style={s.convoAvatarText}>{item.name[0]}</Text>
              {item.unread > 0 && <View style={s.unreadDot}><Text style={s.unreadNum}>{item.unread}</Text></View>}
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.convoTop}>
                <Text style={[s.convoName, item.unread > 0 && s.convoNameBold]}>{item.name}</Text>
                <Text style={s.convoTime}>{item.time}</Text>
              </View>
              <Text style={[s.convoPreview, item.unread > 0 && s.convoPreviewBold]} numberOfLines={1}>{item.preview}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  title: { fontSize: FontSize.xl, color: Colors.text, fontWeight: "800" },
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)", paddingHorizontal: Spacing.md, height: 42, gap: Spacing.sm },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  convoCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.15)", padding: Spacing.lg, gap: Spacing.md },
  convoCardUnread: { borderColor: "rgba(47,147,255,0.35)" },
  convoAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(47,147,255,0.15)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  convoAvatarText: { fontSize: FontSize.lg, color: Colors.blueBright, fontWeight: "700" },
  unreadDot: { position: "absolute", top: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.blue, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: Colors.bg },
  unreadNum: { fontSize: 9, color: "#fff", fontWeight: "800" },
  convoTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  convoName: { fontSize: FontSize.md, color: Colors.muted, fontWeight: "500" },
  convoNameBold: { color: Colors.text, fontWeight: "700" },
  convoTime: { fontSize: 10, color: Colors.mutedDim },
  convoPreview: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 2 },
  convoPreviewBold: { color: Colors.muted, fontWeight: "500" },
  // Thread view
  threadHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: "rgba(70,120,190,0.12)", gap: Spacing.md },
  backBtn: { padding: 4 },
  threadAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(47,147,255,0.15)", alignItems: "center", justifyContent: "center" },
  threadAvatarText: { fontSize: FontSize.md, color: Colors.blueBright, fontWeight: "700" },
  threadName: { fontSize: FontSize.lg, color: Colors.text, fontWeight: "700" },
  callBtn: { padding: 8 },
  bubble: { maxWidth: "78%", borderRadius: Radius.md, padding: Spacing.md },
  bubbleMe: { backgroundColor: Colors.blue, alignSelf: "flex-end", borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: Colors.bgCard, alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)" },
  bubbleText: { fontSize: FontSize.sm, lineHeight: 20 },
  bubbleTextMe: { color: "#fff" },
  bubbleTextThem: { color: Colors.text },
  bubbleTime: { fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 4, alignSelf: "flex-end" },
  compose: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: "rgba(70,120,190,0.12)", gap: Spacing.md },
  composeInput: { flex: 1, minHeight: 44, maxHeight: 100, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)", paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.text, fontSize: FontSize.md },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(47,147,255,0.2)", alignItems: "center", justifyContent: "center" },
  sendBtnActive: { backgroundColor: Colors.blue },
})
