import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Colors, FontSize, Radius, Spacing } from "../constants/theme"

const HISTORY = [
  { invoice: "INV-2026-006", date: "Jun 1, 2026", desc: "BailWatch Pro + ArrestAlert", amount: "$298.00", status: "Paid" },
  { invoice: "INV-2026-005", date: "May 1, 2026", desc: "BailWatch Pro + ArrestAlert", amount: "$298.00", status: "Paid" },
  { invoice: "INV-2026-004", date: "Apr 1, 2026", desc: "BailWatch Pro Platform", amount: "$99.00", status: "Paid" },
]

const PLANS = [
  { name: "BailWatch Pro Platform", price: "$99/mo", badge: "Core", desc: "Full dashboard, clients, bonds, calendar, payments, documents, e-sign, reports.", features: ["Unlimited clients", "BondApp digital applications", "E-Sign documents", "Calendar & court tracking", "Payments & reporting"], highlight: false },
  { name: "ArrestAlert", price: "+$199/mo", badge: "Add-On", desc: "Live booking feed and re-arrest monitoring for your county.", features: ["Live jail booking feed", "Auto re-arrest detection", "BondWatch monitoring", "Email & SMS alerts"], highlight: false },
  { name: "BondTrack GPS", price: "+$199/mo", badge: "Add-On", desc: "Real-time GPS monitoring for clients on bond.", features: ["Real-time GPS tracking", "Geofence alerts", "Check-in compliance", "Location history"], highlight: false },
  { name: "Complete Agency Package", price: "$449/mo", badge: "Best Value", desc: "Everything included — platform + ArrestAlert + BondTrack.", features: ["All Platform features", "ArrestAlert included", "BondTrack GPS included", "Priority support", "Save $48/mo"], highlight: true },
]

