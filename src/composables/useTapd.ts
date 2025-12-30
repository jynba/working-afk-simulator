import { reactive, onMounted, onUnmounted, readonly, computed, ref } from 'vue'
import { fetchMyTapdData, type TapdItem } from '../services/tapd'

// Represents a single detected status change.
export interface StatusChange {
  id: string
  type: 'bug' | 'story'
  from: string
  to: string
  timestamp: number
}

interface TapdState {
  items: TapdItem[]
  isLoading: boolean
  error: string | null
}

const STORAGE_KEY_CLAIMED = 'afk-simulator-claimed-stories'

// We use a Map for efficient lookups of previous statuses.
const previousStatusMap = new Map<string, string>()

const workspaceId = ref<string | null>(null)

const state = reactive<TapdState>({
  items: [],
  isLoading: false,
  error: null,
})

// A reactive array to store claimed stories.
const claimedStories = ref<TapdItem[]>([])

// A reactive array to store the list of detected changes.
const statusChanges = ref<StatusChange[]>([])

let pollingTimer: ReturnType<typeof setInterval> | null = null

const saveClaimedStories = () => {
  localStorage.setItem(STORAGE_KEY_CLAIMED, JSON.stringify(claimedStories.value))
}

const loadClaimedStories = () => {
  const saved = localStorage.getItem(STORAGE_KEY_CLAIMED)
  if (saved) {
    const loadedStories: TapdItem[] = JSON.parse(saved)
    // --- Deduplication on load --- //
    const uniqueStories = Array.from(new Map(loadedStories.map(story => [story.id, story])).values());
    claimedStories.value = uniqueStories
  }
}

async function fetchData() {
  state.isLoading = true
  state.error = null
  try {
    const config = await window.secureStoreApi.getTapdConfig()
    console.log(config, 'config');

    workspaceId.value = config.workspaceId || null

    const newItems = await fetchMyTapdData()
    const newItemIds = new Set(newItems.map(item => item.id))

    // --- Sync and Validate Claimed Stories --- //
    // Keep only those claimed stories that still exist in the latest API fetch.
    const validatedClaimedStories = claimedStories.value.filter(story => newItemIds.has(story.id))
    if (validatedClaimedStories.length !== claimedStories.value.length) {
      console.log('[Sync] Removed expired stories from claimed list.')
      claimedStories.value = validatedClaimedStories
      saveClaimedStories() // Save the cleaned list
    }

    // --- Prevent duplicate claims --- //
    const claimedStoryIds = new Set(claimedStories.value.map(story => story.id))
    const filteredItems = newItems.filter(item => !claimedStoryIds.has(item.id))

    // --- Diff Logic --- //
    const changes: StatusChange[] = []
    for (const item of filteredItems) { // Use filteredItems for diff logic
      const oldStatus = previousStatusMap.get(item.id)
      // A change is detected if the item existed before and its status is different.
      if (oldStatus && oldStatus !== item.status) {
        changes.push({
          id: item.id,
          type: item.type,
          from: oldStatus,
          to: item.status,
          timestamp: Date.now(),
        })
      }
      // Update the map with the latest status for the next comparison.
      previousStatusMap.set(item.id, item.status)
    }

    if (changes.length > 0) {
      // For now, we just append changes. In a real app, you'd manage this list (e.g., clear daily).
      statusChanges.value.push(...changes)
      console.log('Detected changes:', changes)
    }

    state.items = filteredItems // Assign the filtered list to the state
  } catch (e) {
    const error = e as Error;
    if (error && error.message && error.message.includes('Authentication failed')) {
      state.error = 'TAPD token is invalid. Please update it in Settings.'
    } else {
      state.error = 'Failed to fetch TAPD data.'
    }
    console.error(error)
  } finally {
    state.isLoading = false
  }
}

function startPolling() {
  if (pollingTimer) clearInterval(pollingTimer)
  fetchData() // Initial fetch to populate the map
  pollingTimer = setInterval(fetchData, 24 * 60 * 60 * 1000)
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

function claimStory(storyId: string) {
  // --- Deduplication on claim --- //
  if (claimedStories.value.some(story => story.id === storyId)) {
    console.warn(`[Claim] Story ${storyId} is already claimed. Aborting.`)
    return
  }

  const storyToClaim = state.items.find(item => item.id === storyId)
  if (storyToClaim) {
    claimedStories.value.unshift(storyToClaim) // Add to the beginning of the claimed list
    state.items = state.items.filter(item => item.id !== storyId)
    saveClaimedStories()
  }
}

export function useTapd() {
  onMounted(() => {
    loadClaimedStories()
    startPolling()
  })
  onUnmounted(stopPolling)

  const stories = computed(() => state.items)

  const storyCount = computed(() => stories.value.length)

  // New computed property to count bug changes.
  const bugChangesToday = computed(() => {
    return statusChanges.value.filter((c) => c.type === 'bug').length
  })

  return {
    state: readonly(state),
    storyCount,
    stories,
    claimedStories: readonly(claimedStories),
    workspaceId: readonly(workspaceId),
    bugChangesToday, // Expose the new count
    statusChanges: readonly(statusChanges), // Expose for future use (e.g., event system)
    fetchData, // Expose the fetchData function for manual refresh
    claimStory, // Expose the new function
  }
}
