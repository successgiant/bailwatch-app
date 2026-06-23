import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useAuth } from "../context/AuthContext"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

type NavProp = NativeStackNavigationProp<any>

const MENU_SECTIONS = [
  {
    title: "Operations",
    items: [
      { icon: "shield-outline" as const, label: "BondWatch", screen: "BondWatch", color: Colors.blue },
      { icon: "location-outline" as const, label: "BondTrack GPS", screen: "BondTrack", color: Colors.green },
      { icon: "document-text-outline" as const, label: "Bond Applications", screen: "BondApp", color: Colors.purple },
      { icon: "create-outline" as const, label: "eSign Documents", screen: "ESign", color: Colors.gold },
      { icon: "briefcase-outline" as const, label: "Powers of Attorney", screen: "Powers", color: Colors.blueBright },
      { icon: "document-outline" as const, label: "Documents & Files", screen: "Documents", color: Colors.blueLight },
      { icon: "chatbubbles-outline" as const, label: "Communications", screen: "Messages", color: Colors.emerald },
    ],
  },
  {
    title: "Analytics",
    items: [
      { icon: "bar-chart-outline" as const, label: "Reports", screen: "Reports", color: Colors.emerald },
      { icon: "map-outline" as const, label: "County Coverage", screen: "CountyCoverage", color: Colors.blue },
    ],
  },
  {
    title: "Team & Account",
    items: [
      { icon: "people-outline" as const, label: "BondTeam", screen: "BondTeam", color: Colors.purple },
      { icon: "card-outline" as const, label: "Billing", screen: "Billing", color: Colors.green },
    ],
  },
]

export function MoreScreen() {
  const navigation = useNavigation<NavProp>()
  const { user, identity, logout } = useAuth()
  const displayName = user?.name ?? user?.full_name ?? user?.first_name ?? user?.username ?? identity?.split("@")[0] ?? "Agent"
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Logo Header */}
        <View style={s.logoWrap}>
          <Image source={require("../../assets/bailwatchpro-logo.png")} style={s.logo} resizeMode="contain" />
        </View>

        {/* Profile Card */}
        <View style={s.profileCard}>
          <View style={s.profileAvatar}>
            <Text style={s.profileInitials}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>{displayName}</Text>
            <Text style={s.profileEmail} numberOfLines={1}>{identity ?? ""}</Text>
          </View>
          <View style={s.rolePill}>
            <Ionicons name="shield-checkmark-outline" size={10} color={Colors.blueBright} />
            <Text style={s.roleText}>{user?.role ?? "Bail Agent"}</Text>
          </View>
        </View>

        {/* Menu */}
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={s.section}>
            <Text style={s.sectionLabel}>{section.title.toUpperCase()}</Text>
            <View style={s.sectionCard}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[s.row, i < section.items.length - 1 && s.rowBorder]}
                  onPress={() => navigation.navigate(item.screen)}
                  activeOpacity={0.65}
                >
                  <View style={[s.rowIcon, { backgroundColor: item.color + "18" }]}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <Text style={s.rowLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={15} color={Colors.mutedDim} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={16} color={Colors.red} />
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={s.version}>BailWatch Pro v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  logoWrap: { alignItems: "center", paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  logo: { width: 160, height: 44 },
  profileCard: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    marginHorizontal: Spacing.xl, marginBottom: Spacing.xl,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg,
  },
  profileAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.blue + "22", alignItems: "center", justifyContent: "center",
  },
  profileInitials: { fontSize: FontSize.lg, color: Colors.blueBright, fontFamily: Font.extrabold },
  profileName: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  profileEmail: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 2 },
  rolePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.blue + "14", borderRadius: Radius.xl,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.blue + "25",
  },
  roleText: { fontSize: 10, color: Colors.blueBright, fontFamily: Font.bold },
  section: { marginHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  sectionLabel: {
    fontSize: 10, color: Colors.mutedDim, fontFamily: Font.bold,
    letterSpacing: 1, marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderFaint },
  rowIcon: {
    width: 36, height: 36, borderRadius: Radius.sm,
    alignItems: "center", justifyContent: "center",
  },
  rowLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.semibold },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginHorizontal: Spacing.xl, marginBottom: Spacing.md,
    paddingVertical: 14, borderRadius: Radius.lg,
    backgroundColor: Colors.red + "10", borderWidth: 1, borderColor: Colors.red + "25",
  },
  logoutText: { fontSize: FontSize.sm, color: Colors.red, fontFamily: Font.bold },
  version: { textAlign: "center", fontSize: 10, color: Colors.mutedDim, opacity: 0.5 },
})
