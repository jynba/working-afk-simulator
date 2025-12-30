import { ref, watch } from 'vue'
import { useTapd, type StatusChange } from './useTapd'
import { generateCopyForEvent } from '../services/worldEvents'

// A reactive ref to hold the most recent world event message.
const latestEventMessage = ref<string | null>(null)
let messageTimeout: ReturnType<typeof setTimeout> | null = null

// The core logic for the world event system.
export function useWorldEvents() {
  const { statusChanges } = useTapd()

  // Watch the list of status changes for new additions.
  watch(
    statusChanges,
    (newChanges, oldChanges) => {
      // Determine the actual new change that was just added.
      if (newChanges.length > oldChanges.length) {
        const lastChange = newChanges[newChanges.length - 1]
        handleStatusChange(lastChange)
      }
    },
    { deep: true } // Necessary for watching changes inside the array
  )

  async function handleStatusChange(change: StatusChange) {
    const eventId = mapChangeToEventId(change)
    if (!eventId) return

    const message = await generateCopyForEvent(eventId)
    latestEventMessage.value = message

    // Clear any existing timeout.
    if (messageTimeout) clearTimeout(messageTimeout)

    // The message will disappear after 8 seconds.
    messageTimeout = setTimeout(() => {
      latestEventMessage.value = null
    }, 8000)
  }

  return {
    latestEventMessage,
  }
}

/**
 * Maps a StatusChange object to a specific Event ID from our JSON config.
 * This is the bridge between raw data and game events.
 * @param change The detected status change.
 * @returns The corresponding event ID, or null if no mapping exists.
 */
function mapChangeToEventId(change: StatusChange): string | null {
  if (change.type === 'bug') {
    if (change.to === '已解决') {
      return 'BUG_FIXED'
    }
    if (change.to === '重新打开' || change.to === 'Reopened') {
      // Assuming 'Reopened' might be a status
      return 'BUG_REOPENED'
    }
  }

  if (change.type === 'story') {
    // A simple example of a 'rollback' might be moving from a later stage to an earlier one.
    // This logic would need to be more robust in a real application.
    const progressStates = ['规划中', '实现中', '已完成']
    const fromIndex = progressStates.indexOf(change.from)
    const toIndex = progressStates.indexOf(change.to)
    if (fromIndex > -1 && toIndex > -1 && fromIndex > toIndex) {
      return 'STORY_ROLLBACK'
    }
  }

  return null // No event mapped for this change
}