export function BillingScreen() {
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>Billing</Text>
        <TouchableOpacity style={s.dlBtn}>
          <Ionicons name="download-outline" size={18} color={Colors.blueBright} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Current Plan */}
        <View style={s.section}>
          <View style={s.planCard}>
            <View style={s.planHeader}>
              <View>
                <Text style={s.planName}>BailWatch Pro + ArrestAlert</Text>
                <Text style={s.planPrice}>$298.00 / month</Text>
              </View>
              <View style={s.activeBadge}><Text style={s.activeBadgeText}>Active</Text></View>
            </View>
            <View style={s.divider} />
            <View style={s.planMeta}>
              <View style={s.planMetaItem}>
                <Text style={s.planMetaLabel}>Next Billing</Text>
                <Text style={s.planMetaVal}>Jul 1, 2026</Text>
              </View>
              <View style={s.planMetaItem}>
                <Text style={s.planMetaLabel}>Payment</Text>
                <Text style={s.planMetaVal}>Visa ···· 4242</Text>
              </View>
              <View style={s.planMetaItem}>
                <Text style={s.planMetaLabel}>Billing Cycle</Text>
                <Text style={s.planMetaVal}>Monthly</Text>
              </View>
            </View>
            <TouchableOpacity style={s.manageBtn}>
              <Text style={s.manageBtnText}>Manage Subscription</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.blueBright} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Billing History */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Billing History</Text>
          <View style={s.card}>
            {HISTORY.map((h, i) => (
              <View key={h.invoice} style={[s.row, i < HISTORY.length - 1 && s.rowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.invoiceNum}>{h.invoice}</Text>
                  <Text style={s.invoiceDesc}>{h.desc}</Text>
                  <Text style={s.invoiceDate}>{h.date}</Text>
                </View>
                <View style={s.rowRight}>
                  <Text style={s.invoiceAmount}>{h.amount}</Text>
                  <View style={s.paidBadge}><Text style={s.paidText}>{h.status}</Text></View>
                  <TouchableOpacity>
                    <Ionicons name="download-outline" size={18} color={Colors.mutedDim} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Available Plans */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Plans & Add-Ons</Text>
          {PLANS.map((plan) => (
            <View key={plan.name} style={[s.planOptionCard, plan.highlight && s.planHighlight]}>
              <View style={s.planOptionHeader}>
                <View style={{ flex: 1 }}>
                  <View style={s.planBadgeRow}>
                    <View style={[s.planBadge, { backgroundColor: plan.highlight ? Colors.gold + "22" : Colors.blue + "18" }]}>
                      <Text style={[s.planBadgeText, { color: plan.highlight ? Colors.gold : Colors.blueBright }]}>{plan.badge}</Text>
                    </View>
                  </View>
                  <Text style={s.planOptionName}>{plan.name}</Text>
                  <Text style={[s.planOptionPrice, { color: plan.highlight ? Colors.gold : Colors.blueBright }]}>{plan.price}</Text>
                </View>
              </View>
              <Text style={s.planDesc}>{plan.desc}</Text>
              <View style={s.featureList}>
                {plan.features.map((f) => (
                  <View key={f} style={s.featureItem}>
                    <Ionicons name="checkmark-circle" size={14} color={plan.highlight ? Colors.gold : Colors.green} />
                    <Text style={s.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={[s.planBtn, plan.highlight && s.planBtnHighlight]}>
                <Text style={[s.planBtnText, plan.highlight && s.planBtnTextHighlight]}>
                  {plan.highlight ? "Upgrade to Bundle" : "Add to Plan"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  title: { fontSize: FontSize.xl, color: Colors.text, fontWeight: "800" },
  dlBtn: { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: "rgba(70,120,190,0.2)", alignItems: "center", justifyContent: "center" },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700", marginBottom: Spacing.sm },
  planCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.3)", padding: Spacing.lg },
  planHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  planName: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700" },
  planPrice: { fontSize: FontSize.lg, color: Colors.blueBright, fontWeight: "800", marginTop: 2 },
  activeBadge: { backgroundColor: Colors.green + "22", paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.sm },
  activeBadgeText: { fontSize: FontSize.xs, color: Colors.green, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "rgba(70,120,190,0.12)", marginVertical: Spacing.md },
  planMeta: { flexDirection: "row", gap: Spacing.lg, marginBottom: Spacing.md },
  planMetaItem: {},
  planMetaLabel: { fontSize: 9, color: Colors.mutedDim, fontWeight: "600", textTransform: "uppercase", marginBottom: 2 },
  planMetaVal: { fontSize: FontSize.sm, color: Colors.text, fontWeight: "600" },
  manageBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: Radius.sm, backgroundColor: Colors.blue + "18", borderWidth: 1, borderColor: Colors.blue + "33" },
  manageBtnText: { fontSize: FontSize.sm, color: Colors.blueBright, fontWeight: "700" },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", padding: Spacing.lg, gap: Spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(70,120,190,0.08)" },
  invoiceNum: { fontSize: FontSize.sm, color: Colors.blueBright, fontWeight: "700", fontVariant: ["tabular-nums"] },
  invoiceDesc: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 1 },
  invoiceDate: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 1 },
  rowRight: { alignItems: "flex-end", gap: 5 },
  invoiceAmount: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700" },
  paidBadge: { backgroundColor: Colors.green + "22", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  paidText: { fontSize: 10, color: Colors.green, fontWeight: "700" },
  planOptionCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.lg, marginBottom: 12 },
  planHighlight: { borderColor: Colors.gold + "44", backgroundColor: "rgba(246,168,43,0.05)" },
  planOptionHeader: { flexDirection: "row", marginBottom: Spacing.sm },
  planBadgeRow: { flexDirection: "row", marginBottom: 6 },
  planBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  planBadgeText: { fontSize: 9, fontWeight: "800" },
  planOptionName: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700" },
  planOptionPrice: { fontSize: FontSize.lg, fontWeight: "800", marginTop: 2 },
  planDesc: { fontSize: FontSize.xs, color: Colors.muted, lineHeight: 18, marginBottom: Spacing.md },
  featureList: { gap: 6, marginBottom: Spacing.lg },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { fontSize: FontSize.xs, color: Colors.muted },
  planBtn: { paddingVertical: 10, borderRadius: Radius.sm, backgroundColor: "rgba(70,120,190,0.12)", borderWidth: 1, borderColor: "rgba(70,120,190,0.25)", alignItems: "center" },
  planBtnHighlight: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  planBtnText: { fontSize: FontSize.sm, color: Colors.blueBright, fontWeight: "700" },
  planBtnTextHighlight: { color: "#000" },
})
