import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { Ionicons } from "@expo/vector-icons"
import { Platform, View, Text, TouchableOpacity, StyleSheet } from "react-native"
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs"
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
import { Colors, Font } from "../constants/theme"
import type { MoreStackParamList } from "../types"

const Tab = createBottomTabNavigator()
const MoreStack = createNativeStackNavigator<MoreStackParamList>()

const TAB_ITEMS = [
  { name: "Dashboard", icon: "grid",          iconOff: "grid-outline"          },
  { name: "Clients",   icon: "people",         iconOff: "people-outline"        },
  { name: "Bonds",     icon: "shield",         iconOff: "shield-outline"        },
  { name: "Alerts",    icon: "notifications",  iconOff: "notifications-outline", badge: true },
  { name: "More",      icon: "menu",           iconOff: "menu-outline"          },
] as const

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={tb.wrapper}>
      <View style={tb.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index
          const tab = TAB_ITEMS[index]

          return (
            <TouchableOpacity
              key={route.key}
              style={tb.item}
              activeOpacity={0.75}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true })
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
              }}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            >
              {/* Active glow pill */}
              {focused && <View style={tb.activePill} />}

              {/* Icon + badge */}
              <View style={tb.iconWrap}>
                <Ionicons
                  name={(focused ? tab.icon : tab.iconOff) as any}
                  size={22}
                  color={focused ? Colors.blueBright : Colors.mutedDim}
                />
                {"badge" in tab && tab.badge && !focused && (
                  <View style={tb.badge} />
                )}
              </View>

              {/* Label */}
              <Text style={[tb.label, focused && tb.labelActive]}>
                {route.name}
              </Text>

              {/* Active bottom bar */}
              {focused && <View style={tb.activeDot} />}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const BOTTOM_SAFE = Platform.OS === "ios" ? 28 : 0

const tb = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.bg,
    paddingBottom: BOTTOM_SAFE,
    borderTopWidth: 1,
    borderTopColor: "rgba(37,99,235,0.15)",
  },
  bar: {
    flexDirection: "row",
    height: 60,
    marginHorizontal: 12,
    marginTop: 6,
    backgroundColor: Colors.bgCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.18)",
    overflow: "hidden",
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingTop: 4,
  },
  activePill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 4,
    right: 4,
    borderRadius: 14,
    backgroundColor: "rgba(59,130,246,0.12)",
  },
  iconWrap: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.red,
    borderWidth: 1,
    borderColor: Colors.bgCard,
  },
  label: {
    fontSize: 10,
    fontFamily: Font.medium,
    color: Colors.mutedDim,
    marginTop: 3,
  },
  labelActive: {
    color: Colors.blueBright,
    fontFamily: Font.bold,
  },
  activeDot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.blueBright,
  },
})

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
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Clients"   component={ClientsScreen} />
      <Tab.Screen name="Bonds"     component={BondsScreen} />
      <Tab.Screen name="Alerts"    component={AlertsScreen} />
      <Tab.Screen name="More"      component={MoreNavigator} />
    </Tab.Navigator>
  )
}
