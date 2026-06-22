import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { MoreStackParamList } from "../types"
import { Colors, FontSize, Radius, Spacing } from "../constants/theme"

type Nav = NativeStackNavigationProp<MoreStackParamList>

const MENU_SECTIONS = [
  {
    title: "Tools",
    items: [
      { icon: "send-outline" as const, label: "BondApp", sub: "Digital Applications", color: Colors.blueBright, screen: "BondApp" as const },
      { icon: "card-outline" as const, label: "Payments", sub: "Client Ledger", color: Colors.green, screen: "Payments" as const },
      { icon: "calendar-outline" as const, label: "Calendar", sub: "Court Dates", color: Colors.gold, screen: "Calendar" as const },
      { icon: "pen-outline" as const, label: "E-Sign", sub: "Digital Signatures", color: Colors.blueBright, screen: "ESign" as const },
      { icon: "bar-chart-outline" as const, label: "Reports", sub: "Analytics", color: Colors.blue, screen: "Reports" as const },
    ],
  },
  {
    title: "Monitoring",
    items: [
      { icon: "radio-outline" as const, label: "BondTrack GPS", sub: "GPS Monitoring", color: Colors.red, screen: "BondTrack" as const },
      { icon: "eye-outline" as const, label: "BondWatch", sub: "Re-Arrest Monitoring", color: Colors.gold, screen: "BondWatch" as const },
      { icon: "alert-circle-outline" as const, label: "ArrestAlert", sub: "Live Bookings", color: Colors.red, screen: "ArrestAlert" as const },
      { icon: "map-outline" as const, label: "County Coverage", sub: "Assigned Counties", color: Colors.blue, screen: "CountyCoverage" as const },
    ],
  },
  {
    title: "Team & Settings",
    items: [
      { icon: "people-outline" as const, label: "BondTeam", sub: "Agents & Team", color: Colors.blue, screen: "BondTeam" as const },
      { icon: "chatbubble-outline" as const, label: "Messages", sub: "Client Communication", color: Colors.blueBright, screen: "Messages" as const },
      { icon: "document-outline" as const, label: "Powers", sub: "Surety Bond Powers", color: Colors.muted, screen: "Powers" as const },
      { icon: "receipt-outline" as const, label: "Billing", sub: "Subscription & Add-Ons", color: Colors.mutedDim, screen: "Billing" as const },
    ],
  },
]

export function MoreScreen() {
  const nav = useNavigation<Nav>()

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>More</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={s.section}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <View style={s.card}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[s.row, i < section.items.length - 1 && s.rowBorder]}
                  onPress={() => nav.navigate(item.screen)}
                >
                  <View style={[s.iconWrap, { backgroundColor: item.color + "18" }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={s.rowInfo}>
                    <Text style={s.rowLabel}>{item.label}</Text>
                    <Text style={s.rowSub}>{item.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.mutedDim} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  title: { fontSize: FontSize.xl, color: Colors.text, fontWeight: "800" },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.xs, color: Colors.mutedDim, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", padding: Spacing.lg, gap: Spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(70,120,190,0.1)" },
  iconWrap: { width: 40, height: 40, borderRadius: Radius.md, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: FontSize.md, color: Colors.text, fontWeight: "600" },
  rowSub: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
})
