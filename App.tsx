import { NavigationContainer } from "@react-navigation/native"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { TabNavigator } from "./src/navigation/TabNavigator"

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor="#04070d" />
        <TabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  )
}
