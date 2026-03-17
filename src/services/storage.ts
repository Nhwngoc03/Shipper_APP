// Storage abstraction layer - works on both web and native (Expo)
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StorageInterface {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// In-memory fallback for when native module isn't available
class MemoryStorage implements StorageInterface {
  private data = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.data.delete(key);
  }
}

class StorageAdapter implements StorageInterface {
  private memoryBackup = new MemoryStorage();
  private isNativeAvailable = true;

  async getItem(key: string): Promise<string | null> {
    if (!this.isNativeAvailable) {
      return this.memoryBackup.getItem(key);
    }

    try {
      const value = await AsyncStorage.getItem(key);
      return value;
    } catch (e) {
      // Native module not available - use memory backup
      this.isNativeAvailable = false;
      console.warn(`AsyncStorage unavailable, using memory storage:`, e);
      return this.memoryBackup.getItem(key);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!this.isNativeAvailable) {
      return this.memoryBackup.setItem(key, value);
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      this.isNativeAvailable = false;
      console.warn(`AsyncStorage write failed, using memory storage:`, e);
      return this.memoryBackup.setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!this.isNativeAvailable) {
      return this.memoryBackup.removeItem(key);
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      this.isNativeAvailable = false;
      console.warn(`AsyncStorage remove failed, using memory storage:`, e);
      return this.memoryBackup.removeItem(key);
    }
  }
}

export const storage = new StorageAdapter();
