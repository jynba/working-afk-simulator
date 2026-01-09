import { reactive, onMounted, onUnmounted, readonly } from 'vue'

// According to README, these are the basic attributes
interface PlayerState {
  level: number
  xp: number
  xpForNextLevel: number
  energy: number
  focus: number
  contribution: number
  onlineTimeInSeconds: number
  statusText: string
}

const STORAGE_KEY = 'afk-simulator-save'

// Initial state of the player
const state = reactive<PlayerState>({
  level: 1,
  xp: 0,
  xpForNextLevel: 100,
  energy: 100,
  focus: 100,
  contribution: 6000,
  onlineTimeInSeconds: 0,
  statusText: '🟢 稳定监控中',
})

let gameLoop: ReturnType<typeof setInterval> | null = null

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const loadState = () => {
  const savedState = localStorage.getItem(STORAGE_KEY)
  if (savedState) {
    Object.assign(state, JSON.parse(savedState))
  }
}

const startGameloop = () => {
  if (gameLoop) return

  gameLoop = setInterval(() => {
    // --- Main Game Logic --- //

    // 1. Update online time
    state.onlineTimeInSeconds++

    // 2. Gain XP and lose Energy every 10 seconds
    if (state.onlineTimeInSeconds % 10 === 0) {
      state.xp += 5 // Gain 5 XP
      state.energy = Math.max(0, state.energy - 0.5) // Lose 0.5 energy
    }

    // 3. Level up logic
    if (state.xp >= state.xpForNextLevel) {
      state.level++
      state.xp -= state.xpForNextLevel
      state.xpForNextLevel = Math.floor(state.xpForNextLevel * 1.5) // Increase XP for next level
      // Restore some energy on level up
      state.energy = Math.min(100, state.energy + 20)
      // Add contribution points
      state.contribution += 10 * state.level
    }

    // 4. Update status text based on energy
    if (state.energy < 20) {
      state.statusText = '🔴 精力接近临界值'
    } else if (state.energy < 60) {
      state.statusText = '🟡 世界线出现轻微扰动'
    } else {
      state.statusText = '🟢 稳定监控中'
    }

    // 5. Save state every second
    saveState()
  }, 1000) // Run every second
}

const stopGameLoop = () => {
  if (gameLoop) {
    clearInterval(gameLoop)
    gameLoop = null
  }
}

const spendContribution = (amount: number): boolean => {
  if (state.contribution >= amount) {
    state.contribution -= amount;
    saveState();
    return true;
  }
  return false;
}

const claimTaskReward = () => {
  const reward = 50 * state.level // The reward scales with the player's level
  state.contribution += reward
  console.log(`[useGame] Claimed task reward: +${reward} contribution points.`)
}

export function useGame() {
  onMounted(() => {
    loadState() // Load state when component is mounted
    startGameloop()
  })

  onUnmounted(stopGameLoop)

  // Expose a read-only version of the state to the component
  // and any methods that can be used to interact with the state.
  return {
    state: readonly(state),
    claimTaskReward,
    spendContribution,
  }
}

