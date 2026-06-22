import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Colors, FontSize, Radius, Spacing } from "../constants/theme"

const TEAM = [
  { id: "1", name: "John Smith", role: "Owner", email: "john@bailwatchpro.com", phone: "(214) 555-0101", status: "Active", bonds: 18, revenue: "$42,000" },
  { id: "2", name: "Maria Garcia", role: "Senior Agent", email: "maria@bailwatchpro.com", phone: "(214) 555-0102", status: "Active", bonds: 12, revenue: "$31,200" },
  { id: "3", name: "David Lee", role: "Agent", email: "david@bailwatchpro.com", phone: "(214) 555-0103", status: "Active", bonds: 6, revenue: "$20,800" },
  { id: "4", name: "Ashley Brown", role: "Agent", email: "ashley@bailwatchpro.com", phone: "(214) 555-0104", status: "Inactive", bonds: 0, revenue: "$0" },
]

const ROLE_COLORS: Record<string, string> = {
  Owner: Colors.gold,
  Manager: Colors.blue,
  "Senior Agent": Colors.blueBright,
  Agent: Colors.muted,
}

export function BondTeamScreen() {
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>BondTeam</Text>
          <Text style={s.subtitle}>Agents & Team</Text>
        </View>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="person-add-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label: "Total Agents", value: "4", color: Colors.text },
          { label: "Active", value: "3", color: Colors.green },
          { label: "Inactive", value: "1", color: Colors.mutedDim },
        ].map((k) => (
          <View key={k.label} style={s.statCard}>
            <Text style={[s.statValue, { color: k.color }]}>{k.value}</Text>
            <Text style={s.statLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* Performance table */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Performance</Text>
        <View style={s.card}>
          <View style={s.tableHeader}>
            <Text style={[s.th, { flex: 2 }]}>Agent</Text>
            <Text style={s.th}>Bonds</Text>
            <Text style={s.th}>Revenue</Text>
          </View>
          {TEAM.filter(a => a.status === "Active").map((a, i) => (
            <View key={a.id} style={[s.tableRow, i < 2 && s.rowBorder]}>
              <View style={[{ flex: 2, flexDirection: "row", alignItems: "center", gap: 8 }]}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{a.name[0]}</Text>
                </View>
                <Text style={[s.td, { color: Colors.text }]}>{a.name}</Text>
              </View>
              <Text style={[s.td, { color: Colors.blueBright }]}>{a.bonds}</Text>
              <Text style={[s.td, { color: Colors.green }]}>{a.revenue}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Roster */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Agent Roster</Text>
        <View style={s.card}>
          {TEAM.map((agent, i) => (
            <View key={agent.id} style={[s.agentRow, i < TEAM.length - 1 && s.rowBorder]}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{agent.name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.agentNameRow}>
                  <Text style={s.agentName}>{agent.name}</Text>
                  <View style={[s.roleBadge, { backgroundColor: (ROLE_COLORS[agent.role] ?? Colors.muted) + "22" }]}>
                    <Text style={[s.roleText, { color: ROLE_COLORS[agent.role] ?? Colors.muted }]}>{agent.role}</Text>
                  </View>
                </View>
                <Text style={s.agentEmail}>{agent.email}</Text>
                <Text style={s.agentPhone}>{agent.phone}</Text>
              </View>
              <View style={s.agentActions}>
                <View style={[s.statusDot, { backgroundColor: agent.status === "Active" ? Colors.green : Colors.mutedDim }]} />
                <TouchableOpacity style={s.iconBtn}>
                  <Ionicons name="create-outline" size={18} color={Colors.mutedDim} />
                </TouchableOpacity>
                <TouchableOpacity style={s.iconBtn}>
                  <Ionicons name="trash-outline" size={18} color={Colors.red} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>

    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  title: { fontSize: FontSize.xl, color: Colors.text, fontWeight: "800" },
  subtitle: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  addBtn: { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Colors.blue, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  statCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.md, alignItems: "center" },
  statValue: { fontSize: FontSize.xl, fontWeight: "800" },
  statLabel: { fontSize: 10, color: Colors.mutedDim, marginTop: 2 },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700", marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", overflow: "hidden" },
  tableHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: "rgba(70,120,190,0.15)" },
  th: { flex: 1, fontSize: 10, color: Colors.mutedDim, fontWeight: "700", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(70,120,190,0.08)" },
  td: { flex: 1, fontSize: FontSize.xs, color: Colors.muted, fontWeight: "500" },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(47,147,255,0.15)", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: FontSize.sm, color: Colors.blueBright, fontWeight: "700" },
  agentRow: { flexDirection: "row", alignItems: "center", padding: Spacing.lg, gap: Spacing.md },
  agentNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  agentName: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700" },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  roleText: { fontSize: 9, fontWeight: "700" },
  agentEmail: { fontSize: FontSize.xs, color: Colors.mutedDim },
  agentPhone: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  agentActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  iconBtn: { padding: 4 },
})
