const DB_NAME = 'image-compare-db';
const DB_VERSION = 1;
const STORE_NAME = 'session';
const SESSION_KEY = 'latest';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);

    let request;
    try {
      request = fn(store);
    } catch (error) {
      reject(error);
      db.close();
      return;
    }

    tx.oncomplete = () => {
      db.close();
      resolve(request?.result);
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };

    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error('IndexedDB transaction aborted'));
    };
  });
}

export async function saveSession(payload) {
  return withStore('readwrite', (store) => store.put(payload, SESSION_KEY));
}

export async function loadSession() {
  return withStore('readonly', (store) => store.get(SESSION_KEY));
}

export async function clearSession() {
  return withStore('readwrite', (store) => store.delete(SESSION_KEY));
}
