"use client";

import { useState, useCallback, useEffect } from "react";
import type { CrawledPage, ExtractedUrl } from "@/types/crawler";
import {
  extractLinksFromMarkdown,
  resolveRelativeUrl,
  isSameDomain,
  isValidHttpUrl,
} from "@/utils/url-utils";
import { useToast } from "@/hooks/use-toast";
import {
  saveCrawledPages,
  saveSetting,
  getSetting,
  SETTINGS_KEYS,
} from "@/lib/indexed-db";

// ローカルストレージのキー
const STORAGE_KEYS = {
  INITIAL_URL: "crawler_initial_url",
  CRAWLED_DATA: "crawler_crawled_data",
  EXTRACTED_URLS: "crawler_extracted_urls",
  IS_CRAWLING: "crawler_is_crawling",
  IS_RETRYING: "crawler_is_retrying",
  PROGRESS: "crawler_progress",
};

export function useCrawler() {
  const [initialUrl, setInitialUrl] = useState<string>("");
  const [crawledData, setCrawledData] = useState<CrawledPage[]>([]);
  const [extractedUrls, setExtractedUrls] = useState<ExtractedUrl[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCrawling, setIsCrawling] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [downloadFormat, setDownloadFormat] = useState<"json" | "md" | "txt">(
    "json"
  );
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [maxConcurrentRequests, setMaxConcurrentRequests] = useState<number>(1);
  const { toast } = useToast();

  // IndexedDBから設定を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // 並列処理の最大数を読み込む
        const savedMaxConcurrentRequests = await getSetting<number>(
          SETTINGS_KEYS.MAX_CONCURRENT_REQUESTS,
          1
        );
        setMaxConcurrentRequests(savedMaxConcurrentRequests);
      } catch (error) {
        console.error("設定の読み込みエラー:", error);
      }
    };

    loadSettings();
  }, []);

  // 並列処理の最大数が変更されたらIndexedDBに保存
  useEffect(() => {
    const saveMaxConcurrentRequests = async () => {
      try {
        await saveSetting(
          SETTINGS_KEYS.MAX_CONCURRENT_REQUESTS,
          maxConcurrentRequests
        );
      } catch (error) {
        console.error("設定の保存エラー:", error);
      }
    };

    saveMaxConcurrentRequests();
  }, [maxConcurrentRequests]);

  // ローカルストレージからデータを読み込む
  useEffect(() => {
    try {
      // 初期URL
      const savedInitialUrl = localStorage.getItem(STORAGE_KEYS.INITIAL_URL);
      if (savedInitialUrl) setInitialUrl(savedInitialUrl);

      // クローリングデータ
      const savedCrawledData = localStorage.getItem(STORAGE_KEYS.CRAWLED_DATA);
      if (savedCrawledData) setCrawledData(JSON.parse(savedCrawledData));

      // 抽出されたURL
      const savedExtractedUrls = localStorage.getItem(
        STORAGE_KEYS.EXTRACTED_URLS
      );
      if (savedExtractedUrls) setExtractedUrls(JSON.parse(savedExtractedUrls));

      // クローリング状態
      const savedIsCrawling = localStorage.getItem(STORAGE_KEYS.IS_CRAWLING);
      if (savedIsCrawling) setIsCrawling(JSON.parse(savedIsCrawling));

      // リトライ状態
      const savedIsRetrying = localStorage.getItem(STORAGE_KEYS.IS_RETRYING);
      if (savedIsRetrying) setIsRetrying(JSON.parse(savedIsRetrying));

      // 進捗
      const savedProgress = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      if (savedProgress) setProgress(JSON.parse(savedProgress));

      // 結果一覧から選択されたURLがあれば読み込む
      const selectedUrlsForCrawling = localStorage.getItem(
        "selectedUrlsForCrawling"
      );
      if (selectedUrlsForCrawling) {
        const urls = JSON.parse(selectedUrlsForCrawling) as ExtractedUrl[];
        setExtractedUrls(urls);
        localStorage.removeItem("selectedUrlsForCrawling");
      }
    } catch (error) {
      console.error("ローカルストレージからの読み込みエラー:", error);
    }
  }, []);

  // 状態が変更されたらローカルストレージに保存
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INITIAL_URL, initialUrl);
      localStorage.setItem(
        STORAGE_KEYS.CRAWLED_DATA,
        JSON.stringify(crawledData)
      );
      localStorage.setItem(
        STORAGE_KEYS.EXTRACTED_URLS,
        JSON.stringify(extractedUrls)
      );
      localStorage.setItem(
        STORAGE_KEYS.IS_CRAWLING,
        JSON.stringify(isCrawling)
      );
      localStorage.setItem(
        STORAGE_KEYS.IS_RETRYING,
        JSON.stringify(isRetrying)
      );
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
    } catch (error) {
      console.error("ローカルストレージへの保存エラー:", error);
    }
  }, [
    initialUrl,
    crawledData,
    extractedUrls,
    isCrawling,
    isRetrying,
    progress,
  ]);

  // デバッグ用：抽出されたURLの数を監視
  useEffect(() => {
    console.log(`抽出されたURL数: ${extractedUrls.length}`);
  }, [extractedUrls]);

  // クローリング完了時にIndexedDBに保存
  useEffect(() => {
    const saveToIndexedDB = async () => {
      // クローリング中またはリトライ中は保存しない
      if (isCrawling || isRetrying || isSaving) return;

      // 完了したページがある場合のみ保存
      const completedPages = crawledData.filter(
        (page) => page.status === "completed"
      );
      if (completedPages.length === 0) return;

      try {
        setIsSaving(true);
        await saveCrawledPages(completedPages);
        console.log(
          `${completedPages.length}件のページをIndexedDBに保存しました`
        );
      } catch (error) {
        console.error("IndexedDBへの保存エラー:", error);
        toast({
          title: "保存エラー",
          description: "クローリング結果をデータベースに保存できませんでした",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    };

    saveToIndexedDB();
  }, [crawledData, isCrawling, isRetrying, toast]);

  // 単一のURLからコンテンツを取得する関数
  const fetchContent = useCallback(
    async (url: string, retryCount = 0): Promise<string> => {
      try {
        const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;

        console.log(`Fetching: ${jinaUrl}`);

        const response = await fetch(jinaUrl);

        if (!response.ok) {
          throw new Error(`ステータスコード: ${response.status}`);
        }

        const content = await response.text();
        console.log(`Content length: ${content.length} characters`);
        return content;
      } catch (error) {
        console.error(`Fetch error (retry ${retryCount}/5):`, error);
        if (retryCount < 5) {
          // リトライ間隔を設ける（5秒）
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return fetchContent(url, retryCount + 1);
        }
        throw error;
      }
    },
    []
  );

  // コンテンツからURLを抽出して既存のリストに追加する関数
  const extractAndAddUrls = useCallback(
    (content: string, sourceUrl: string) => {
      // リンクを抽出
      const links = extractLinksFromMarkdown(content);
      // console.log(`${sourceUrl}から抽出されたリンク（生）:`, links);

      // 有効なURLのみをフィルタリング
      const newValidUrls: ExtractedUrl[] = [];

      for (const link of links) {
        try {
          // 相対パスを絶対パスに変換
          const absoluteUrl = link.url.startsWith("http")
            ? link.url
            : resolveRelativeUrl(sourceUrl, link.url);

          // 同じドメインかチェック（初期URLと同じドメインのみ）
          if (initialUrl && isSameDomain(absoluteUrl, initialUrl)) {
            // 重複チェック（新しく抽出したURLリスト内での重複）
            if (!newValidUrls.some((item) => item.url === absoluteUrl)) {
              newValidUrls.push({
                url: absoluteUrl,
                text: link.text || absoluteUrl,
                selected: false, // デフォルトでは非選択
              });
            }
          }
        } catch (error) {
          console.error("URL処理エラー:", error);
        }
      }

      // console.log(`${sourceUrl}からフィルタリング後の有効なURL:`, newValidUrls);

      // 既存のリストに新しいURLを追加（重複を除外）
      setExtractedUrls((prev) => {
        const updatedUrls = [...prev];

        for (const newUrl of newValidUrls) {
          // 既存のリストに含まれていない場合のみ追加
          if (!updatedUrls.some((item) => item.url === newUrl.url)) {
            updatedUrls.push(newUrl);
          }
        }

        return updatedUrls;
      });

      return newValidUrls.length;
    },
    [initialUrl]
  );

  // 初期URLからコンテンツを取得する関数
  const fetchInitialContent = useCallback(async () => {
    if (!initialUrl) {
      setError("URLを入力してください");
      return;
    }

    if (!isValidHttpUrl(initialUrl)) {
      setError(
        "有効なURLを入力してください（http://またはhttps://で始まるもの）"
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    // 既存のデータをクリア
    setCrawledData([]);
    setExtractedUrls([]);

    try {
      // 初期ページのコンテンツを取得
      const content = await fetchContent(initialUrl);

      // 初期ページを追加
      setCrawledData([
        {
          url: initialUrl,
          content,
          status: "completed",
        },
      ]);

      // リンクを抽出して追加
      const extractedCount = extractAndAddUrls(content, initialUrl);

      // 抽出されたURLがない場合
      if (extractedCount === 0) {
        console.log(
          "有効なURLが見つかりませんでした。コンテンツの一部:",
          content.substring(0, 500)
        );
      }

      // 成功通知
      toast({
        title: "初期ページの取得に成功しました",
        description: `${extractedCount}件のリンクが抽出されました`,
        variant: "default",
      });
    } catch (error) {
      console.error("取得エラー:", error);
      setError(
        `コンテンツの取得に失敗しました: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      // エラー通知
      toast({
        title: "エラーが発生しました",
        description: `初期ページの取得に失敗しました: ${
          error instanceof Error ? error.message : String(error)
        }`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [initialUrl, fetchContent, extractAndAddUrls, toast]);

  // URLを処理する関数（共通処理）
  const processUrl = useCallback(
    async (url: string) => {
      // 既に処理済みかチェック
      const existingPage = crawledData.find((item) => item.url === url);
      if (existingPage && existingPage.status === "completed") {
        console.log(`${url}は既に処理済みです。スキップします。`);
        return { url, success: true, skipped: true };
      }

      // ステータスを更新
      setCrawledData((prev) => {
        // 既存のエントリがあれば更新、なければ追加
        const exists = prev.some((item) => item.url === url);
        if (exists) {
          return prev.map((item) =>
            item.url === url ? { ...item, status: "fetching" } : item
          );
        } else {
          return [...prev, { url, content: null, status: "fetching" }];
        }
      });

      try {
        const content = await fetchContent(url);

        // 成功したらステータスを更新
        setCrawledData((prev) =>
          prev.map((item) =>
            item.url === url ? { ...item, content, status: "completed" } : item
          )
        );

        // 取得したコンテンツから新しいURLを抽出して追加
        const newUrlsCount = extractAndAddUrls(content, url);
        console.log(`${url}から${newUrlsCount}件の新しいURLを抽出しました`);

        return { url, success: true, skipped: false };
      } catch (error) {
        console.error(`${url}の取得に失敗:`, error);

        // エラーの場合はステータスを更新
        setCrawledData((prev) =>
          prev.map((item) =>
            item.url === url ? { ...item, status: "error" } : item
          )
        );
        return { url, success: false, skipped: false };
      }
    },
    [crawledData, fetchContent, extractAndAddUrls]
  );

  // 並列処理を実行する関数（共通処理）
  const processInBatches = useCallback(
    async (
      urls: string[],
      onProgress: (completed: number, total: number) => void
    ) => {
      // 空の配列の場合は何もしない
      if (urls.length === 0) {
        return;
      }

      let completedCount = 0;
      const totalUrls = urls.length;

      // URLを最大maxConcurrentRequestsずつのバッチに分割
      for (let i = 0; i < urls.length; i += maxConcurrentRequests) {
        const batch = urls.slice(i, i + maxConcurrentRequests);

        // バッチ内のURLを並列に処理
        const results = await Promise.allSettled(
          batch.map((url) => processUrl(url))
        );

        // 進捗を更新
        completedCount += batch.length;
        onProgress(completedCount, totalUrls);
      }
    },
    [processUrl, maxConcurrentRequests]
  );

  // 選択されたURLをクローリングする関数（並列処理版）
  const crawlSelectedUrls = useCallback(async () => {
    const selectedUrls = extractedUrls.filter((url) => url.selected);

    if (selectedUrls.length === 0) {
      setError("クローリングするURLが選択されていません");
      toast({
        title: "エラー",
        description: "クローリングするURLが選択されていません",
        variant: "destructive",
      });
      return;
    }

    setIsCrawling(true);
    setError(null);
    setProgress(0);

    // 選択されたURLをcrawledDataに追加（初期状態はpending）
    setCrawledData((prev) => {
      const updatedData = [...prev];

      // 選択されたURLごとに処理
      for (const { url } of selectedUrls) {
        // 既に存在するかチェック
        const existingIndex = updatedData.findIndex((item) => item.url === url);

        if (existingIndex === -1) {
          // 存在しない場合は追加
          updatedData.push({
            url,
            content: null,
            status: "pending",
          });
        } else if (updatedData[existingIndex].status === "error") {
          // エラー状態の場合はpendingに戻す
          updatedData[existingIndex].status = "pending";
        }
        // 完了状態の場合はそのまま
      }

      return updatedData;
    });

    // 進捗更新関数
    const updateProgress = (completed: number, total: number) => {
      const progressPercentage = Math.floor((completed / total) * 100);
      setProgress(progressPercentage);
    };

    // URLの配列を抽出して処理開始
    const urlsArray = selectedUrls.map((item) => item.url);
    await processInBatches(urlsArray, updateProgress);

    setIsCrawling(false);
    setProgress(100);

    // 完了通知
    const successCount = crawledData.filter(
      (item) => item.status === "completed"
    ).length;
    const errorCount = crawledData.filter(
      (item) => item.status === "error"
    ).length;

    toast({
      title: "クローリングが完了しました",
      description: `${successCount}件成功、${errorCount}件エラー`,
      variant: errorCount > 0 ? "destructive" : "default",
    });
  }, [crawledData, extractedUrls, processInBatches, toast]);

  // エラーになったURLのみを再クローリングする関数
  const retryFailedUrls = useCallback(async () => {
    // エラーステータスのURLを抽出
    const failedUrls = crawledData
      .filter((item) => item.status === "error")
      .map((item) => item.url);

    if (failedUrls.length === 0) {
      setError("再クローリングが必要なURLがありません");
      toast({
        title: "情報",
        description: "再クローリングが必要なURLがありません",
        variant: "default",
      });
      return;
    }

    setIsRetrying(true);
    setError(null);
    setProgress(0);

    // すべてのエラーURLのステータスをpendingに変更
    setCrawledData((prev) =>
      prev.map((item) =>
        item.status === "error" ? { ...item, status: "pending" } : item
      )
    );

    // 進捗更新関数
    const updateProgress = (completed: number, total: number) => {
      const progressPercentage = Math.floor((completed / total) * 100);
      setProgress(progressPercentage);
    };

    // 処理開始
    await processInBatches(failedUrls, updateProgress);

    setIsRetrying(false);
    setProgress(100);

    // 完了通知
    const remainingErrors = crawledData.filter(
      (item) => item.status === "error"
    ).length;

    toast({
      title: "エラーURLの再クローリングが完了しました",
      description:
        remainingErrors > 0
          ? `${
              failedUrls.length - remainingErrors
            }件成功、${remainingErrors}件は引き続きエラー`
          : `${failedUrls.length}件すべて成功しました`,
      variant: remainingErrors > 0 ? "destructive" : "default",
    });
  }, [crawledData, processInBatches, toast]);

  // データをMarkdown形式に変換する関数
  const convertToMarkdown = useCallback(
    (data: { url: string; content: string | null }[]): string => {
      return data
        .map(({ url, content }) => {
          return `# ${url}\n\n${
            content || "内容を取得できませんでした"
          }\n\n---\n\n`;
        })
        .join("\n");
    },
    []
  );

  // データをテキスト形式に変換する関数
  const convertToText = useCallback(
    (data: { url: string; content: string | null }[]): string => {
      return data
        .map(({ url, content }) => {
          return `URL: ${url}\n\n${
            content || "内容を取得できませんでした"
          }\n\n==========\n\n`;
        })
        .join("\n");
    },
    []
  );

  // 取得したデータをダウンロードする関数
  const downloadCrawledData = useCallback(() => {
    // 完了したデータのみをフィルタリング
    const completedData = crawledData
      .filter((item) => item.status === "completed")
      .map(({ url, content }) => ({ url, content }));

    if (completedData.length === 0) {
      setError("ダウンロード可能なデータがありません");
      toast({
        title: "エラー",
        description: "ダウンロード可能なデータがありません",
        variant: "destructive",
      });
      return;
    }

    let blob: Blob;
    let filename: string;

    // 選択された形式に応じてデータを変換
    switch (downloadFormat) {
      case "json":
        const jsonData = JSON.stringify(completedData, null, 2);
        blob = new Blob([jsonData], { type: "application/json" });
        filename = "crawled_data.json";
        break;

      case "md":
        const markdownData = convertToMarkdown(completedData);
        blob = new Blob([markdownData], { type: "text/markdown" });
        filename = "crawled_data.md";
        break;

      case "txt":
        const textData = convertToText(completedData);
        blob = new Blob([textData], { type: "text/plain" });
        filename = "crawled_data.txt";
        break;
    }

    // ダウンロードリンクを作成して自動クリック
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // クリーンアップ
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 成功通知
    toast({
      title: "ダウンロードが開始されました",
      description: `${completedData.length}件のデータを${downloadFormat}形式でダウンロードしています`,
      variant: "default",
    });
  }, [crawledData, downloadFormat, convertToMarkdown, convertToText, toast]);

  // URLの選択状態を切り替える関数
  const toggleUrlSelection = useCallback((index: number) => {
    setExtractedUrls((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  }, []);

  // すべてのURLの選択状態を切り替える関数
  const toggleAllUrls = useCallback((selected: boolean) => {
    setExtractedUrls((prev) => prev.map((item) => ({ ...item, selected })));
  }, []);

  // クローリング情報を破棄する関数
  const resetCrawlingData = useCallback(() => {
    // ローカルストレージからクローリング関連のデータを削除
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });

    // 状態をリセット
    setInitialUrl("");
    setCrawledData([]);
    setExtractedUrls([]);
    setIsLoading(false);
    setError(null);
    setIsCrawling(false);
    setProgress(0);
    setIsRetrying(false);

    toast({
      title: "クローリング情報をリセットしました",
      description: "すべてのクローリング進行状況がリセットされました",
    });
  }, [toast]);

  // 統計情報を計算
  const stats = {
    total: crawledData.length,
    completed: crawledData.filter((item) => item.status === "completed").length,
    pending: crawledData.filter((item) => item.status === "pending").length,
    fetching: crawledData.filter((item) => item.status === "fetching").length,
    error: crawledData.filter((item) => item.status === "error").length,
  };

  return {
    initialUrl,
    setInitialUrl,
    crawledData,
    extractedUrls,
    setExtractedUrls,
    isLoading,
    error,
    isCrawling,
    isRetrying,
    progress,
    downloadFormat,
    setDownloadFormat,
    stats,
    fetchInitialContent,
    crawlSelectedUrls,
    retryFailedUrls,
    downloadCrawledData,
    toggleUrlSelection,
    toggleAllUrls,
    resetCrawlingData,
    maxConcurrentRequests,
    setMaxConcurrentRequests,
  };
}
