<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

defineProps({
  modelHistory: {
    type: Array as () => string[],
    default: () => []
  }
})

const emit = defineEmits(['close', 'save-and-close', 'model-changed', 'switch-model', 'remove-model'])

function removeModel(path: string) {
  emit('remove-model', path)
}

function switchModel(path: string) {
  emit('switch-model', path)
}

function getModelName(path: string) {
  // Extracts the model's parent folder name from a path like 'local-resource:///C:/path/to/model/Asuka.model3.json'
  const parts = path.split('/');
  if (parts.length > 2) {
    return parts[parts.length - 2];
  }
  return 'Unknown Model';
}

const modelPath = ref('')

async function importModel() {
  const path = await window.electronApi.openFileDialog()
  if (path) {
    modelPath.value = path
    emit('model-changed', path)
  }
}

const apiToken = ref('')
const userName = ref('')
const workspaceId = ref('')
const userRoleField = ref('custom_field_17') // Default to '前端开发'

const workspaceOptions = [
  { label: '腾小宝_AI打卡机_AI手办', value: '37053117' },
  { label: '小铁台球', value: '44773172' },
  { label: '小铁寄存柜3.0项目组', value: '53146439' },
  { label: '其他', value: 'other' }
];
const isOtherWorkspace = ref(false);
const customWorkspaceId = ref('');

const roleOptions = [
  { value: 'custom_field_9', label: '产品经理' },
  { value: 'custom_field_10', label: '测试人员' },
  { value: 'custom_field_17', label: '前端开发' },
  { value: 'custom_field_18', label: '后端开发' },
  { value: 'custom_field_19', label: '终端开发' },
]

// When the component is mounted, try to load the existing config.
onMounted(async () => {
  const originalConfig = await window.secureStoreApi.getTapdConfig();
  if (originalConfig) {
    const config = JSON.parse(JSON.stringify(originalConfig));
    apiToken.value = config.token || '';
    userName.value = config.userName || '';
    const savedWorkspaceId = config.workspaceId || '';
    const isPredefined = workspaceOptions.some(option => option.value === savedWorkspaceId);

    if (isPredefined) {
      workspaceId.value = savedWorkspaceId;
      isOtherWorkspace.value = false;
    } else if (savedWorkspaceId) {
      workspaceId.value = 'other'; // Set dropdown to '其他'
      isOtherWorkspace.value = true;
      customWorkspaceId.value = savedWorkspaceId;
    }
    userRoleField.value = config.userRoleField || 'custom_field_17';
  }
})

async function openTapdTokenUrl() {
  window.shellApi.openUrl('https://www.tapd.cn/personal_settings/index?tab=personal_token');
}

async function saveSettings() {
  if (!apiToken.value || !workspaceId.value || !userName.value) {
    window.electronApi.showNotification({ title: '保存失败', body: '请填写所有必填项：TAPD Access Token, TAPD Workspace ID, and TAPD User Name.' });
    return;
  }
  const finalWorkspaceId = workspaceId.value === 'other' ? customWorkspaceId.value : workspaceId.value;
  const configToSave = {
    token: apiToken.value,
    userName: userName.value,
    workspaceId: finalWorkspaceId,
    userRoleField: userRoleField.value,
  }
  console.log('Saving config from Settings.vue:', configToSave)
  window.secureStoreApi.setTapdConfig(configToSave)
  emit('save-and-close')
}
watch(workspaceId, (newVal) => {
  isOtherWorkspace.value = newVal === 'other';
});
</script>

