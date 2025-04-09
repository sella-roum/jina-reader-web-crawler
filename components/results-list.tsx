"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ResultItem } from "@/components/result-item";
import {
  Search,
  Download,
  Trash,
  ChevronDown,
  Database,
  Loader2,
  FileText,
  Link2,
  Play,
  CheckSquare,
  Square,
} from "lucide-react";
import type { CrawledPage, ExtractedUrl } from "@/types/crawler";
import { getAllCrawledPages, deleteCrawledPage } from "@/lib/indexed-db";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

// 1ページあたりの表示件数
const ITEMS_PER_PAGE = 20;

export function ResultsList() {
  const router = useRouter();
  const [pages, setPages] = useState<CrawledPage[]>([]);
  const [filteredPages, setFilteredPages] = useState<CrawledPage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"url" | "content">("url");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortOrder, setSortOrder] = useState<"url" | "contentLength">("url");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // データを読み込む関数
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getAllCrawledPages();
      setPages(data);
    } catch (error) {
      console.error("データ読み込みエラー:", error);
      toast({
        title: "エラー",
        description: "クローリング結果の読み込みに失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // 初回読み込み
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 検索とソート
  useEffect(() => {
    let filtered = [...pages];

    // 検索フィルタリング
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((page) => {
        if (searchType === "url") {
          return page.url.toLowerCase().includes(query);
        } else {
          // コンテンツ検索
          return page.content
            ? page.content.toLowerCase().includes(query)
            : false;
        }
      });
    }

    // ソート
    if (sortOrder === "url") {
      filtered.sort((a, b) => a.url.localeCompare(b.url));
    } else if (sortOrder === "contentLength") {
      filtered.sort((a, b) => {
        const lengthA = a.content ? a.content.length : 0;
        const lengthB = b.content ? b.content.length : 0;
        return lengthB - lengthA; // 降順
      });
    }

    setFilteredPages(filtered);
    // 検索条件が変わったらページを1に戻す
    setCurrentPage(1);
  }, [pages, searchQuery, searchType, sortOrder]);

  // 個別のページを削除した後の処理
  const handlePageDeleted = useCallback((url: string) => {
    setPages((prev) => prev.filter((page) => page.url !== url));
    setSelectedUrls((prev) => {
      const newSet = new Set(prev);
      newSet.delete(url);
      return newSet;
    });
  }, []);

  // 表示中のページを削除する関数
  const handleDeleteFiltered = async () => {
    try {
      setIsDeleting(true);

      // 現在の検索結果のすべてのURLを削除
      for (const page of filteredPages) {
        await deleteCrawledPage(page.url);
      }

      // 削除後のデータを更新
      setPages((prev) =>
        prev.filter(
          (page) => !filteredPages.some((filtered) => filtered.url === page.url)
        )
      );

      // 選択状態も更新
      setSelectedUrls((prev) => {
        const newSet = new Set(prev);
        filteredPages.forEach((page) => newSet.delete(page.url));
        return newSet;
      });

      toast({
        title: "削除完了",
        description: `${filteredPages.length}件のクローリング結果を削除しました`,
      });
    } catch (error) {
      console.error("一括削除エラー:", error);
      toast({
        title: "削除エラー",
        description: "クローリング結果の削除に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // 表示中のデータをダウンロードする関数
  const downloadFilteredData = (format: "json" | "md" | "txt" | "html") => {
    if (filteredPages.length === 0) {
      toast({
        title: "エラー",
        description: "ダウンロード可能なデータがありません",
        variant: "destructive",
      });
      return;
    }

    let blob: Blob;
    let filename: string;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    switch (format) {
      case "json":
        const jsonData = JSON.stringify(
          filteredPages.map((page) => ({
            url: page.url,
            content: page.content,
          })),
          null,
          2
        );
        blob = new Blob([jsonData], { type: "application/json" });
        filename = `crawled_data_${timestamp}.json`;
        break;

      case "md":
        const markdownData = filteredPages
          .map(
            (page) =>
              `# ${page.url}\n\n${
                page.content || "内容を取得できませんでした"
              }\n\n---\n\n`
          )
          .join("\n");
        blob = new Blob([markdownData], { type: "text/markdown" });
        filename = `crawled_data_${timestamp}.md`;
        break;

      case "txt":
        const textData = filteredPages
          .map(
            (page) =>
              `URL: ${page.url}\n\n${
                page.content || "内容を取得できませんでした"
              }\n\n==========\n\n`
          )
          .join("\n");
        blob = new Blob([textData], { type: "text/plain" });
        filename = `crawled_data_${timestamp}.txt`;
        break;

      case "html":
        try {
          const { marked } = require("marked");
          const htmlData = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>クローリング結果 - ${timestamp}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
    code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
    img { max-width: 100%; }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
    p { margin: 1em 0; }
    .page { border-bottom: 1px solid #ddd; padding-bottom: 2em; margin-bottom: 2em; }
  </style>
</head>
<body>
  <h1>クローリング結果 - ${filteredPages.length}件</h1>
  ${filteredPages
    .map(
      (page) => `
  <div class="page">
    <h2>${page.url}</h2>
    ${page.content ? marked(page.content) : "<p>内容を取得できませんでした</p>"}
  </div>
  `
    )
    .join("")}
</body>
</html>`;
          blob = new Blob([htmlData], { type: "text/html" });
          filename = `crawled_data_${timestamp}.html`;
        } catch (error) {
          console.error("HTML変換エラー:", error);
          const textData = filteredPages
            .map(
              (page) =>
                `URL: ${page.url}\n\n${
                  page.content || "内容を取得できませんでした"
                }\n\n==========\n\n`
            )
            .join("\n");
          blob = new Blob([textData], { type: "text/plain" });
          filename = `crawled_data_${timestamp}.txt`;
        }
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
      title: "ダウンロード開始",
      description: `${filteredPages.length}件のデータを${format}形式でダウンロードしています`,
      variant: "default",
    });
  };

  // URLの選択状態を切り替える
  const toggleUrlSelection = (url: string) => {
    setSelectedUrls((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(url)) {
        newSet.delete(url);
      } else {
        newSet.add(url);
      }
      return newSet;
    });
  };

  // 表示中のすべてのURLの選択状態を切り替える
  const toggleAllUrls = (selected: boolean) => {
    if (selected) {
      // すべて選択
      setSelectedUrls((prev) => {
        const newSet = new Set(prev);
        currentItems.forEach((page) => newSet.add(page.url));
        return newSet;
      });
    } else {
      // すべて選択解除
      setSelectedUrls((prev) => {
        const newSet = new Set(prev);
        currentItems.forEach((page) => newSet.delete(page.url));
        return newSet;
      });
    }
  };

  // 選択したURLをクローリングする
  const crawlSelectedUrls = () => {
    if (selectedUrls.size === 0) {
      toast({
        title: "エラー",
        description: "クローリングするURLが選択されていません",
        variant: "destructive",
      });
      return;
    }

    // 選択したURLをExtractedUrl形式に変換
    const extractedUrls: ExtractedUrl[] = Array.from(selectedUrls).map(
      (url) => ({
        url,
        text: url,
        selected: true,
      })
    );

    // URLをローカルストレージに保存
    localStorage.setItem(
      "selectedUrlsForCrawling",
      JSON.stringify(extractedUrls)
    );

    // クローラーページに遷移
    router.push("/");

    toast({
      title: "クローリング準備完了",
      description: `${selectedUrls.size}件のURLがクローリングのために選択されました`,
    });
  };

  // ページネーション関連の計算
  const totalPages = Math.ceil(filteredPages.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredPages.length);
  const currentItems = filteredPages.slice(startIndex, endIndex);

  // 現在のページのすべてが選択されているかチェック
  const allCurrentSelected =
    currentItems.length > 0 &&
    currentItems.every((page) => selectedUrls.has(page.url));
  // 現在のページの一部が選択されているかチェック
  const someCurrentSelected =
    currentItems.some((page) => selectedUrls.has(page.url)) &&
    !allCurrentSelected;

  // ページネーションのリンクを生成
  const renderPaginationLinks = () => {
    const links = [];
    const maxVisiblePages = 5; // 表示するページ番号の最大数

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // 表示するページ数が最大数より少ない場合、startPageを調整
    if (endPage - startPage + 1 < maxVisiblePages && startPage > 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      links.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => setCurrentPage(i)}
            isActive={currentPage === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return links;
  };

  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <CardTitle>クローリング結果 ({pages.length}件)</CardTitle>
        </div>
        <CardDescription className="text-blue-100">
          保存されたクローリング結果を閲覧、ダウンロード、削除できます。複数選択してクローリングすることも可能です。
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-lg">読み込み中...</span>
          </div>
        ) : pages.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <Database className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <p className="text-lg font-medium mb-1">
              クローリング結果がありません
            </p>
            <p className="text-sm">
              URLをクローリングして結果を保存してください。
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative flex-1">
                <div className="flex">
                  <div className="relative flex-1">
                    <Input
                      placeholder={
                        searchType === "url"
                          ? "URLで検索..."
                          : "コンテンツで検索..."
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="ml-2">
                        {searchType === "url" ? (
                          <Link2 className="h-4 w-4 mr-2" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2" />
                        )}
                        {searchType === "url" ? "URL検索" : "内容検索"}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSearchType("url")}>
                        <Link2 className="h-4 w-4 mr-2" />
                        URLで検索
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSearchType("content")}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        内容で検索
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Tabs
                  defaultValue="url"
                  onValueChange={(value) => setSortOrder(value as any)}
                >
                  <TabsList>
                    <TabsTrigger value="url">URL順</TabsTrigger>
                    <TabsTrigger value="contentLength">サイズ順</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2 mb-4">
              <div className="flex flex-wrap gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filteredPages.length === 0}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      表示中をダウンロード
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={() => downloadFilteredData("json")}
                    >
                      JSON形式 (.json)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => downloadFilteredData("md")}
                    >
                      Markdown形式 (.md)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => downloadFilteredData("txt")}
                    >
                      テキスト形式 (.txt)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => downloadFilteredData("html")}
                    >
                      HTML形式 (.html)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      disabled={filteredPages.length === 0}
                    >
                      <Trash className="h-4 w-4 mr-1" />
                      表示中を削除
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        表示中のクローリング結果をすべて削除しますか？
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        この操作は元に戻せません。表示されている
                        {filteredPages.length}
                        件のクローリング結果がデータベースから完全に削除されます。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteFiltered}
                        disabled={isDeleting}
                        className="bg-red-500 hover:bg-red-700"
                      >
                        {isDeleting ? "削除中..." : "すべて削除する"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllUrls(true)}
                  disabled={allCurrentSelected || currentItems.length === 0}
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  ページ内をすべて選択
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllUrls(false)}
                  disabled={!someCurrentSelected && !allCurrentSelected}
                >
                  <Square className="h-4 w-4 mr-1" />
                  ページ内の選択を解除
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                  disabled={selectedUrls.size === 0}
                  onClick={crawlSelectedUrls}
                >
                  <Play className="h-4 w-4 mr-1" />
                  選択したURLをクローリング ({selectedUrls.size})
                </Button>
              </div>
            </div>

            {filteredPages.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentItems.map((page) => (
                    <div key={page.url} className="items-start gap-2">
                      <div className="flex-1">
                        <ResultItem
                          page={page}
                          checked={selectedUrls.has(page.url)}
                          toggleUrlSelection={toggleUrlSelection}
                          onDelete={handlePageDeleted}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <Pagination className="mt-6">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(1, prev - 1))
                          }
                          disabled={currentPage === 1}
                        />
                      </PaginationItem>

                      {renderPaginationLinks()}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(totalPages, prev + 1)
                            )
                          }
                          disabled={currentPage === totalPages}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}

                <div className="text-center text-sm text-gray-500">
                  {filteredPages.length}件中 {startIndex + 1}-{endIndex}件を表示
                  / {selectedUrls.size}件選択中
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <p>検索条件に一致するクローリング結果がありません</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
