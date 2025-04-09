"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
import { Download, Trash, Eye, ChevronDown } from "lucide-react";
import type { CrawledPage } from "@/types/crawler";
import { deleteCrawledPage } from "@/lib/indexed-db";
import { encodeUrlForRouting } from "@/lib/url-utils";
import { useToast } from "@/hooks/use-toast";

interface ResultItemProps {
  page: CrawledPage;
  checked: boolean;
  toggleUrlSelection: (url: string) => void;
  onDelete: (url: string) => void;
}

export function ResultItem({
  page,
  checked,
  toggleUrlSelection,
  onDelete,
}: ResultItemProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // URLの表示名を取得（長すぎる場合は省略）
  const displayUrl =
    page.url.length > 60 ? `${page.url.substring(0, 57)}...` : page.url;

  // コンテンツの長さを取得
  const contentLength = page.content ? page.content.length : 0;
  const contentPreview = page.content
    ? page.content.substring(0, 200) + (page.content.length > 200 ? "..." : "")
    : "";

  // 詳細ページに遷移する関数
  const navigateToDetail = () => {
    const encodedUrl = encodeUrlForRouting(page.url);
    router.push(`/results/${encodedUrl}`);
  };

  // ページを削除する関数
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteCrawledPage(page.url);
      // 削除成功後、親コンポーネントに通知
      onDelete(page.url);
      toast({
        title: "削除完了",
        description: "クローリング結果を削除しました",
      });
    } catch (error) {
      console.error("削除エラー:", error);
      toast({
        title: "削除エラー",
        description: "クローリング結果の削除に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // データをダウンロードする関数
  const downloadData = (format: "json" | "md" | "txt" | "html") => {
    if (!page.content) return;

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
        try {
          const { marked } = require("marked");
          const htmlContent = marked(page.content);
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
        } catch (error) {
          console.error("HTML変換エラー:", error);
          const textData = `URL: ${page.url}\n\n${page.content}`;
          blob = new Blob([textData], { type: "text/plain" });
          filename = `${urlFilename}.txt`;
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

    toast({
      title: "ダウンロード開始",
      description: `${format}形式でダウンロードしています`,
    });
  };

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium truncate" title={page.url}>
          <Checkbox
            id={`select-${page.url}`}
            checked={checked}
            onCheckedChange={() => toggleUrlSelection(page.url)}
            className="mr-2"
          />
          {displayUrl}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 flex-grow">
        <div className="text-sm text-gray-500 mb-2">
          コンテンツ長: {contentLength.toLocaleString()} 文字
        </div>
        <p className="text-sm text-gray-700 line-clamp-3">{contentPreview}</p>
      </CardContent>
      <CardFooter className="flex justify-between pt-0 flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={navigateToDetail}>
            <Eye className="h-4 w-4 mr-1" />
            閲覧
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
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
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-red-500 hover:text-red-700"
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
  );
}
