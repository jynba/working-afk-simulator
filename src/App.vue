<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGame } from './composables/useGame'
import { useTapd } from './composables/useTapd'
import { useWorldEvents } from './composables/useWorldEvents'
import Settings from './components/Settings.vue'
import Shop from './components/Shop.vue'
import Onboarding from './components/Onboarding.vue'
import type { TapdItem } from './services/tapd'
import Live2DViewer from './components/Live2DViewer.vue'

// --- State ---
const showSettings = ref(false)
const inlineOpen = ref(true)
const claimedOpen = ref(false) // State for the claimed list toggle
const isMinimized = ref(false)
const showShop = ref(false)
const showOnboarding = ref(false)

// --- Composables ---
const { state: gameState, claimTaskReward } = useGame()
const { state: tapdState, storyCount, stories, claimedStories, workspaceId, fetchData, claimStory } = useTapd()
const { latestEventMessage } = useWorldEvents()

const modelHistory = ref<string[]>([]);

const getInitialModelUrl = () => {
  const history = localStorage.getItem('live2d_model_history');
  modelHistory.value = history ? JSON.parse(history) : [];

  let path = localStorage.getItem('live2d_model_path');
  if (path) {
    if (path.startsWith('file:///')) {
      const rawPath = path.substring('file:///'.length);
      path = `local-resource://${rawPath}`;
      localStorage.setItem('live2d_model_path', path);
    }
    return path;
  }
  return '';
};

const modelUrl = ref(getInitialModelUrl());

function updateModel(url: string) {
  modelUrl.value = url;
  localStorage.setItem('live2d_model_path', url);

  // Update model history
  if (!modelHistory.value.includes(url)) {
    modelHistory.value.unshift(url); // Add to the beginning of the list
    localStorage.setItem('live2d_model_history', JSON.stringify(modelHistory.value));
  }
  
  // Resize window if a model is loaded
  if (url) {
    window.windowApi?.resizeWindow(640, 270)
  }
}

function handleModelChange(path: string) {
  // Convert the file path to our custom protocol URL
  const formattedPath = path.replace(/\\/g, '/');
  const url = `local-resource:///${formattedPath}`;
  updateModel(url);

  if (window.electronApi) {
    window.electronApi.showNotification({
      title: '导入成功',
      body: 'Live2D 模型已成功加载。'
    });
  }
}

function handleSwitchModel(url: string) {
  updateModel(url);
}

function handleRemoveModel(pathToRemove: string) {
  const index = modelHistory.value.findIndex(path => path === pathToRemove);
  if (index !== -1) {
    modelHistory.value.splice(index, 1);
    localStorage.setItem('live2d_model_history', JSON.stringify(modelHistory.value));
  }

  // If the currently active model is the one being removed, switch to the default model.
  if (modelUrl.value === pathToRemove) {
    const defaultModel = '';
    modelUrl.value = defaultModel;
    localStorage.setItem('live2d_model_path', defaultModel);
    // Resize back to default if model is removed
    window.windowApi?.resizeWindow(440, 270)
  }
}


const mouseX = ref(0)
const mouseY = ref(0)

function handleMouseMove(event: MouseEvent) {
  mouseX.value = event.clientX
  mouseY.value = event.clientY
}

