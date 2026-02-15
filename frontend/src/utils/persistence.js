// Persistence utilities for localStorage with debouncing

const STORAGE_KEYS = {
  WORKSPACE_MODULES: 'steward_workspace_modules',
  DEFERRED_MODULES: 'steward_deferred_modules',
  NOTES: 'steward_notes',
  TASKS: 'steward_tasks',
  CONTACTS: 'steward_contacts',
  PROJECTS: 'steward_projects',
  FOCUSED_MODULE: 'steward_focused_module',
  ACTIVE_WORKZONE: 'steward_active_workzone',
  SAVED_LAYOUTS: 'steward_saved_layouts',
  TRASH_ITEMS: 'steward_trash_items',
  MUSIC_LIBRARY: 'steward_music_library',
  MUSIC_PLAYLISTS: 'steward_music_playlists',
  TIMER_STATE: 'steward_timer_state',
};

// Debounce timers
const debounceTimers = {};

/**
 * Save data to localStorage with debouncing
 * @param {string} key - Storage key
 * @param {any} data - Data to save
 * @param {number} delay - Debounce delay in ms (default 500ms)
 */
export const saveToStorage = (key, data, delay = 500) => {
  // Clear existing timer
  if (debounceTimers[key]) {
    clearTimeout(debounceTimers[key]);
  }
  
  // Set new timer
  debounceTimers[key] = setTimeout(() => {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
      // console.log(`[Persistence] Saved ${key}:`, data?.length || 'object');
    } catch (error) {
      console.error(`[Persistence] Error saving ${key}:`, error);
    }
  }, delay);
};

/**
 * Load data from localStorage
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} - Parsed data or default value
 */
export const loadFromStorage = (key, defaultValue = null) => {
  try {
    const serialized = localStorage.getItem(key);
    if (serialized === null) {
      return defaultValue;
    }
    const parsed = JSON.parse(serialized);
    // console.log(`[Persistence] Loaded ${key}:`, parsed?.length || 'object');
    return parsed;
  } catch (error) {
    console.error(`[Persistence] Error loading ${key}:`, error);
    return defaultValue;
  }
};

/**
 * Remove data from localStorage
 * @param {string} key - Storage key
 */
export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`[Persistence] Error removing ${key}:`, error);
  }
};

/**
 * Clear all Steward data from localStorage
 */
export const clearAllStorage = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    removeFromStorage(key);
  });
  console.log('[Persistence] All data cleared');
};

/**
 * Get storage usage info
 * @returns {object} - Storage usage statistics
 */
export const getStorageInfo = () => {
  let totalSize = 0;
  const items = {};
  
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    const item = localStorage.getItem(key);
    if (item) {
      const size = new Blob([item]).size;
      totalSize += size;
      items[name] = {
        key,
        size,
        sizeKB: (size / 1024).toFixed(2)
      };
    }
  });
  
  return {
    totalSize,
    totalSizeKB: (totalSize / 1024).toFixed(2),
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    items
  };
};

export { STORAGE_KEYS };
