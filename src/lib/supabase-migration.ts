/**
 * Utility to clear cached Supabase auth tokens when switching instances
 */

const STORAGE_KEY_PREFIX = 'sb-';
const SUPABASE_URL_KEY = 'supabase-instance-url';

/**
 * Clears all Supabase-related localStorage items
 */
export const clearSupabaseCache = () => {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(STORAGE_KEY_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
  console.log('Cleared Supabase cache from localStorage');
};

/**
 * Checks if the Supabase URL has changed and clears cache if needed
 * Call this on app initialization
 */
export const checkAndClearSupabaseCache = () => {
  const currentUrl = import.meta.env.VITE_SUPABASE_URL;
  const storedUrl = localStorage.getItem(SUPABASE_URL_KEY);

  if (storedUrl && storedUrl !== currentUrl) {
    console.log(`Supabase URL changed from ${storedUrl} to ${currentUrl}`);
    clearSupabaseCache();
    localStorage.setItem(SUPABASE_URL_KEY, currentUrl);
    
    // Force reload to ensure clean state
    window.location.reload();
  } else if (!storedUrl) {
    // First time, store the URL
    localStorage.setItem(SUPABASE_URL_KEY, currentUrl);
  }
};
