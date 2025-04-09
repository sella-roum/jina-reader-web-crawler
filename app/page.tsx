"use client";

import { useCrawler } from "@/hooks/use-crawler";
import { UrlInputForm } from "@/components/url-input-form";
import { UrlSelectorList } from "@/components/url-selector-list";
import { CrawlingProgress } from "@/components/crawling-progress";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Database, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Home() {
  const {
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
  } = useCrawler();

  // 最初のページが取得済みかどうか
  const hasInitialPage = crawledData.length > 0;

  return (
    <ThemeProvider defaultTheme="light" storageKey="crawler-theme">
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
        <div className="container mx-auto max-w-4xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-2 mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Jina Reader Webクローラー
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              URLを入力して、Jina
              Readerを通じてウェブページのコンテンツを取得します。関連ページもクローリングできます。
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-between gap-2 mb-4">
            <Link href="/results">
              <Button variant="outline" className="gap-1">
                <Database className="h-4 w-4" />
                クローリング結果一覧
              </Button>
            </Link>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-1 text-red-500 hover:text-red-700"
                >
                  <RefreshCcw className="h-4 w-4" />
                  クローリング情報をリセット
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    クローリング情報をリセットしますか？
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    この操作により、現在のクローリング進行状況がすべてリセットされます。
                    クローリング結果はIndexedDBに保存されているため削除されません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={resetCrawlingData}
                    className="bg-red-500 hover:bg-red-700"
                  >
                    リセットする
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <UrlInputForm
              initialUrl={initialUrl}
              setInitialUrl={setInitialUrl}
              fetchInitialContent={fetchInitialContent}
              isLoading={isLoading}
              error={error}
            />
          </motion.div>

          {/* 最初のページが取得済みの場合は、URL選択リストを表示 */}
          {hasInitialPage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <UrlSelectorList
                extractedUrls={extractedUrls}
                setExtractedUrls={setExtractedUrls}
                toggleUrlSelection={toggleUrlSelection}
                toggleAllUrls={toggleAllUrls}
                crawlSelectedUrls={crawlSelectedUrls}
                isCrawling={isCrawling}
              />
            </motion.div>
          )}

          {crawledData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <CrawlingProgress
                crawledData={crawledData}
                progress={progress}
                isCrawling={isCrawling}
                isRetrying={isRetrying}
                downloadFormat={downloadFormat}
                setDownloadFormat={setDownloadFormat}
                downloadCrawledData={downloadCrawledData}
                retryFailedUrls={retryFailedUrls}
                stats={stats}
                maxConcurrentRequests={maxConcurrentRequests}
                setMaxConcurrentRequests={setMaxConcurrentRequests}
              />
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center text-gray-500 text-sm mt-8"
          >
            <p>© {new Date().getFullYear()} Jina AI Reader Webクローラー</p>
          </motion.div>
        </div>
      </main>
      <Toaster />
    </ThemeProvider>
  );
}
