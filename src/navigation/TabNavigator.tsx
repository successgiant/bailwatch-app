import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { Ionicons } from "@expo/vector-icons"
import { Platform, View } from "react-native"
import { DashboardScreen } from "../screens/DashboardScreen"
import { ClientsScreen } from "../screens/ClientsScreen"
import { BondsScreen } from "../screens/BondsScreen"
import { AlertsScreen } from "../screens/AlertsScreen"
import { MoreScreen } from "../screens/MoreScreen"
import { BondAppScreen } from "../screens/BondAppScreen"
import { PaymentsScreen } from "../screens/PaymentsScreen"
import { CalendarScreen } from "../screens/CalendarScreen"
import { ESignScreen } from "../screens/ESignScreen"
import { ReportsScreen } from "../screens/ReportsScreen"
import { ArrestAlertScreen } from "../screens/ArrestAlertScreen"
import { BondWatchScreen } from "../screens/BondWatchScreen"
import { PowersScreen } from "../screens/PowersScreen"
import { BondTeamScreen } from "../screens/BondTeamScreen"
import { BillingScreen } from "../screens/BillingScreen"
import { MessagesScreen } from "../screens/MessagesScreen"
import { CountyCoverageScreen } from "../screens/CountyCoverageScreen"
import { BondTrackScreen } from "../screens/BondTrackScreen"
import { DocumentsScreen } from "../screens/DocumentsScreen"
import { ClientCaseDetailScreen } from "../screens/ClientCaseDetailScreen"
import { Colors, FontSize } from "../constants/theme"
import type { MoreStackParamList } from "../types"

const Tab = createBottomTabNavigator()
const MoreStack = createNativeStackNavigator<MoreStackParamList>()

function MoreNavigator() {
  return (
    <MoreStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.bgCard },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: "700", color: Colors.text },
        headerBackTitle: "Back",
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      <MoreStack.Screen name="MoreMenu" component={MoreScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="BondApp" component={BondAppScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="Payments" component={PaymentsScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="Calendar" component={CalendarScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="ESign" component={ESignScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="Reports" component={ReportsScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="ArrestAlert" component={ArrestAlertScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="BondWatch" component={BondWatchScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="Powers" component={PowersScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="BondTeam" component={BondTeamScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="Billing" component={BillingScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="Messages" component={MessagesScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="CountyCoverage" component={CountyCoverageScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="BondTrack" component={BondTrackScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="Documents" component={DocumentsScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="ClientDetail" component={ClientCaseDetailScreen} options={{ headerShown: false }} />
    </MoreStack.Navigator>
  )
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bg,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 82 : 62,
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.blueBright,
        tabBarInactiveTintColor: Colors.mutedDim,
        tabBarLabelStyle: {
          fontSize: FontSize.xs,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Clients"
        component={ClientsScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Bonds"
        component={BondsScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="shield-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          tabBarIcon: ({ color, focused, size }) => (
            <View>
              <Ionicons name="notifications-outline" size={size} color={color} />
              {!focused && (
                <View style={{ position: "absolute", top: -2, right: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.red }} />
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" size={size} color={color} /> }}
      />
    </Tab.Navigator>
  )
}
