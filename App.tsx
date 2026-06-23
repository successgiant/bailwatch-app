import { NavigationContainer } from "@react-navigation/native"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { View, ActivityIndicator, Text } from "react-native"
import { useEffect, useRef } from "react"
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter"
import { AuthProvider, useAuth } from "./src/context/AuthContext"
import { TabNavigator } from "./src/navigation/TabNavigator"
import { AuthNavigator } from "./src/navigation/AuthNavigator"
import { Colors } from "./src/constants/theme"
import { setupNotifications } from "./src/lib/notifications"
import { registerPollers, seedSeenBookings, seedSeenRearrests } from "./src/lib/bookingPoller"

// Apply Inter as the default font for all Text components
;(Text as any).defaultProps = (Text as any).defaultProps ?? {}
;(Text as any).defaultProps.style = { fontFamily: "Inter_400Regular" }

function AppNavigator() {
  const { identity, isLoaded } = useAuth()
  const initialized = useRef(false)

  useEffect(() => {
    if (!identity || initialized.current) return
    initialized.current = true

    // Request permission + register background pollers once after login
    setupNotifications().then((granted) => {
      if (!granted) return
      registerPollers()
      seedSeenBookings(identity)
      seedSeenRearrests(identity)
    })
  }, [identity])

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={Colors.blue} />
      </View>
    )
  }

  if (!identity) {
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    )
  }

  return (
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  )
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  })

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={Colors.blue} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
