/** @format */

const DB_NAME = "VideoCache";
const STORE_NAME = "videos";
const DB_VERSION = 1;

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
        console.log("IndexedDB object store created");
      }
    };
  });
};

// Get video blob from cache
export const getVideoFromCache = async (
  videoId: string,
): Promise<Blob | null> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(videoId);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.blob) {
          console.log(`✅ Cache HIT for video: ${videoId}`);
          resolve(result.blob);
        } else {
          console.log(`❌ Cache MISS for video: ${videoId}`);
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error(`Cache read error for ${videoId}:`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Failed to get video from cache:", error);
    return null;
  }
};

// Save video blob to cache
export const saveVideoToCache = async (
  videoId: string,
  blob: Blob,
): Promise<void> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const data = {
      id: videoId,
      blob: blob,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(data);

      request.onsuccess = () => {
        console.log(`💾 Cached video: ${videoId}`);
        resolve();
      };

      request.onerror = () => {
        console.error(`Cache write error for ${videoId}:`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Failed to save video to cache:", error);
    throw error;
  }
};

// Remove video from cache
export const removeVideoFromCache = async (videoId: string): Promise<void> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(videoId);

      request.onsuccess = () => {
        console.log(`🗑️ Removed from cache: ${videoId}`);
        resolve();
      };

      request.onerror = () => {
        console.error(`Cache delete error for ${videoId}:`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Failed to remove video from cache:", error);
    throw error;
  }
};

// Remove multiple videos from cache
export const removeVideosFromCache = async (
  videoIds: string[],
): Promise<void> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const deletePromises = videoIds.map((videoId) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.delete(videoId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(deletePromises);
    console.log(`🗑️ Removed ${videoIds.length} videos from cache:`, videoIds);
  } catch (error) {
    console.error("Failed to remove videos from cache:", error);
    throw error;
  }
};

// Get all cached video IDs
export const getCachedVideoIds = async (): Promise<string[]> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Failed to get cached video IDs:", error);
    return [];
  }
};

// Clear entire cache
export const clearVideoCache = async (): Promise<void> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onsuccess = () => {
        console.log("🧹 Cleared entire video cache");
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Failed to clear cache:", error);
    throw error;
  }
};
