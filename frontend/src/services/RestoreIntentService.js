/**
 * RestoreIntentService - 1-shot navigation intent for Trash restore
 * 
 * Princip:
 * - Po restore z Koše se uloží intent do localStorage
 * - Modul po mountu přečte intent a naviguje na položku
 * - Intent se po spotřebování smaže (1-shot)
 * - Max 3 retry s delay pokud data ještě nedorazila
 */

const STORAGE_KEY = 'steward:restoreIntent';
const EVENT_NAME = 'steward-restore-intent';

/**
 * Create and dispatch restore intent
 * @param {Object} intent - Navigation intent
 */
export const dispatchRestoreIntent = (intent) => {
  const fullIntent = {
    source: 'trashRestore',
    intentId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ts: Date.now(),
    ...intent
  };
  
  // Save to localStorage for modules that mount after event
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fullIntent));
  } catch (e) {
    console.warn('[RestoreIntent] Failed to save intent:', e);
  }
  
  // Dispatch event for already mounted modules
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: fullIntent }));
  
  return fullIntent;
};

/**
 * Read pending restore intent from storage
 * @returns {Object|null} Intent or null
 */
export const readRestoreIntent = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const intent = JSON.parse(stored);
    
    // Validate intent is from trashRestore source
    if (intent.source !== 'trashRestore') return null;
    
    // Validate intent is not too old (max 10 seconds)
    if (Date.now() - intent.ts > 10000) {
      clearRestoreIntent();
      return null;
    }
    
    return intent;
  } catch (e) {
    console.warn('[RestoreIntent] Failed to read intent:', e);
    return null;
  }
};

/**
 * Clear/consume restore intent
 * @param {string} intentId - Optional: only clear if ID matches
 */
export const clearRestoreIntent = (intentId = null) => {
  try {
    if (intentId) {
      const current = readRestoreIntent();
      if (current?.intentId !== intentId) return; // Don't clear if ID mismatch
    }
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[RestoreIntent] Failed to clear intent:', e);
  }
};

/**
 * Subscribe to restore intent events
 * @param {Function} handler - Handler function (intent) => void
 * @returns {Function} Unsubscribe function
 */
export const subscribeToRestoreIntent = (handler) => {
  const eventHandler = (e) => handler(e.detail);
  window.addEventListener(EVENT_NAME, eventHandler);
  return () => window.removeEventListener(EVENT_NAME, eventHandler);
};

/**
 * Hook helper: process intent with retry logic
 * @param {Object} intent - The intent to process
 * @param {Function} checkExists - () => boolean - check if target item exists
 * @param {Function} navigate - () => void - navigate to target
 * @param {Function} fallback - () => void - fallback navigation (parent context)
 * @param {number} maxRetries - Max retry attempts (default 3)
 */
export const processIntentWithRetry = async (intent, checkExists, navigate, fallback, maxRetries = 3) => {
  if (!intent || intent.source !== 'trashRestore') return false;
  
  const delays = [50, 100, 150];
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check if target exists
    if (checkExists()) {
      try {
        navigate();
        clearRestoreIntent(intent.intentId);
        return true;
      } catch (e) {
        console.warn('[RestoreIntent] Navigation failed:', e);
        break;
      }
    }
    
    // Wait before retry (except last attempt)
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delays[attempt] || 150));
    }
  }
  
  // Fallback: open parent context
  try {
    fallback();
  } catch (e) {
    console.warn('[RestoreIntent] Fallback failed:', e);
  }
  
  clearRestoreIntent(intent.intentId);
  return false;
};

export default {
  dispatchRestoreIntent,
  readRestoreIntent,
  clearRestoreIntent,
  subscribeToRestoreIntent,
  processIntentWithRetry,
  STORAGE_KEY,
  EVENT_NAME
};