<template>
  <div class="settings-container">
    <header class="settings-header">
      <h3>设置</h3>
      <button @click="$emit('close')" class="close-btn">×</button>
    </header>
    <main class="settings-content">
      <div class="form-group">
        <label for="api-token">TAPD Access Token <span @click="openTapdTokenUrl" class="icon-link">🔗</span></label>
        <input id="api-token" type="password" v-model="apiToken" placeholder="请输入你的 TAPD Token" />
        <small>您的 Token 将被加密并存储在本地。</small>
      </div>
      <div class="form-group">
        <label for="workspace-id">TAPD Workspace ID</label>
        <select id="workspace-id" v-model="workspaceId">
          <option v-for="option in workspaceOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <input v-if="isOtherWorkspace" type="text" v-model="customWorkspaceId" placeholder="请输入你的 TAPD Workspace ID" />
        <small>TAPD 项目的空间 ID。</small>
      </div>
      <div class="form-group">
        <label for="user-role">TAPD Role & User Name</label>
        <div class="form-group-inline">
          <select id="user-role" v-model="userRoleField">
            <option v-for="role in roleOptions" :key="role.value" :value="role.value">
              {{ role.label }}
            </option>
          </select>
          <input id="user-name" type="text" v-model="userName" placeholder="请输入你的 TAPD 用户名"
            :disabled="!userRoleField" />
        </div>
        <small>选择角色，然后输入对应的 TAPD 用户名进行筛选。</small>
      </div>
      <div class="form-group">
        <label for="live2d-model">Live2D Model</label>
        <button @click="importModel">导入 Live2D 模型</button>
        <small>选择一个包含 .model3.json 文件的文件夹来加载你的 Live2D 模型。</small>
      </div>
      <div class="form-group">
        <label>历史模型</label>
        <ul class="history-list">
          <li v-for="(path, index) in modelHistory" :key="index" @click="switchModel(path)">
            <span>{{ getModelName(path) }}</span>
            <button class="remove-btn" @click.stop="removeModel(path)">×</button>
          </li>
        </ul>
      </div>
    </main>
    <footer class="settings-footer">
      <button @click="saveSettings" class="save-btn">保存并关闭</button>
    </footer>
  </div>
</template>

<style scoped>
.settings-container {
  display: flex;
  flex-direction: column;
  position: fixed;
  right: 210px;
  bottom: 0px;
  width: 425px;
  height: 95%;
  max-height: 600px;
  font-size: 14px;
  padding: 12px;
  box-sizing: border-box;
  background-color: rgba(36, 36, 36, 0.85);
  border-radius: 8px;
  z-index: 200;
  -webkit-app-region: drag;
  /* Ensure settings are on top */
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 16px;
  padding: 0px 8px 8px 8px;

}

.settings-header h3 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #ccc;
  font-size: 20px;
  cursor: pointer;
  -webkit-app-region: no-drag;
}

.settings-content {
  flex-grow: 1;
  overflow-y: auto;
  padding: 8px 8px;
  -webkit-app-region: no-drag;
  /* Enable vertical scrolling */
}

.settings-content::-webkit-scrollbar {
  display: none;
  /* Hide scrollbar for Chrome, Safari and Opera */
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
  /* Add some space between form groups */
}

.form-group:last-of-type {
  margin-bottom: 0;
}

.form-group label {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
  color: #a0a0a0;
}

.form-group input,
.form-group select {
  padding: 8px;
  background-color: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  color: #fff;
  margin-bottom: 8px;
}

.form-group small {
  font-size: 12px;
  color: #888;
}

.settings-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 8px;
}

.save-btn {
  padding: 8px 16px;
  background-color: #535bf2;
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  -webkit-app-region: no-drag;
}

.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 150px;
  /* Or any other height */
  overflow-y: auto;
  border: 1px solid #333;
  border-radius: 4px;
}

.history-list li {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #333;
  font-size: 12px;
  color: #ccc;
  transition: background-color 0.2s;
}

.history-list li:last-child {
  border-bottom: none;
}

.history-list li:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.history-list::-webkit-scrollbar {
  display: none;
  /* Hide scrollbar for Chrome, Safari and Opera */
}

.history-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.remove-btn {
  background: none;
  border: none;
  color: #ccc;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.remove-btn:hover {
  opacity: 1;
  color: #ff8a80;
  /* A light red to indicate deletion */
}



.icon-link {
  cursor: pointer;
  font-size: 16px;
  color: #ccc;
}

.icon-link:hover {
  color: #fff;
}
</style>