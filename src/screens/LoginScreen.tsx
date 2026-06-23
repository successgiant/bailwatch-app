import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ImageBackground,
} from "react-native"
import { useState } from "react"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { Colors, Font, FontSize, Radius, Spacing } from "../constants/theme"

export function LoginScreen() {
  const { login } = useAuth()
  const navigation = useNavigation<any>()
  const [identity, setIdentity] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleLogin = async () => {
    if (!identity.trim() || !password.trim()) {
      setError("Enter your email and password.")
      return
    }
    setError("")
    setLoading(true)
    try {
      await login(identity.trim(), password)
    } catch (e: any) {
      setError(e?.message ?? "Login failed. Check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ImageBackground source={require("../../assets/auth-bg.png")} style={s.bg} resizeMode="cover">
      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.inner}>

            {/* Logo */}
            <View style={s.logoArea}>
              <Image
                source={require("../../assets/bailwatchpro-icon.png")}
                style={s.logo}
                resizeMode="contain"
              />
            </View>

            {/* Card */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Welcome Back</Text>
              <Text style={s.cardSubtitle}>Sign in to continue</Text>

              <View style={s.dividerLine} />

              {!!error && (
                <View style={s.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={15} color={Colors.red} />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              {/* Email */}
              <View style={s.inputRow}>
                <Ionicons name="person-outline" size={18} color={Colors.blueBright} />
                <TextInput
                  style={s.input}
                  value={identity}
                  onChangeText={setIdentity}
                  placeholder="Email Address"
                  placeholderTextColor={Colors.mutedDim}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
              <View style={s.inputDivider} />

              {/* Password */}
              <View style={s.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.blueBright} />
                <TextInput
                  style={s.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={Colors.mutedDim}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPw(p => !p)} hitSlop={8}>
                  <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.mutedDim} />
                </TouchableOpacity>
              </View>
              <View style={s.inputDivider} />

              {/* Remember / Forgot */}
              <View style={s.rememberRow}>
                <TouchableOpacity style={s.rememberLeft} onPress={() => setRememberMe(v => !v)} activeOpacity={0.7}>
                  <View style={[s.checkbox, rememberMe && s.checkboxActive]}>
                    {rememberMe && <Ionicons name="checkmark" size={11} color="#fff" />}
                  </View>
                  <Text style={s.rememberText}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
                  <Text style={s.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                style={[s.btn, loading && s.btnDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.btnText}>SIGN IN</Text>
                }
              </TouchableOpacity>

              {/* OR divider */}
              <View style={s.orRow}>
                <View style={s.orLine} />
                <Text style={s.orText}>OR</Text>
                <View style={s.orLine} />
              </View>

              {/* Sign Up */}
              <View style={s.signupRow}>
                <Text style={s.signupText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
                  <Text style={s.signupLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={s.footer}>
              <Ionicons name="shield-outline" size={13} color={Colors.mutedDim} />
              <Text style={s.footerText}>SECURE. ENCRYPTED. TRUSTED.</Text>
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

  logoArea: { alignItems: "center", marginBottom: 24 },
  logo: { width: 180, height: 180 },

  card: {
    backgroundColor: "#09101ecc",
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: "#ffffff12",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  cardTitle: {
    fontSize: FontSize.xxl,
    color: Colors.text,
    fontFamily: Font.extrabold,
    textAlign: "center",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    textAlign: "center",
    marginBottom: 16,
  },
  dividerLine: { height: 1, backgroundColor: "#ffffff10", marginBottom: 16 },

  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.red + "18", borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.red + "33",
    padding: Spacing.md, marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: FontSize.xs, color: Colors.red },

  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14,
  },
  input: { flex: 1, color: Colors.text, fontSize: FontSize.md, fontFamily: Font.regular },
  inputDivider: { height: 1, backgroundColor: "#ffffff12", marginBottom: 2 },

  rememberRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 14, marginBottom: 18,
  },
  rememberLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    width: 18, height: 18, borderRadius: 4,
    borderWidth: 1, borderColor: Colors.mutedDim,
    alignItems: "center", justifyContent: "center",
  },
  checkboxActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  rememberText: { fontSize: FontSize.xs, color: Colors.muted },
  forgotText: { fontSize: FontSize.xs, color: Colors.blueBright, fontFamily: Font.semibold },

  btn: {
    height: 52, borderRadius: Radius.lg,
    backgroundColor: Colors.blue,
    alignItems: "center", justifyContent: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: FontSize.md, fontFamily: Font.bold, letterSpacing: 1.5 },

  orRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 18 },
  orLine: { flex: 1, height: 1, backgroundColor: "#ffffff12" },
  orText: { fontSize: FontSize.xs, color: Colors.mutedDim, fontFamily: Font.semibold },

  signupRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  signupText: { fontSize: FontSize.sm, color: Colors.muted },
  signupLink: { fontSize: FontSize.sm, color: Colors.blueBright, fontFamily: Font.bold },

  footer: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 20,
  },
  footerText: { fontSize: 10, color: Colors.mutedDim, fontFamily: Font.semibold, letterSpacing: 1.5 },
})
