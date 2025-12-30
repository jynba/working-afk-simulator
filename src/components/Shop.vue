<script setup>
import { useStore } from '../store';

const {
  availableCharacters,
  getContributionPoints,
  isPurchased,
  purchaseCharacter
} = useStore();

const emit = defineEmits(['close', 'select-character']);

function handlePurchase(character) {
  const success = purchaseCharacter(character.id);
  if (success) {
    emit('select-character', character.modelUrl);
  }
}

function handleSelect(character) {
  emit('select-character', character.modelUrl);
}

</script>

<template>
  <div class="shop-container">
    <header class="shop-header">
      <h3>角色商店</h3>
      <button @click="$emit('close')" class="close-btn">×</button>
    </header>
    <main class="shop-content">
      <div class="shop-subheader">
        <span>你的贡献点: 🪙{{ getContributionPoints }}</span>
      </div>
      <div class="character-grid">
        <div v-for="char in availableCharacters" :key="char.id" class="character-card">
          <div class="character-preview-wrapper">
            <img :src="char.preview" :alt="char.name" class="character-preview" />
          </div>
          <div class="character-info">
            <h4 class="character-name">{{ char.name }}</h4>
            <p class="character-cost">🪙{{ char.cost }}</p>
          </div>
          <div class="character-actions">
            <button v-if="isPurchased(char.id)" @click="handleSelect(char)" class="btn-select">
              选择
            </button>
            <button v-else :disabled="getContributionPoints < char.cost" @click="handlePurchase(char)"
              class="btn-purchase">
              购买
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.shop-container {
  display: flex;
  flex-direction: column;
  position: fixed;
  right: 210px;
  bottom: 0px;
  width: 425px;
  height: 95%;
  max-height: 600px;
  font-size: 12px;
  padding: 10px;
  box-sizing: border-box;
  background-color: rgba(36, 36, 36, 0.85);
  border-radius: 8px;
  z-index: 200;
  -webkit-app-region: drag;
}

.shop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 8px;
  padding: 0px 8px 8px 8px;
  color: #e0e0e0;
}

.shop-header h3 {
  margin: 0;
  font-size: 16px;
}

.close-btn {
  background: none;
  border: none;
  color: #ccc;
  font-size: 22px;
  cursor: pointer;
  -webkit-app-region: no-drag;
}

.shop-content {
  flex-grow: 1;
  overflow-y: auto;
  padding: 0 8px;
  -webkit-app-region: no-drag;
}

.shop-subheader {
  padding: 6px;
  margin-bottom: 10px;
  text-align: center;
  background-color: rgba(0, 0, 0, 0.2);
  color: #e0e0e0;
  font-size: 12px;
  border-radius: 4px;
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.character-card {
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.character-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
}

.character-preview-wrapper {
  height: 120px;
  width: 120px;
  background-color: #444;
  display: flex;
  align-items: center;
  justify-content: center;
}

.character-preview {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.character-info {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px;
  text-align: center;
}

.character-name {
  margin: 0 0 2px 0;
  font-size: 12px;
  color: #e0e0e0;
  font-weight: 600;
}

.character-cost {
  margin: 0;
  font-size: 10px;
  color: #f0c43a;
  /* Gold color for cost */
}

.character-actions {
  padding: 0 12px 12px 12px;
  margin-top: auto;
}

.character-actions button {
  width: 100%;
  padding: 4px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s;
}

.btn-select {
  background-color: #4CAF50;
  color: white;
  font-size: 12px;
}

.btn-select:hover {
  background-color: #5cb85c;
}

.btn-purchase {
  background-color: #2196F3;
  color: white;
  font-size: 12px;
}

.btn-purchase:hover {
  background-color: #42a5f5;
}

.btn-purchase:disabled {
  background-color: #555;
  color: #888;
  cursor: not-allowed;
}

/* Custom scrollbar */
.shop-content::-webkit-scrollbar {
  width: 6px;
}

.shop-content::-webkit-scrollbar-track {
  background: transparent;
}

.shop-content::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;
}

.shop-content::-webkit-scrollbar-thumb:hover {
  background: #666;
}
</style>