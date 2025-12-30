import { reactive, computed } from 'vue';
import { useGame } from './composables/useGame';

// Access global game state and spending function
const { state: gameState, spendContribution } = useGame();

// Character data (could be fetched from server/config later)
const characters = [
  {
    id: 1,
    name: 'Asuka',
    cost: 3000,
    modelUrl: 'https://fastly.jsdelivr.net/gh/jynba/live2d-assets/ASUKA/ASUKA/Asuka.model3.json',
    preview: 'https://fastly.jsdelivr.net/gh/jynba/live2d-assets/ASUKA/ASUKA/ICON.PNG'
  },
  {
    id: 4,
    name: 'Hamster',
    cost: 3000,
    modelUrl: 'https://fastly.jsdelivr.net/gh/jynba/live2d-assets/Hamster/Hamster.model3.json',
    preview: 'https://fastly.jsdelivr.net/gh/jynba/live2d-assets/Hamster/preview.jpg'
  },
  {
    id: 5,
    name: 'Takodachi',
    cost: 3000,
    modelUrl: 'https://fastly.jsdelivr.net/gh/jynba/live2d-assets/Takodachi/Takodachi/takodachi.model3.json',
    preview: 'https://fastly.jsdelivr.net/gh/jynba/live2d-assets/Takodachi/Takodachi/preivew.png'
  },
  {
    id: 2,
    name: 'ANIYA',
    cost: 4500,
    modelUrl: 'https://fastly.jsdelivr.net/gh/jynba/live2d-assets/ANIYA/ANIYA/ANIYA.model3.json',
    preview: 'https://fastly.jsdelivr.net/gh/jynba/live2d-assets/ANIYA/ANIYA/1.png'
  },
  {
    id: 3,
    name: 'Zero',
    cost: 4500,
    modelUrl: 'https://fastly.jsdelivr.net/gh/jynba/live2d-assets/L2DZero_V1.02/L2DZero_V1.02/L2DZeroVS.model3.json',
    preview: 'https://fastly.jsdelivr.net/gh/jynba/live2d-assets/L2DZero_V1.02/L2DZero_V1.02/icon_L2DZeroVS.png'
  },
  {
    id: 6,
    name: 'IceGIrl',
    cost: 4500,
    modelUrl: 'https://fastly.jsdelivr.net/gh/jynba/live2d-assets/IceGirl_Live2d/IceGIrl%20Live2D/IceGirl.model3.json',
    preview: 'https://fastly.jsdelivr.net/gh/jynba/live2d-assets/IceGirl_Live2d/IceGIrl%20Live2D/icon.jpg'
  },
  {
    id: 7,
    name: 'White',
    cost: 8000,
    modelUrl: 'https://fastly.jsdelivr.net/gh/jynba/live2d-assets/神宫白子公皮/神宫白子/神宫白子模型/面饼0.model3.json',
    preview: 'https://fastly.jsdelivr.net/gh/jynba/live2d-assets/神宫白子公皮/神宫白子/神宫白子模型/preview.png'
  },
];

const PURCHASED_KEY = 'afk_purchased_chars';

function loadPurchased() {
  try {
    const saved = JSON.parse(localStorage.getItem(PURCHASED_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (_) { }
  return [1]; // default Asuka
}

function persistPurchased(ids) {
  localStorage.setItem(PURCHASED_KEY, JSON.stringify(ids));
}

// Reactive state (only purchased list lives here; contribution comes from gameState)
const store = reactive({
  characters,
  purchasedCharacterIds: loadPurchased(),
});

// Actions
const actions = {
  purchaseCharacter(characterId) {
    const char = store.characters.find(c => c.id === characterId);
    if (!char) return false;
    if (store.purchasedCharacterIds.includes(characterId)) return false;

    if (spendContribution(char.cost)) {
      store.purchasedCharacterIds.push(characterId);
      persistPurchased(store.purchasedCharacterIds);
      return true;
    }
    return false;
  },
};

// Getters
const getters = {
  availableCharacters: computed(() => store.characters),
  purchasedCharacters: computed(() => store.characters.filter(c => store.purchasedCharacterIds.includes(c.id))),
  isPurchased: (id) => store.purchasedCharacterIds.includes(id),
  getContributionPoints: computed(() => gameState.contribution),
};

export function useStore() {
  return { ...store, ...actions, ...getters };
}
