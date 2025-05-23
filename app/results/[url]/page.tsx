"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  ArrowLeft,
  Download,
  Trash,
  ExternalLink,
  ChevronDown,
  FileText,
  Code,
} from "lucide-react";
import { getCrawledPageByUrl, deleteCrawledPage } from "@/lib/indexed-db";
import { decodeUrlFromRouting } from "@/lib/url-utils";
import { useToast } from "@/hooks/use-toast";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import type { CrawledPage } from "@/types/crawler";
import { marked } from "marked";

export default function PageDetailView() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [page, setPage] = useState<CrawledPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [displayMode, setDisplayMode] = useState<"markdown" | "html">(
    "markdown"
  );
  const [htmlContent, setHtmlContent] = useState<string>("");

  // URLをデコード
  const decodedUrl = decodeUrlFromRouting(params.url as string);

  // ページデータを取得
  useEffect(() => {
    const fetchPage = async () => {
      try {
        setIsLoading(true);
        const pageData = await getCrawledPageByUrl(decodedUrl);
        if (pageData) {
          setPage(pageData);
          // マークダウンをHTMLに変換
          if (pageData.content) {
            try {
              const html = await marked(pageData.content);
              setHtmlContent(html);
            } catch (error) {
              console.error("マークダウン変換エラー:", error);
              setHtmlContent(
                `<p>マークダウンの変換に失敗しました: ${error}</p>`
              );
            }
          }
        } else {
          toast({
            title: "エラー",
            description: "指定されたページが見つかりませんでした",
            variant: "destructive",
          });
          router.push("/results");
        }
      } catch (error) {
        console.error("ページ取得エラー:", error);
        toast({
          title: "エラー",
          description: "ページの読み込みに失敗しました",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPage();
  }, [decodedUrl, router, toast]);

  // ページを削除する関数
  const handleDelete = async () => {
    if (!page) return;

    try {
      setIsDeleting(true);
      await deleteCrawledPage(decodedUrl);
      toast({
        title: "削除完了",
        description: "クローリング結果を削除しました",
      });
      router.push("/results");
    } catch (error) {
      console.error("削除エラー:", error);
      toast({
        title: "削除エラー",
        description: "クローリング結果の削除に失敗しました",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  // データをダウンロードする関数
  const downloadData = (format: "json" | "md" | "txt" | "html") => {
    if (!page || !page.content) return;

    let blob: Blob;
    let filename: string;
    const urlFilename = page.url.replace(/[^a-z0-9]/gi, "_").substring(0, 30);

    switch (format) {
      case "json":
        const jsonData = JSON.stringify(
          { url: page.url, content: page.content },
          null,
          2
        );
        blob = new Blob([jsonData], { type: "application/json" });
        filename = `${urlFilename}.json`;
        break;

      case "md":
        const markdownData = `# ${page.url}\n\n${page.content}`;
        blob = new Blob([markdownData], { type: "text/markdown" });
        filename = `${urlFilename}.md`;
        break;

      case "txt":
        const textData = `URL: ${page.url}\n\n${page.content}`;
        blob = new Blob([textData], { type: "text/plain" });
        filename = `${urlFilename}.txt`;
        break;

      case "html":
        const htmlData = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${page.url}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
    code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
    img { max-width: 100%; }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
    p { margin: 1em 0; }
  </style>
</head>
<body>
  <h1>${page.url}</h1>
  ${htmlContent}
</body>
</html>`;
        blob = new Blob([htmlData], { type: "text/html" });
        filename = `${urlFilename}.html`;
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

    toast({
      title: "ダウンロード開始",
      description: `${format}形式でダウンロードしています`,
    });
  };

  return (
    <ThemeProvider defaultTheme="light" storageKey="crawler-theme">
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div className="mb-4">
            <Button
              variant="outline"
              className="gap-1"
              onClick={() => router.push("/results")}
            >
              <ArrowLeft className="h-4 w-4" />
              結果一覧に戻る
            </Button>
          </div>

          <Card className="overflow-hidden border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              {isLoading ? (
                <Skeleton className="h-8 w-3/4 bg-white/20" />
              ) : (
                <div className="flex items-center justify-between">
                  <CardTitle className="truncate pr-4" title={page?.url || ""}>
                    {page?.url}
                  </CardTitle>
                  <a
                    href={page?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-blue-100"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                </div>
              )}
              {isLoading ? (
                <Skeleton className="h-4 w-1/2 bg-white/20" />
              ) : (
                <CardDescription className="text-blue-100">
                  コンテンツ長: {page?.content?.length.toLocaleString() || 0}{" "}
                  文字
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="p-6">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <Tabs
                      value={displayMode}
                      onValueChange={(value) =>
                        setDisplayMode(value as "markdown" | "html")
                      }
                    >
                      <TabsList>
                        <TabsTrigger
                          value="markdown"
                          className="flex items-center gap-1"
                        >
                          <FileText className="h-4 w-4" />
                          マークダウン表示
                        </TabsTrigger>
                        <TabsTrigger
                          value="html"
                          className="flex items-center gap-1"
                        >
                          <Code className="h-4 w-4" />
                          HTML表示
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <ScrollArea className="h-[60vh] rounded-md border p-4">
                    {displayMode === "markdown" ? (
                      <div className="whitespace-pre-wrap">{page?.content}</div>
                    ) : (
                      <div
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                      />
                    )}
                  </ScrollArea>
                </>
              )}
            </CardContent>

            <CardFooter className="flex justify-between p-6 pt-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={isLoading}>
                    <Download className="h-4 w-4 mr-1" />
                    ダウンロード
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => downloadData("json")}>
                    JSON形式 (.json)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadData("md")}>
                    Markdown形式 (.md)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadData("txt")}>
                    テキスト形式 (.txt)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadData("html")}>
                    HTML形式 (.html)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-red-500 hover:text-red-700"
                    disabled={isLoading}
                  >
                    <Trash className="h-4 w-4 mr-1" />
                    削除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      このクローリング結果を削除しますか？
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      この操作は元に戻せません。このURLのクローリング結果がデータベースから完全に削除されます。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-red-500 hover:bg-red-700"
                    >
                      {isDeleting ? "削除中..." : "削除する"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        </div>
      </main>
      <Toaster />
    </ThemeProvider>
  );
}
