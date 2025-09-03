// 簡單的記憶體快取實現
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class MemoryCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 分鐘

  // 設定快取
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    });
  }

  // 獲取快取
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // 檢查是否過期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  // 刪除快取
  delete(key: string): void {
    this.cache.delete(key);
  }

  // 清空快取
  clear(): void {
    this.cache.clear();
  }

  // 清理過期項目
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // 獲取快取大小
  size(): number {
    return this.cache.size;
  }

  // 檢查快取是否存在且有效
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  // 更新快取的 TTL
  updateTTL(key: string, ttl: number): void {
    const item = this.cache.get(key);
    if (item) {
      item.ttl = ttl;
      item.timestamp = Date.now();
    }
  }

  // 獲取所有快取鍵
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // 根據前綴清理快取
  clearByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

// 建立全域快取實例
const cache = new MemoryCache();

// 每分鐘清理一次過期項目
setInterval(() => {
  cache.cleanup();
}, 60 * 1000);

// 快取鍵生成器
export const cacheKeys = {
  project: (id: string) => `project:${id}`,
  projectStats: (id: string) => `project:${id}:stats`,
  projectCatalog: (id: string) => `project:${id}:catalog`,
  modules: (projectId: string) => `project:${projectId}:modules`,
  useCases: (projectId: string, page?: number) => 
    page ? `project:${projectId}:usecases:${page}` : `project:${projectId}:usecases`,
  sequences: (projectId: string, page?: number) => 
    page ? `project:${projectId}:sequences:${page}` : `project:${projectId}:sequences`,
  apiContracts: (projectId: string, page?: number) => 
    page ? `project:${projectId}:apicontracts:${page}` : `project:${projectId}:apicontracts`,
  dtoSchemas: (projectId: string, page?: number) => 
    page ? `project:${projectId}:dtoschemas:${page}` : `project:${projectId}:dtoschemas`,
};

// 快取裝飾器
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return async function (...args: Parameters<T>) {
    const key = keyGenerator(...args);
    
    // 檢查快取
    const cachedData = cache.get(key);
    if (cachedData !== null) {
      console.log(`Cache hit for key: ${key}`);
      return cachedData;
    }
    
    // 執行原始函數
    console.log(`Cache miss for key: ${key}`);
    const result = await fn(...args);
    
    // 儲存到快取
    cache.set(key, result, ttl);
    
    return result;
  } as T;
}

// 清理專案相關的所有快取
export function clearProjectCache(projectId: string): void {
  cache.clearByPrefix(`project:${projectId}`);
}

// 匯出快取實例
export default cache;