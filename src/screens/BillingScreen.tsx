import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

function fmtMoney(v: any): string {
  if (v == null) return "—"
  const n = parseFloat(String(v))
  if (isNaN(n)) return "—"
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function BillingScreen() {
  const navigation = useNavigation()
  const { identity } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!identity) return
    api.billing(identity).then((res: any) => setData(res)).catch(() => {}).finally(() => setLoading(false))
  }, [identity])

  const subscription = data?.subscription ?? {}
  const invoices = Array.isArray(data?.invoices) ? data.invoices : Array.isArray(data?.results) ? data.results : []
  const plans = Array.isArray(data?.plans) ? data.plans : []

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.green + "18", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="card-outline" size={17} color={Colors.green} />
        </View>
        <Text style={s.title}>Billing</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 32 }}>

          {/* Current Plan */}
          <View style={s.planCard}>
            <View style={s.planTop}>
              <View>
                <Text style={s.planName}>{subscription.plan_name ?? subscription.name ?? "Professional"}</Text>
                <Text style={s.planStatus}>
                  {subscription.status ?? "Active"} · Renews {subscription.renewal_date ?? subscription.next_billing_date ? new Date(subscription.renewal_date ?? subscription.next_billing_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                </Text>
              </View>
              <Text style={s.planPrice}>{fmtMoney(subscription.monthly_amount ?? subscription.price)}<Text style={s.planPriceSub}>/mo</Text></Text>
            </View>
            {subscription.seats != null && (
              <View style={s.planMeta}>
                <Ionicons name="people-outline" size={14} color={Colors.mutedDim} />
                <Text style={s.planMetaText}>{subscription.seats} seats included</Text>
              </View>
            )}
            <TouchableOpacity style={s.managePlanBtn}>
              <Text style={s.managePlanText}>Manage Plan</Text>
            </TouchableOpacity>
          </View>

          {/* Invoices */}
          {invoices.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Billing History</Text>
              <View style={s.table}>
                {invoices.slice(0, 10).map((inv: any, i: number) => {
                  const isPaid = (inv.status ?? "paid").toLowerCase() === "paid"
                  const date = inv.date ?? inv.invoice_date ?? inv.created_at ?? ""
                  return (
                    <View key={inv.id ?? i} style={[s.invoiceRow, i < invoices.length - 1 && s.rowBorder]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.invoiceDesc}>{inv.description ?? inv.plan_name ?? "Subscription"}</Text>
                        <Text style={s.invoiceDate}>{date ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</Text>
                      </View>
                      <View style={s.invoiceRight}>
                        <Text style={s.invoiceAmount}>{fmtMoney(inv.amount ?? inv.total)}</Text>
                        <View style={[s.badge, { backgroundColor: isPaid ? Colors.green + "18" : Colors.gold + "18" }]}>
                          <Text style={[s.badgeText, { color: isPaid ? Colors.green : Colors.gold }]}>{inv.status ?? "paid"}</Text>
                        </View>
                      </View>
                    </View>
                  )
                })}
              </View>
            </>
          )}

          {/* Available Plans */}
          {plans.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Available Plans</Text>
              {plans.map((plan: any, i: number) => (
                <View key={plan.id ?? i} style={[s.availPlan, i < plans.length - 1 && { marginBottom: 10 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.availPlanName}>{plan.name ?? plan.plan_name ?? ""}</Text>
                    <Text style={s.availPlanDesc}>{plan.description ?? ""}</Text>
                  </View>
                  <View style={s.availPlanRight}>
                    <Text style={s.availPlanPrice}>{fmtMoney(plan.price ?? plan.monthly_amount)}<Text style={s.availPlanPriceSub}>/mo</Text></Text>
                    <TouchableOpacity style={s.selectBtn}>
                      <Text style={s.selectBtnText}>Select</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginHorizontal: Spacing.xl, marginVertical: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: Radius.md, alignItems: "center", justifyContent: "center", marginRight: 4 },
  title: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.extrabold },
  planCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.3)", padding: Spacing.xl, marginBottom: Spacing.xl },
  planTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: Spacing.md },
  planName: { fontSize: FontSize.lg, color: Colors.text, fontFamily: Font.extrabold },
  planStatus: { fontSize: FontSize.xs, color: Colors.green, marginTop: 4 },
  planPrice: { fontSize: FontSize.xxl, color: Colors.blueBright, fontFamily: Font.extrabold },
  planPriceSub: { fontSize: FontSize.sm, color: Colors.mutedDim },
  planMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: Spacing.lg },
  planMetaText: { fontSize: FontSize.sm, color: Colors.mutedDim },
  managePlanBtn: { paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(70,120,190,0.3)", alignItems: "center" },
  managePlanText: { fontSize: FontSize.sm, color: Colors.blueBright, fontFamily: Font.bold },
  sectionTitle: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold, marginBottom: Spacing.md },
  table: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", overflow: "hidden", marginBottom: Spacing.xl },
  invoiceRow: { flexDirection: "row", alignItems: "center", padding: Spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(70,120,190,0.1)" },
  invoiceDesc: { fontSize: FontSize.sm, color: Colors.text, fontFamily: Font.semibold },
  invoiceDate: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 2 },
  invoiceRight: { alignItems: "flex-end", gap: 4 },
  invoiceAmount: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
  badgeText: { fontSize: 10, fontFamily: Font.bold },
  availPlan: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(70,120,190,0.18)", padding: Spacing.lg, flexDirection: "row", alignItems: "center", gap: Spacing.md },
  availPlanName: { fontSize: FontSize.md, color: Colors.text, fontFamily: Font.bold },
  availPlanDesc: { fontSize: FontSize.xs, color: Colors.mutedDim, marginTop: 2 },
  availPlanRight: { alignItems: "flex-end", gap: 8 },
  availPlanPrice: { fontSize: FontSize.lg, color: Colors.blueBright, fontFamily: Font.extrabold },
  availPlanPriceSub: { fontSize: FontSize.xs, color: Colors.mutedDim },
  selectBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: Colors.blue, alignItems: "center" },
  selectBtnText: { fontSize: FontSize.xs, color: "#fff", fontFamily: Font.bold },
})
