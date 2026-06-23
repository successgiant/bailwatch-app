import * as BackgroundFetch from "expo-background-fetch"
import * as TaskManager from "expo-task-manager"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { apiGet } from "./api"
import { sendBookingNotification, sendRearrestNotification } from "./notifications"

const BOOKING_TASK = "BAILWATCH_BOOKING_POLL"
const BONDWATCH_TASK = "BAILWATCH_BONDWATCH_POLL"
const SEEN_BOOKINGS_KEY = "bwp_seen_booking_ids"
const SEEN_REARREST_KEY = "bwp_seen_rearrest_ids"

// ─── Background task definitions (must be top-level) ─────────────────────────

TaskManager.defineTask(BOOKING_TASK, async () => {
  try {
    const identity = await AsyncStorage.getItem("bwp_identity")
    if (!identity) return BackgroundFetch.BackgroundFetchResult.NoData

    const data = await apiGet("inmates/", identity, { page_size: "30" })
    const bookings: any[] = data?.results ?? data?.data ?? (Array.isArray(data) ? data : [])
    if (!bookings.length) return BackgroundFetch.BackgroundFetchResult.NoData

    const raw = await AsyncStorage.getItem(SEEN_BOOKINGS_KEY)
    const seenIds = new Set<string>(raw ? JSON.parse(raw) : [])

    const newOnes = bookings.filter((b) => {
      const id = String(b.id ?? b.booking_id ?? "")
      return id && !seenIds.has(id)
    })

    // Notify up to 3 new bookings (avoid flooding)
    for (const booking of newOnes.slice(0, 3)) {
      await sendBookingNotification(booking)
      seenIds.add(String(booking.id ?? booking.booking_id ?? ""))
    }

    // Keep last 300 IDs to avoid memory bloat
    const updated = Array.from(seenIds).slice(-300)
    await AsyncStorage.setItem(SEEN_BOOKINGS_KEY, JSON.stringify(updated))

    return newOnes.length > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
})

TaskManager.defineTask(BONDWATCH_TASK, async () => {
  try {
    const identity = await AsyncStorage.getItem("bwp_identity")
    if (!identity) return BackgroundFetch.BackgroundFetchResult.NoData

    const clients: any[] = await apiGet("bondwatch/clients/", identity).catch(() => [])
    const raw = await AsyncStorage.getItem(SEEN_REARREST_KEY)
    const seenIds = new Set<string>(raw ? JSON.parse(raw) : [])

    const rearrested = clients.filter((c) => {
      const id = String(c.id ?? "")
      return (c.is_rearrested || c.isReArrested) && id && !seenIds.has(id)
    })

    for (const client of rearrested.slice(0, 3)) {
      await sendRearrestNotification(client)
      seenIds.add(String(client.id))
    }

    const updated = Array.from(seenIds).slice(-200)
    await AsyncStorage.setItem(SEEN_REARREST_KEY, JSON.stringify(updated))

    return rearrested.length > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
})

// ─── Public API ───────────────────────────────────────────────────────────────

export async function registerPollers() {
  const opts: BackgroundFetch.BackgroundFetchOptions = {
    minimumInterval: 15 * 60, // iOS minimum is 15 min; Android honours lower values
    stopOnTerminate: false,
    startOnBoot: true,
  }
  try { await BackgroundFetch.registerTaskAsync(BOOKING_TASK, opts) } catch {}
  try { await BackgroundFetch.registerTaskAsync(BONDWATCH_TASK, opts) } catch {}
}

export async function unregisterPollers() {
  try { await BackgroundFetch.unregisterTaskAsync(BOOKING_TASK) } catch {}
  try { await BackgroundFetch.unregisterTaskAsync(BONDWATCH_TASK) } catch {}
}

/** Seed seen IDs from current data so we don't fire on first launch */
export async function seedSeenBookings(identity: string) {
  try {
    const existing = await AsyncStorage.getItem(SEEN_BOOKINGS_KEY)
    if (existing) return

    const data = await apiGet("inmates/", identity, { page_size: "50" })
    const bookings: any[] = data?.results ?? data?.data ?? (Array.isArray(data) ? data : [])
    const ids = bookings.map((b) => String(b.id ?? b.booking_id ?? "")).filter(Boolean)
    await AsyncStorage.setItem(SEEN_BOOKINGS_KEY, JSON.stringify(ids))
  } catch {}
}

export async function seedSeenRearrests(identity: string) {
  try {
    const existing = await AsyncStorage.getItem(SEEN_REARREST_KEY)
    if (existing) return

    const clients: any[] = await apiGet("bondwatch/clients/", identity).catch(() => [])
    const ids = clients
      .filter((c) => c.is_rearrested || c.isReArrested)
      .map((c) => String(c.id))
      .filter(Boolean)
    await AsyncStorage.setItem(SEEN_REARREST_KEY, JSON.stringify(ids))
  } catch {}
}
