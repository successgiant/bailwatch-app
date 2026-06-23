import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

// Show notifications even when app is in foreground
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

export async function sendBookingNotification(booking: any) {
  const name = booking.defendant_name ?? booking.name ?? "Unknown Defendant"
  const rawCharges = booking.charges ?? []
  const topCharge =
    typeof rawCharges[0] === "string"
      ? rawCharges[0]
      : rawCharges[0]?.charge_description ?? rawCharges[0]?.charge ?? booking.top_charge ?? "Booking"
  const county = booking.county ?? booking.county_name ?? ""
  const rawAmt = booking.bond_amount ?? booking.total_bond ?? ""
  const bond = rawAmt
    ? `$${parseFloat(String(rawAmt).replace(/[$,]/g, "")).toLocaleString("en-US", { minimumFractionDigits: 0 })}`
    : ""

  const bodyParts = [topCharge, county, bond].filter(Boolean)

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🚨 New Booking Alert",
      body: `${name} — ${bodyParts.join(" · ")}`,
      data: { bookingId: booking.id ?? booking.booking_id, type: "new_booking" },
      sound: "default",
      ...(Platform.OS === "android" ? { channelId: "bookings" } : {}),
    },
    trigger: null,
  })
}

export async function sendRearrestNotification(client: any) {
  const name = client.name ?? client.defendant_name ?? "A watched client"
  const county = client.county ?? ""

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "⚠️ Re-Arrest Detected",
      body: `${name} has been re-arrested${county ? ` in ${county}` : ""}. Immediate action may be required.`,
      data: { clientId: client.id, type: "rearrest" },
      sound: "default",
      ...(Platform.OS === "android" ? { channelId: "bondwatch" } : {}),
    },
    trigger: null,
  })
}
