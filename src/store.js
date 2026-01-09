import { reactive, computed } from 'vue';
import { useGame } from './composables/useGame';

// Access global game state and spending function
const { state: gameState, spendContribution } = useGame();

// Character data (could be fetched from server/config later)
const defaultCharacters = [
  {
    id: 4,
    name: 'Hamster',
    cost: 3000,
    modelUrl: 'https://fastly.jsdelivr.net/gh/jynba/live2d-assets/Hamster/Hamster.model3.json',
    preview: 'https://fastly.jsdelivr.net/gh/jynba/live2d-assets/Hamster/preview.jpg'
  },
];

const PURCHASED_KEY = 'afk_purchased_chars';

function loadPurchased() {
  try {
    const saved = JSON.parse(localStorage.getItem(PURCHASED_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (_) { }
  return []; // No default characters
}

function persistPurchased(ids) {
  localStorage.setItem(PURCHASED_KEY, JSON.stringify(ids));
}

// Reactive state (only purchased list lives here; contribution comes from gameState)
const store = reactive({
  characters: defaultCharacters,
  purchasedCharacterIds: loadPurchased(),
  isLoadingCharacters: false,
});

// Actions
const actions = {
  async fetchCharacters() {
    if (store.isLoadingCharacters) return;
    store.isLoadingCharacters = true;
    try {
      // Get latest release tag from GitHub API
      const latestRelease = await fetch("https://api.github.com/repos/jynba/live2d-assets/releases/latest")
        .then(res => {
          if (!res.ok) throw new Error('GitHub API error');
          return res.json();
        });

      const tag = latestRelease.tag_name;
      // Using raw.githubusercontent.com as requested
      const url = `https://raw.githubusercontent.com/jynba/live2d-assets/${tag}/characters.json`;

      console.log('Fetching characters from latest release tag:', tag);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch characters.json from release');

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        store.characters = data;
        console.log('Characters loaded dynamically from release:', tag);
      }
    } catch (error) {
      console.warn('Failed to fetch characters from release, using defaults:', error);
    } finally {
      store.isLoadingCharacters = false;
    }
  },

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
  isLoadingCharacters: computed(() => store.isLoadingCharacters),
};

export function useStore() {
  return { ...store, ...actions, ...getters };
}
