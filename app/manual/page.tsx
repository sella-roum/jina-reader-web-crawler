"use client";

import { useState, useEffect } from "react";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, BookOpen, AlertCircle } from "lucide-react";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { motion } from "framer-motion";

export default function ManualPage() {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // publicディレクトリ内のファイルをfetchで取得
        const response = await fetch("/document.md");

        if (!response.ok) {
          throw new Error(
            `ドキュメントの読み込みに失敗しました (ステータス: ${response.status})`
          );
        }

        const markdownText = await response.text();

        // markedを使用してMarkdownをHTMLに変換
        // marked v5以降は非同期になる可能性があるため、awaitを使用
        const html = await marked(markdownText);
        setHtmlContent(html as string); // markedの型によってはas stringが必要な場合がある
      } catch (err) {
        console.error("ドキュメント読み込みエラー:", err);
        setError(
          err instanceof Error ? err.message : "不明なエラーが発生しました。"
        );
        setHtmlContent(""); // エラー時はコンテンツをクリア
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, []);

  return (
    <ThemeProvider defaultTheme="light" storageKey="crawler-theme">
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div className="mb-4">
            <Link href="/">
              <Button variant="outline" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                クローラーに戻る
              </Button>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-2 mb-8"
          >
            <Card className="overflow-hidden border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  <CardTitle>操作説明</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isLoading && (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                )}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>エラー</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {!isLoading && !error && (
                  // proseクラスで見やすくスタイリング (Tailwind Typographyプラグインが必要)
                  <div
                    className="prose max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-li:text-gray-700 prose-a:text-blue-600 hover:prose-a:text-blue-800"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
      <Toaster />
    </ThemeProvider>
  );
}