onMounted(async () => {
  window.addEventListener('mousemove', handleMouseMove)
  
  // Check if configuration exists
  const config = await window.secureStoreApi.getTapdConfig()
  
  // For development testing or if config is missing
  if (!config || !config.token || !config.workspaceId || !config.userName || showOnboarding.value) {
    showOnboarding.value = true
    // Resize window to accommodate the onboarding modal
    window.windowApi?.resizeWindow(450, 365)
  } else {
    // Initial size based on model presence
    if (modelUrl.value) {
      window.windowApi?.resizeWindow(640, 270)
    } else {
      window.windowApi?.resizeWindow(440, 270)
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
})

// --- Computed Properties ---
const formattedOnlineTime = computed(() => {
  const hours = Math.floor(gameState.onlineTimeInSeconds / 3600)
  const minutes = Math.floor((gameState.onlineTimeInSeconds % 3600) / 60)
  return `${hours}h${minutes}m`
})

const xpPercentage = computed(() => {
  if (gameState.xpForNextLevel === 0) return 0
  return (gameState.xp / gameState.xpForNextLevel) * 100
})

// --- Functions ---
function openSettings() {
  showSettings.value = true
}

function closeSettings() {
  showSettings.value = false
}

function saveAndCloseSettings() {
  showSettings.value = false
  fetchData()
}

function openShop() {
  showShop.value = true
}

function closeShop() {
  showShop.value = false
}

function handleOnboardingFinish() {
  if (modelUrl.value) {
    window.windowApi?.resizeWindow(640, 270)
  } else {
    window.windowApi?.resizeWindow(440, 270) // Restore default size
  }
  showOnboarding.value = false
  fetchData()
}

function handleSelectCharacter(modelUrl: string) {
  updateModel(modelUrl);
  closeShop(); // Close shop after selection
}

function toggleMinimize() {
  isMinimized.value = !isMinimized.value;
  if (isMinimized.value) {
    if (modelUrl.value) {
      window.windowApi?.resizeWindow(240, 270, 'right')
    } else {
      window.windowApi?.resizeWindow(60, 60, 'right')
    }
  } else {
    if (modelUrl.value) {
      window.windowApi?.resizeWindow(640, 270, 'right')
    } else {
      window.windowApi?.resizeWindow(440, 270, 'right')
    }
  }
}

function toggleInline() {
  inlineOpen.value = !inlineOpen.value
}

function getShortId(id: string) {
  return id?.length > 7 ? id.slice(-7) : id;
}

function openStoryDetail(story: TapdItem) {
  if (!workspaceId?.value) return
  const url = `https://www.tapd.cn/tapd_fe/${workspaceId.value}/story/detail/${story.id}`
  console.log('Generated URL:', url)
  try {
    window.shellApi.openUrl(url)
    console.log('shellApi.openUrl called successfully.')
  } catch (error) {
    console.error('Failed to open URL via shellApi:', error)
  }
}

async function handleRefresh() {
  if (tapdState.isLoading) return
  await fetchData()
}

async function copyStoryId(id: string) {
  try {
    await navigator.clipboard.writeText(id)
    console.log('Story ID copied to clipboard:', id)
  } catch (err) {
    console.error('Failed to copy text: ', err)
  }
}

function handleClaimReward(storyId: string) {
  claimTaskReward()
  claimStory(storyId) // Use the new claimStory function
}

function getStatusStyle(status: string) {
  switch (status) {
    case '预审通过':
      return { backgroundColor: 'rgba(255, 152, 0, 0.15)', color: '#FF7981' }; // #FF7981
    case '方案中':
      return { backgroundColor: 'rgba(255, 152, 0, 0.15)', color: '#FF9800' }; // Orange
    case '排期中':
      return { backgroundColor: 'rgba(33, 150, 243, 0.15)', color: '#2196F3' }; // Blue
    case '开发中':
      return { backgroundColor: 'rgba(76, 175, 80, 0.15)', color: '#4CAF50' }; // Green
    case '已提测':
    case '测试中':
      return { backgroundColor: 'rgba(139, 195, 74, 0.2)', color: '#8BC34A' }; // Light Green for claimable
    default:
      return { backgroundColor: 'rgba(158, 158, 158, 0.15)', color: '#9E9E9E' }; // Grey
  }
}
</script>

<template>
  <Live2DViewer :modelUrl="modelUrl" :mouseX="mouseX" :mouseY="mouseY" class="live2d-background" />
  <Onboarding v-if="showOnboarding" @finish="handleOnboardingFinish" />
  <Shop v-else-if="showShop" @close="closeShop" @select-character="handleSelectCharacter" :has-model="!!modelUrl" />
  <Settings v-else-if="showSettings" @close="closeSettings" @save-and-close="saveAndCloseSettings"
    @model-changed="handleModelChange" :model-history="modelHistory" @switch-model="handleSwitchModel"
    @remove-model="handleRemoveModel" :has-model="!!modelUrl" />
  <div v-else class="widget-container" :class="{ 'minimized': isMinimized, 'with-model': !!modelUrl }">
    <header class="header">
      <div class="title" @click="isMinimized && toggleMinimize()">
        <span>Lv.{{ gameState.level }}</span>
        <span class="header-stat">⚡️{{ Math.floor(gameState.energy) }}</span>
        <span class="header-stat">🪙{{ gameState.contribution }}</span>
      </div>
      <div class="header-buttons">
        <button @click.stop="handleRefresh" :disabled="tapdState.isLoading" class="settings-btn">
          <span :class="{ 'rotating': tapdState.isLoading }">🔄</span>
        </button>
        <button @click.stop="openShop" class="settings-btn">🛍️</button>
        <button @click.stop="toggleMinimize" class="settings-btn">—</button>
        <button @click.stop="openSettings" class="settings-btn">⚙️</button>
      </div>
    </header>

    <div class="xp-bar-container">
      <div class="xp-bar-fill" :style="{ width: xpPercentage + '%' }"></div>
      <div class="xp-text">{{ gameState.xp }} / {{ gameState.xpForNextLevel }}</div>
    </div>

    <main class="main-content">
      <div v-if="tapdState.error" class="error-message">
        {{ tapdState.error }}
      </div>
      <template v-else>
        <div class="info-row" @click="toggleInline">
          <span>📜 需求</span>
          <span>{{ storyCount }}</span>
        </div>
        <ul v-if="inlineOpen" class="story-list">
          <li v-for="story in stories" :key="story.id" class="story-item">
            <div class="story-details" @click="openStoryDetail(story)">
              <div class="story-id" @click.stop="copyStoryId(getShortId(story.id))">{{ getShortId(story.id) }}</div>
              <div class="story-name">{{ story.name }}</div>
              <div class="story-status" :style="getStatusStyle(story.v_status)">{{ story.gamified_status }}</div>
            </div>
            <div class="story-actions">
              <button v-if="story.is_claimable" @click.stop="handleClaimReward(story.id)" class="claim-btn">领取</button>
              <div v-else class="story-owner">{{ story.owner }}</div>
            </div>
          </li>
        </ul>

        <!-- Claimed Stories Section -->
        <div class="info-row" @click="claimedOpen = !claimedOpen">
          <span>🏆 已领取</span>
          <span>{{ claimedStories.length }}</span>
        </div>
        <ul v-if="claimedOpen" class="story-list">
          <li v-for="story in claimedStories" :key="story.id" class="story-item claimed-item">
            <div class="story-details" @click="openStoryDetail(story)">
              <div class="story-id">{{ getShortId(story.id) }}</div>
              <div class="story-name">{{ story.name }}</div>
              <div class="story-status" :style="getStatusStyle(story.v_status)">{{ story.gamified_status }}</div>
            </div>
            <div class="story-actions">
              <div class="story-owner">{{ story.owner }}</div>
            </div>
          </li>
        </ul>
      </template>
    </main>

    <footer class="footer">
      <span>{{ latestEventMessage || gameState.statusText }}</span>
      <span>{{ formattedOnlineTime }}</span>
    </footer>
  </div>
</template>

<style scoped>
.widget-container {
  display: flex;
  flex-direction: column;
  position: fixed;
  /* Positioned to the left of the Live2D character */
  bottom: 0px;
  width: 425px;
  height: 95%;
  max-height: 600px;
  /* Added max-height for better scaling */
  font-size: 14px;
  background-color: rgba(36, 36, 36, 0.85);
  border-radius: 8px;
  padding: 8px 12px 12px 12px;
  box-sizing: border-box;
  transition: all 0.4s ease-in-out;
  transform-origin: top right;
  /* Set transform origin for scaling */
}

.widget-container.minimized {
  /* Position at the character's left edge */
  top: 0px;
  /* Position near the character's top edge */
  width: 42px;
  height: 42px;
  border-radius: 50%;
  overflow: hidden;
  -webkit-app-region: drag;
  background-color: rgba(36, 36, 36, 0.85);
}

.widget-container.minimized .header {
  height: 100%;
  width: 100%;
  padding: 0;
  align-items: center;
  justify-content: center;
  -webkit-app-region: no-drag;
}

.widget-container.with-model {
  right: 210px;
}

.widget-container.with-model.minimized {
  right: 190px;
}

.widget-container.minimized .header .title {
  cursor: pointer;
  font-size: 14px;
}

.widget-container.minimized .header .header-stat,
.widget-container.minimized .header .header-buttons,
.widget-container.minimized .xp-bar-container,
.widget-container.minimized .main-content,
.widget-container.minimized .footer {
  display: none;
}

.header {
  -webkit-app-region: drag;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #ccc;
  font-weight: bold;
  padding: 0px 12px;
}

.title {
  display: flex;
  gap: 12px;
  align-items: center;
}

.header-stat {
  font-size: 12px;
  font-weight: normal;
  color: #a0a0a0;
}

.header-buttons {
  -webkit-app-region: no-drag;
  display: flex;
  gap: 4px;
}

.settings-btn {
  background: none;
  border: none;
  color: #ccc;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.settings-btn span.rotating {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.xp-bar-container {
  position: relative;
  height: 20px;
  background-color: rgba(0, 0, 0, 0.3);
  margin: 2px 8px 0px;
  border-radius: 3px;
  overflow: hidden;
}

.xp-bar-fill {
  height: 100%;
  background-color: #4CAF50;
  transition: width 0.5s ease;
}

.xp-text {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 8px;
  color: white;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.7);
}

.main-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 8px;
  overflow: hidden;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.info-row:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.error-message {
  color: #ff8a80;
  text-align: center;
  padding: 8px;
  font-size: 12px;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 12px;
  font-size: 12px;
  color: #a0a0a0;
}

.story-list {
  list-style: none;
  padding: 6px 4px 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  flex: 1;
}

.story-item {
  display: grid;
  grid-template-columns: 1fr 60px;
  gap: 8px;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.25);
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: background-color 0.2s, opacity 0.2s;
}

.story-details {
  display: grid;
  grid-template-columns: 40px 1fr 80px;
  gap: 4px;
  align-items: center;
  overflow: hidden;
  cursor: pointer;
}

.story-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.claimed-item {
  opacity: 0.6;
}

.claimed-item:hover {
  opacity: 1;
}

.story-id {
  color: #888;
  font-family: monospace;
  font-size: 10px;
}

.story-name {
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-name:hover {
  text-indent: -100%;
  transition: text-indent 2s linear;
}

.story-status {
  text-align: center;
  font-size: 11px;
  padding: 2px 0px;
  border-radius: 4px;
}

.story-actions {
  display: flex;
  justify-content: flex-end;
}

.story-owner {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #aaa;
  text-align: right;
  font-size: 11px;
}

.claim-btn {
  background-color: #4caf4f81;
  color: #c8e6c9;
  border: 1px solid #c8e6c94d;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.claim-btn:hover {
  background-color: #66bb6a8f;
}

.story-list::-webkit-scrollbar {
  display: none;
}

.live2d-background {
  position: fixed;
  right: 0;
  bottom: 0;
  width: 400px;
  height: 400px;
  pointer-events: none;
  /* Make container click-through */
}
</style>