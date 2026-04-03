import { reactive, computed } from 'vue';
import { useGame } from './composables/useGame';

// Access global game state and spending function
const { state: gameState, spendContribution } = useGame();

// Character data (could be fetched from server/config later)
interface Character {
  id: number;
  name: string;
  cost: number;
  modelUrl: string;
  preview: string;
}

const CHARACTERS_CACHE_KEY = 'afk_characters_cache_v1';
const CHARACTERS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CHARACTER_SOURCE_URLS = [
  'https://fastly.jsdelivr.net/gh/jynba/live2d-assets@latest/characters.json',
  'https://cdn.jsdelivr.net/gh/jynba/live2d-assets@latest/characters.json',
  'https://raw.githubusercontent.com/jynba/live2d-assets/main/characters.json',
];

const defaultCharacters: Character[] = [
  {
    id: 4,
    name: 'Hamster',
    cost: 3000,
    modelUrl: 'https://fastly.jsdelivr.net/gh/jynba/live2d-assets/Hamster/Hamster.model3.json',
    preview: 'https://fastly.jsdelivr.net/gh/jynba/live2d-assets/Hamster/preview.jpg'
  },
];


const PURCHASED_KEY = 'afk_purchased_chars';

function normalizeAssetUrl(url: string): string {
  return url.replace(
    /^https:\/\/raw\.githubusercontent\.com\/jynba\/live2d-assets\/([^/]+)\/(.+)$/i,
    'https://fastly.jsdelivr.net/gh/jynba/live2d-assets@$1/$2'
  );
}

function normalizeCharacter(character: Character): Character {
  return {
    ...character,
    modelUrl: normalizeAssetUrl(character.modelUrl),
    preview: normalizeAssetUrl(character.preview),
  };
}

function isValidCharacter(character: unknown): character is Character {
  if (!character || typeof character !== 'object') return false;

  const candidate = character as Record<string, unknown>;
  return typeof candidate.id === 'number'
    && typeof candidate.name === 'string'
    && typeof candidate.cost === 'number'
    && typeof candidate.modelUrl === 'string'
    && typeof candidate.preview === 'string';
}

function saveCharactersCache(characters: Character[]) {
  localStorage.setItem(CHARACTERS_CACHE_KEY, JSON.stringify({
    fetchedAt: Date.now(),
    characters,
  }));
}

function loadCharactersCache(): Character[] | null {
  try {
    const savedStr = localStorage.getItem(CHARACTERS_CACHE_KEY);
    if (!savedStr) return null;

    const saved = JSON.parse(savedStr) as {
      fetchedAt?: number;
      characters?: unknown;
    };

    if (!saved.fetchedAt || Date.now() - saved.fetchedAt > CHARACTERS_CACHE_TTL_MS) {
      return null;
    }

    if (!Array.isArray(saved.characters)) return null;

    const characters = saved.characters
      .filter(isValidCharacter)
      .map(normalizeCharacter);

    return characters.length > 0 ? characters : null;
  } catch (_) {
    return null;
  }
}

async function fetchCharacterList(): Promise<Character[]> {
  for (const url of CHARACTER_SOURCE_URLS) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('characters.json is not an array');
      }

      const characters = data
        .filter(isValidCharacter)
        .map(normalizeCharacter);

      if (characters.length > 0) {
        return characters;
      }
    } catch (error) {
      console.warn('Failed to fetch characters from source:', url, error);
    }
  }

  throw new Error('All character sources failed');
}

function loadPurchased(): number[] {
  try {
    const savedStr = localStorage.getItem(PURCHASED_KEY);
    if (!savedStr) return [];
    const saved = JSON.parse(savedStr);
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (_) { }
  return []; // No default characters
}

function persistPurchased(ids: number[]) {
  localStorage.setItem(PURCHASED_KEY, JSON.stringify(ids));
}


// Reactive state (only purchased list lives here; contribution comes from gameState)
const store = reactive({
  characters: defaultCharacters as Character[],
  purchasedCharacterIds: loadPurchased() as number[],
  isLoadingCharacters: false,
});


// Actions
const actions = {
  async fetchCharacters() {
    if (store.isLoadingCharacters) return;
    store.isLoadingCharacters = true;
    try {
      const cachedCharacters = loadCharactersCache();
      if (cachedCharacters) {
        store.characters = cachedCharacters;
      }

      const characters = await fetchCharacterList();
      store.characters = characters;
      saveCharactersCache(characters);
      console.log('Characters loaded from CDN source');
    } catch (error) {
      console.warn('Failed to fetch characters, using cached/default data:', error);
    } finally {
      store.isLoadingCharacters = false;
    }
  },

  purchaseCharacter(characterId: number) {
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
  isPurchased: (id: number) => store.purchasedCharacterIds.includes(id),
  getContributionPoints: computed(() => gameState.contribution),
  isLoadingCharacters: computed(() => store.isLoadingCharacters),
};

export function useStore() {
  return { ...store, ...actions, ...getters };
}
