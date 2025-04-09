import type { CrawledPage } from "@/types/crawler";

// データベース名とバージョン
const DB_NAME = "web-crawler-db";
const DB_VERSION = 2;
const STORE_NAME = "crawled-pages";
const SETTINGS_STORE_NAME = "settings";

// 設定キー
export const SETTINGS_KEYS = {
  MAX_CONCURRENT_REQUESTS: "max_concurrent_requests",
};

// IndexedDBを開く関数
export async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject(
        "データベースを開けませんでした: " +
          (event.target as IDBOpenDBRequest).error
      );
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // オブジェクトストアが存在しない場合は作成
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // URLをキーとして使用
        db.createObjectStore(STORE_NAME, { keyPath: "url" });
      }

      // 設定用のオブジェクトストアが存在しない場合は作成
      if (!db.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
        db.createObjectStore(SETTINGS_STORE_NAME, { keyPath: "key" });
      }
    };
  });
}

// クローリング結果を保存する関数
export async function saveCrawledPages(pages: CrawledPage[]): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);

  // 完了したページのみを保存
  const completedPages = pages.filter((page) => page.status === "completed");

  return new Promise((resolve, reject) => {
    // 各ページを保存
    completedPages.forEach((page) => {
      store.put(page);
    });

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = (event) => {
      reject("保存エラー: " + (event.target as IDBTransaction).error);
    };
  });
}

// すべてのクローリング結果を取得する関数
export async function getAllCrawledPages(): Promise<CrawledPage[]> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readonly");
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      reject("取得エラー: " + (event.target as IDBRequest).error);
    };
  });
}

// 特定のURLのクローリング結果を取得する関数
export async function getCrawledPageByUrl(
  url: string
): Promise<CrawledPage | null> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readonly");
  const store = transaction.objectStore(STORE_NAME);
  const request = store.get(url);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = (event) => {
      reject("取得エラー: " + (event.target as IDBRequest).error);
    };
  });
}

// 特定のURLのクローリング結果を削除する関数
export async function deleteCrawledPage(url: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  const request = store.delete(url);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      reject("削除エラー: " + (event.target as IDBRequest).error);
    };
  });
}

// すべてのクローリング結果を削除する関数
export async function deleteAllCrawledPages(): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  const request = store.clear();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      reject("削除エラー: " + (event.target as IDBRequest).error);
    };
  });
}

// 設定を保存する関数
export async function saveSetting<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(SETTINGS_STORE_NAME, "readwrite");
  const store = transaction.objectStore(SETTINGS_STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.put({ key, value });

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      reject("設定保存エラー: " + (event.target as IDBRequest).error);
    };
  });
}

// 設定を取得する関数
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const db = await openDatabase();
  const transaction = db.transaction(SETTINGS_STORE_NAME, "readonly");
  const store = transaction.objectStore(SETTINGS_STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.get(key);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.value);
      } else {
        resolve(defaultValue);
      }
    };

    request.onerror = (event) => {
      reject("設定取得エラー: " + (event.target as IDBRequest).error);
      resolve(defaultValue); // エラー時はデフォルト値を返す
    };
  });
}
