import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ImageBackground, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native"
import { useState } from "react"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

export function SignUpScreen() {
  const navigation = useNavigation()
  const [form, setForm] = useState({ company: "", name: "", email: "", password: "", confirm: "" })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [showPw, setShowPw] = useState(false)

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    const { company, name, email, password, confirm } = form
    if (!company.trim() || !name.trim() || !email.trim() || !password) {
      setError("Please fill in all fields."); return
    }
    if (password !== confirm) {
      setError("Passwords do not match."); return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters."); return
    }
    setError("")
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setLoading(false)
    setDone(true)
  }

  return (
    <ImageBackground source={require("../../assets/auth-bg.png")} style={s.bg} resizeMode="cover">
      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={20} color={Colors.text} />
              <Text style={s.backText}>Back to Sign In</Text>
            </TouchableOpacity>

            <View style={s.card}>
              {done ? (
                <View style={s.successWrap}>
                  <View style={s.successIcon}>
                    <Ionicons name="checkmark-circle-outline" size={36} color={Colors.green} />
                  </View>
                  <Text style={s.cardTitle}>Request Submitted</Text>
                  <Text style={s.cardSubtitle}>
                    Your account request has been received. An administrator will review and activate your account. You'll be notified at <Text style={{ color: Colors.blueBright }}>{form.email}</Text>.
                  </Text>
                  <TouchableOpacity style={s.btn} onPress={() => navigation.goBack()}>
                    <Text style={s.btnText}>BACK TO SIGN IN</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={s.cardTitle}>Create Account</Text>
                  <Text style={s.cardSubtitle}>Request access to BailWatch Pro</Text>
                  <View style={s.dividerLine} />

                  {!!error && (
                    <View style={s.errorBanner}>
                      <Ionicons name="alert-circle-outline" size={15} color={Colors.red} />
                      <Text style={s.errorText}>{error}</Text>
                    </View>
                  )}

                  {[
                    { key: "company", placeholder: "Company / Agency Name", icon: "business-outline" },
                    { key: "name",    placeholder: "Full Name",             icon: "person-outline" },
                    { key: "email",   placeholder: "Email Address",         icon: "mail-outline", keyboard: "email-address" },
                  ].map(({ key, placeholder, icon, keyboard }) => (
                    <View key={key}>
                      <View style={s.inputRow}>
                        <Ionicons name={icon as any} size={18} color={Colors.blueBright} />
                        <TextInput
                          style={s.input}
                          value={form[key as keyof typeof form]}
                          onChangeText={set(key as keyof typeof form)}
                          placeholder={placeholder}
                          placeholderTextColor={Colors.mutedDim}
                          autoCapitalize={key === "email" ? "none" : "words"}
                          keyboardType={keyboard as any ?? "default"}
                          autoCorrect={false}
                        />
                      </View>
                      <View style={s.inputDivider} />
                    </View>
                  ))}

                  <View style={s.inputRow}>
                    <Ionicons name="lock-closed-outline" size={18} color={Colors.blueBright} />
                    <TextInput
                      style={s.input}
                      value={form.password}
                      onChangeText={set("password")}
                      placeholder="Password"
                      placeholderTextColor={Colors.mutedDim}
                      secureTextEntry={!showPw}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPw(v => !v)} hitSlop={8}>
                      <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.mutedDim} />
                    </TouchableOpacity>
                  </View>
                  <View style={s.inputDivider} />

                  <View style={s.inputRow}>
                    <Ionicons name="lock-closed-outline" size={18} color={Colors.blueBright} />
                    <TextInput
                      style={s.input}
                      value={form.confirm}
                      onChangeText={set("confirm")}
                      placeholder="Confirm Password"
                      placeholderTextColor={Colors.mutedDim}
                      secureTextEntry={!showPw}
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={s.inputDivider} />

                  <TouchableOpacity
                    style={[s.btn, loading && s.btnDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={s.btnText}>REQUEST ACCESS</Text>
                    }
                  </TouchableOpacity>

                  <View style={s.loginRow}>
                    <Text style={s.loginText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                      <Text style={s.loginLink}>Sign In</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  )
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1, backgroundColor: "transparent" },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: Spacing.xl + 4, paddingVertical: 20 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 20 },
  backText: { fontSize: FontSize.sm, color: Colors.muted },
  card: {
    backgroundColor: Colors.bgCard + "cc", borderRadius: Radius.xl,
    borderWidth: 1, borderColor: "#ffffff12",
    paddingHorizontal: 24, paddingVertical: 28,
  },
  cardTitle: { fontSize: FontSize.xxl, color: Colors.text, fontFamily: Font.extrabold, textAlign: "center", marginBottom: 4 },
  cardSubtitle: { fontSize: FontSize.sm, color: Colors.muted, textAlign: "center", marginBottom: 16, lineHeight: 20 },
  dividerLine: { height: 1, backgroundColor: "#ffffff10", marginBottom: 16 },
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.red + "18", borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.red + "33",
    padding: Spacing.md, marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: FontSize.xs, color: Colors.red },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  input: { flex: 1, color: Colors.text, fontSize: FontSize.md, fontFamily: Font.regular },
  inputDivider: { height: 1, backgroundColor: "#ffffff12", marginBottom: 2 },
  btn: {
    height: 52, borderRadius: Radius.lg, backgroundColor: Colors.blue,
    alignItems: "center", justifyContent: "center", marginTop: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: FontSize.md, fontFamily: Font.bold, letterSpacing: 1.5 },
  loginRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 16 },
  loginText: { fontSize: FontSize.sm, color: Colors.muted },
  loginLink: { fontSize: FontSize.sm, color: Colors.blueBright, fontFamily: Font.bold },
  successWrap: { alignItems: "center", gap: 12 },
  successIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.green + "18", borderWidth: 1, borderColor: Colors.green + "30",
    alignItems: "center", justifyContent: "center",
  },
})
