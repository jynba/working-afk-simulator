// Defines the structure of a single world event from the JSON configuration.
export interface WorldEventConfig {
  id: string
  source: 'tapd' | 'time'
  category: 'status' | 'aggregate'
  emotion: 'positive' | 'neutral' | 'negative'
  priority: number
  cooldown: number // in seconds
  copyPool: string[]
}

// A type representing the entire configuration file.
type EventConfigMap = Record<string, WorldEventConfig>

let eventConfig: EventConfigMap | null = null

/**
 * Fetches and caches the world event configuration from the public directory.
 * @returns A promise that resolves to the event configuration map.
 */
async function getEventConfig(): Promise<EventConfigMap> {
  if (eventConfig) {
    return eventConfig
  }

  try {
    // In Vite, files in the `public` directory are served at the root.
    const response = await fetch('/world-events.json')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const config = await response.json()
    eventConfig = config
    return config
  } catch (error) {
    console.error('Failed to load world-events.json:', error)
    // Return an empty object on failure to prevent crashes.
    return {}
  }
}

/**
 * A simple utility to pick a random item from an array.
 * @param arr The array to pick from.
 * @returns A random item from the array.
 */
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Generates a descriptive text for a given event ID by picking a random
 * string from its copy pool in the configuration.
 * @param eventId The ID of the event (e.g., 'BUG_FIXED').
 * @returns A random copy string, or a default message if not found.
 */
export async function generateCopyForEvent(eventId: string): Promise<string> {
  const config = await getEventConfig()
  const event = config[eventId]

  if (event && event.copyPool.length > 0) {
    return randomPick(event.copyPool)
  } else {
    console.warn(`No copy found for event ID: ${eventId}`)
    return '世界线发生了未知变化...'
  }
}

