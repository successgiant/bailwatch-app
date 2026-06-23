import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ImageBackground, KeyboardAvoidingView, Platform,
} from "react-native"
import { useState } from "react"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000"

export function ForgotPasswordScreen() {
  const navigation = useNavigation()
  const [identity, setIdentity] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!identity.trim()) { setError("Please enter your email or username."); return }
    setError("")
    setLoading(true)
    try {
      await fetch(`${BASE}/api/password-reset/request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: identity.trim() }),
      })
      setSent(true)
    } catch {
      setError("Could not connect. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ImageBackground source={require("../../assets/auth-bg.png")} style={s.bg} resizeMode="cover">
      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.inner}>

            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={20} color={Colors.text} />
              <Text style={s.backText}>Back to Sign In</Text>
            </TouchableOpacity>

            <View style={s.card}>
              {sent ? (
                <View style={s.successWrap}>
                  <View style={s.successIcon}>
                    <Ionicons name="mail-outline" size={32} color={Colors.blue} />
                  </View>
                  <Text style={s.cardTitle}>Check Your Email</Text>
                  <Text style={s.cardSubtitle}>
                    If an account exists for <Text style={{ color: Colors.blueBright }}>{identity}</Text>, you'll receive a password reset link shortly.
                  </Text>
                  <TouchableOpacity style={s.btn} onPress={() => navigation.goBack()}>
                    <Text style={s.btnText}>BACK TO SIGN IN</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={s.iconWrap}>
                    <Ionicons name="lock-open-outline" size={28} color={Colors.blue} />
                  </View>
                  <Text style={s.cardTitle}>Forgot Password?</Text>
                  <Text style={s.cardSubtitle}>Enter your email or username and we'll send you a reset link.</Text>

                  <View style={s.dividerLine} />

                  {!!error && (
                    <View style={s.errorBanner}>
                      <Ionicons name="alert-circle-outline" size={15} color={Colors.red} />
                      <Text style={s.errorText}>{error}</Text>
                    </View>
                  )}

                  <View style={s.inputRow}>
                    <Ionicons name="person-outline" size={18} color={Colors.blueBright} />
                    <TextInput
                      style={s.input}
                      value={identity}
                      onChangeText={setIdentity}
                      placeholder="Email or Username"
                      placeholderTextColor={Colors.mutedDim}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
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
                      : <Text style={s.btnText}>SEND RESET LINK</Text>
                    }
                  </TouchableOpacity>
                </>
              )}
            </View>

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  )
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1, backgroundColor: "transparent" },
  kav: { flex: 1 },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: Spacing.xl + 4 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 20 },
  backText: { fontSize: FontSize.sm, color: Colors.muted },
  card: {
    backgroundColor: "#09101ecc", borderRadius: Radius.xl,
    borderWidth: 1, borderColor: "#ffffff12",
    paddingHorizontal: 24, paddingVertical: 28,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.blue + "18", borderWidth: 1, borderColor: Colors.blue + "30",
    alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 14,
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
  inputRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  input: { flex: 1, color: Colors.text, fontSize: FontSize.md, fontFamily: Font.regular },
  inputDivider: { height: 1, backgroundColor: "#ffffff12", marginBottom: 20 },
  btn: {
    height: 52, borderRadius: Radius.lg, backgroundColor: Colors.blue,
    alignItems: "center", justifyContent: "center", marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: FontSize.md, fontFamily: Font.bold, letterSpacing: 1.5 },
  successWrap: { alignItems: "center", gap: 12 },
  successIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.blue + "18", borderWidth: 1, borderColor: Colors.blue + "30",
    alignItems: "center", justifyContent: "center",
  },
})
