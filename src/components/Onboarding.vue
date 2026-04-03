<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { setTapdConfig, openExternalUrl } from '../utils/platformBridge'

const emit = defineEmits(['finish'])

const step = ref(1)
const totalSteps = 4

// State
const apiToken = ref('')
const workspaceId = ref('37053117') // Default to one of the options
const customWorkspaceId = ref('')
const isOtherWorkspace = ref(false)
const userRoleField = ref('custom_field_17')
const userName = ref('')

const workspaceOptions = [
  { label: '腾小宝_AI打卡机_AI手办', value: '37053117' },
  { label: '小铁台球', value: '44773172' },
  { label: '小铁寄存柜3.0项目组', value: '53146439' },
  { label: '其他', value: 'other' }
]

const roleOptions = [
  { value: 'custom_field_9', label: '产品经理' },
  { value: 'custom_field_10', label: '测试人员' },
  { value: 'custom_field_17', label: '前端开发' },
  { value: 'custom_field_18', label: '后端开发' },
  { value: 'custom_field_19', label: '终端开发' },
]

// Navigation
function nextStep() {
  if (cantProceed.value) return
  if (step.value < totalSteps) {
    step.value++
  }
}

function prevStep() {
  if (step.value > 1) {
    step.value--
  }
}

async function finish() {
    if (cantProceed.value) return;

    const finalWorkspaceId = workspaceId.value === 'other' ? customWorkspaceId.value : workspaceId.value;
    // Ensure all fields are present to avoid partial config issues
    const configToSave = {
        token: apiToken.value,
        userName: userName.value,
        workspaceId: finalWorkspaceId,
        userRoleField: userRoleField.value,
    }
    
    try {
      await setTapdConfig(configToSave)
      emit('finish')
    } catch (e) {
      console.error('Failed to save config:', e)
      // Ideally show an error message to the user
    }
}

function openTapdTokenUrl() {
  openExternalUrl('https://www.tapd.cn/personal_settings/index?tab=personal_token');
}

watch(workspaceId, (newVal) => {
  isOtherWorkspace.value = newVal === 'other';
});

// Computed for validation to disable Next button
const cantProceed = computed(() => {
    if (step.value === 2) return !apiToken.value.trim()
    if (step.value === 3) return workspaceId.value === 'other' ? !customWorkspaceId.value.trim() : !workspaceId.value
    if (step.value === 4) return !userName.value.trim()
    return false
})
</script>

<template>
  <div class="onboarding-overlay">
    <div class="onboarding-modal">
      <div class="step-indicator">
        <span v-for="i in totalSteps" :key="i" :class="{ active: i <= step }"></span>
      </div>

      <div class="step-content">
        <!-- Step 1: Welcome -->
        <div v-if="step === 1" class="step-slide">
          <h2>欢迎使用 Working AFK Simulator</h2>
          <p>这是一个帮助您在工作时保持“忙碌”状态的 AI 助手。为了让它正常工作，我们需要配置一些 TAPD 的基本信息。</p>
          <div class="hero-icon">🎮</div>
        </div>

        <!-- Step 2: Access Token -->
        <div v-else-if="step === 2" class="step-slide">
          <h3>配置 Access Token</h3>
          <p>我们需要您的 TAPD Access Token 来获取需求列表。</p>
          <div class="form-group">
            <label>TAPD Access Token <span @click="openTapdTokenUrl" class="icon-link" title="获取 Token">🔗</span></label>
            <input type="password" v-model="apiToken" placeholder="粘贴您的 Token" />
            <small>点击链接去 TAPD 获取个人令牌。</small>
          </div>
        </div>

        <!-- Step 3: Workspace -->
        <div v-else-if="step === 3" class="step-slide">
          <h3>选择项目空间</h3>
          <p>请选择您主要工作的 TAPD 项目空间。</p>
          <div class="form-group">
            <label>Workspace ID</label>
            <select v-model="workspaceId">
              <option v-for="option in workspaceOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <input v-if="isOtherWorkspace" type="text" v-model="customWorkspaceId" placeholder="输入 Workspace ID" class="mt-2"/>
          </div>
        </div>

        <!-- Step 4: Identity -->
        <div v-else-if="step === 4" class="step-slide">
          <h3>确认身份</h3>
          <p>告诉我们您的角色和姓名，以便筛选属于您的需求。</p>
          <div class="form-group">
            <label>角色类型</label>
            <select v-model="userRoleField">
              <option v-for="role in roleOptions" :key="role.value" :value="role.value">
                {{ role.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>TAPD 用户名</label>
            <input type="text" v-model="userName" placeholder="例如：张三" />
          </div>
        </div>
      </div>

      <div class="step-actions">
        <button v-if="step > 1" @click="prevStep" class="secondary-btn">上一步</button>
        <div class="spacer"></div>
        <button v-if="step < totalSteps" @click="nextStep" class="primary-btn" :disabled="cantProceed">下一步</button>
        <button v-else @click="finish" class="primary-btn" :disabled="cantProceed">保存并开始</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.onboarding-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
  -webkit-app-region: drag;
}

.onboarding-modal {
  background-color: #242424;
  width: 400px;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.step-indicator {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 10px;
}

.step-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #444;
  transition: all 0.3s ease;
}

.step-indicator span.active {
  background-color: #535bf2;
  transform: scale(1.2);
}

.step-content {
  min-height: 200px;
  color: #eee;
}

.step-slide h2, .step-slide h3 {
  margin-top: 0;
  color: #fff;
  text-align: center;
}

.step-slide p {
  color: #aaa;
  font-size: 14px;
  line-height: 1.5;
  text-align: center;
  margin-bottom: 20px;
}

.hero-icon {
  font-size: 64px;
  text-align: center;
  margin-top: 20px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
    -webkit-app-region: no-drag;

}

.form-group label {
  font-size: 12px;
  color: #888;
  display: flex;
  justify-content: space-between;
}

.form-group input, .form-group select {
  padding: 10px;
  background-color: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus, .form-group select:focus {
  border-color: #535bf2;
  outline: none;
}

.form-group small {
  font-size: 11px;
  color: #666;
}

.mt-2 {
  margin-top: 8px;
}

.icon-link {
  cursor: pointer;
  text-decoration: none;
}

.step-actions {
  display: flex;
  gap: 12px;
  margin-top: auto;
  -webkit-app-region: no-drag;
}

.spacer {
  flex: 1;
}

.primary-btn, .secondary-btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.primary-btn {
  background-color: #535bf2;
  color: white;
}

.primary-btn:hover:not(:disabled) {
  background-color: #4a51d3;
}

.primary-btn:disabled {
  background-color: #333;
  color: #666;
  cursor: not-allowed;
}

.secondary-btn {
  background-color: transparent;
  color: #aaa;
  border: 1px solid #333;
}

.secondary-btn:hover {
  border-color: #666;
  color: #fff;
}
</style>
