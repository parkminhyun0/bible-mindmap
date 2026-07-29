function getStorage(name) {
  try {
    if (typeof window === 'undefined') return null;
    return window[name] || null;
  } catch {
    return null;
  }
}

function createSafeStorage(name) {
  return {
    getItem(key) {
      try {
        return getStorage(name)?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        const storage = getStorage(name);
        if (!storage) return false;
        storage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    removeItem(key) {
      try {
        const storage = getStorage(name);
        if (!storage) return false;
        storage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export const safeLocalStorage = createSafeStorage('localStorage');
export const safeSessionStorage = createSafeStorage('sessionStorage');
