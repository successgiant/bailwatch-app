import * as Notifications from "expo-notifications"
import { Platform } from "react-native"
import { apiPost, apiDelete } from "./api"

// Show banners even when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("bookings", {
      name: "New Bookings",
      description: "Alerts for new jail bookings in your monitored counties",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#3b82f6",
      sound: "default",
    })
    await Notifications.setNotificationChannelAsync("bondwatch", {
      name: "BondWatch Re-Arrests",
      description: "Alerts when a watched client is re-arrested",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: "#ef4444",
      sound: "default",
    })
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === "granted") return true

  const { status } = await Notifications.requestPermissionsAsync()
  return status === "granted"
}

/**
 * Get the Expo push token for this device and register it with the backend.
 * Must be called after notification permission is granted.
 */
export async function registerPushToken(identity: string): Promise<void> {
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync()
    if (!token) return

    await apiPost("devices/register/", identity, {
      token,
      platform: Platform.OS,
    })
  } catch (err) {
    // Non-fatal — push just won't work on this device
    console.warn("Push token registration failed:", err)
  }
}

/**
 * Unregister push token when user logs out.
 */
export async function unregisterPushToken(identity: string): Promise<void> {
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync()
    if (!token) return
    // Pass token in query string since apiDelete doesn't support a body
    await apiDelete(`devices/register/?token=${encodeURIComponent(token)}`, identity)
  } catch {}
}
