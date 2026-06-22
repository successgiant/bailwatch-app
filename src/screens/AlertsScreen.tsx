import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Colors, FontSize, Radius, Spacing } from "../constants/theme"

const ALERTS = [
  { id: "1", type: "rearrest", client: "James Rivera", detail: "Re-arrested at Dallas County Jail", time: "2 hours ago", read: false },
  { id: "2", type: "court", client: "Marcus Thompson", detail: "Court date tomorrow — Dallas County, 9:00 AM", time: "4 hours ago", read: false },
  { id: "3", type: "payment", client: "Angela Foster", detail: "Payment overdue — $400 balance remaining", time: "Yesterday", read: true },
  { id: "4", type: "checkin", client: "Sara Mitchell", detail: "Missed check-in — no response in 24h", time: "Yesterday", read: true },
  { id: "5", type: "court", client: "David Kim", detail: "Court date in 3 days — Harris County", time: "2 days ago", read: true },
  { id: "6", type: "rearrest", client: "Robert Hayes", detail: "Re-arrested at Travis County Jail", time: "3 days ago", read: true },
]

const ALERT_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  rearrest: { icon: "warning-outline", color: Colors.red, label: "Re-Arrest" },
  court: { icon: "calendar-outline", color: Colors.gold, label: "Court Date" },
  payment: { icon: "card-outline", color: Colors.blue, label: "Payment" },
  checkin: { icon: "radio-outline", color: Colors.gold, label: "Check-In" },
}

export function AlertsScreen() {
  const unread = ALERTS.filter(a => !a.read).length

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Alerts</Text>
          {unread > 0 && (
            <Text style={s.subtitle}>{unread} unread</Text>
          )}
        </View>
        <TouchableOpacity style={s.clearBtn}>
          <Text style={s.clearText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={ALERTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const cfg = ALERT_CONFIG[item.type]
          return (
            <TouchableOpacity style={[s.alertCard, !item.read && s.alertCardUnread]}>
              {!item.read && <View style={[s.unreadDot, { backgroundColor: cfg.color }]} />}
              <View style={[s.iconWrap, { backgroundColor: cfg.color + "18" }]}>
                <Ionicons name={cfg.icon} size={20} color={cfg.color} />
              </View>
              <View style={s.alertInfo}>
                <View style={s.alertTop}>
                  <View style={[s.typeBadge, { backgroundColor: cfg.color + "18" }]}>
                    <Text style={[s.typeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  <Text style={s.timeText}>{item.time}</Text>
                </View>
                <Text style={s.clientText}>{item.client}</Text>
                <Text style={s.detailText}>{item.detail}</Text>
              </View>
            </TouchableOpacity>
          )
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  title: { fontSize: FontSize.xl, color: Colors.text, fontWeight: "800" },
  subtitle: { fontSize: FontSize.xs, color: Colors.red, fontWeight: "600", marginTop: 2 },
  clearBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "rgba(70,120,190,0.25)",
  },
  clearText: { fontSize: FontSize.xs, color: Colors.muted, fontWeight: "600" },
  alertCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(70,120,190,0.15)",
    padding: Spacing.lg,
    flexDirection: "row",
    gap: Spacing.md,
  },
  alertCardUnread: {
    borderColor: "rgba(70,120,190,0.3)",
    backgroundColor: "rgba(10,18,32,0.9)",
  },
  unreadDot: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  alertInfo: { flex: 1 },
  alertTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
  typeText: { fontSize: FontSize.xs, fontWeight: "700" },
  timeText: { fontSize: FontSize.xs, color: Colors.mutedDim },
  clientText: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700", marginBottom: 3 },
  detailText: { fontSize: FontSize.sm, color: Colors.muted, lineHeight: 19 },
})
