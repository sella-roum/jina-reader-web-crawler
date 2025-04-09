"use client";

import type React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CrawledPage } from "@/types/crawler";
import {
  Download,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";
import { Virtuoso } from "react-virtuoso";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface CrawlingProgressProps {
  crawledData: CrawledPage[];
  progress: number;
  isCrawling: boolean;
  isRetrying: boolean;
  downloadFormat: "json" | "md" | "txt";
  setDownloadFormat: (format: "json" | "md" | "txt") => void;
  downloadCrawledData: () => void;
  retryFailedUrls: () => Promise<void>;
  stats: {
    total: number;
    completed: number;
    pending: number;
    fetching: number;
    error: number;
  };
  maxConcurrentRequests: number;
  setMaxConcurrentRequests: (value: number) => void;
}

export function CrawlingProgress({
  crawledData,
  progress,
  isCrawling,
  isRetrying,
  downloadFormat,
  setDownloadFormat,
  downloadCrawledData,
  retryFailedUrls,
  stats,
  maxConcurrentRequests,
  setMaxConcurrentRequests,
}: CrawlingProgressProps) {
  const [tempMaxConcurrentRequests, setTempMaxConcurrentRequests] = useState(
    maxConcurrentRequests
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // ダイアログが開かれたときに一時的な値を更新
  useEffect(() => {
    if (isDialogOpen) {
      setTempMaxConcurrentRequests(maxConcurrentRequests);
    }
  }, [isDialogOpen, maxConcurrentRequests]);

  if (crawledData.length === 0) {
    return null;
  }

  // ファイル形式の表示名
  const formatLabels = {
    json: "JSON (.json)",
    md: "Markdown (.md)",
    txt: "テキスト (.txt)",
  };

  // 処理中かどうか
  const isProcessing = isCrawling || isRetrying;

  // 設定を保存する関数
  const saveSettings = () => {
    setMaxConcurrentRequests(tempMaxConcurrentRequests);
    setIsDialogOpen(false);
  };

  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-xl">クローリング進捗</CardTitle>
            <CardDescription className="text-blue-100 mt-1">
              {isProcessing
                ? isRetrying
                  ? "エラーURLを再クローリング中..."
                  : "選択したURLをクローリング中..."
                : "クローリングが完了しました"}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={retryFailedUrls}
                    disabled={isProcessing || stats.error === 0}
                    className="gap-1 bg-white/10 hover:bg-white/20 text-white"
                  >
                    <RefreshCw className="h-4 w-4" />
                    エラーを再試行 ({stats.error})
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>エラーになったURLのみを再度クローリングします</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1 bg-white/10 hover:bg-white/20 text-white"
                  disabled={isProcessing}
                >
                  <Settings className="h-4 w-4" />
                  設定
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>クローリング設定</DialogTitle>
                  <DialogDescription>
                    クローリングの設定を変更します。
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="concurrent-requests">
                      並列処理数:{" "}
                      <span className="font-bold">
                        {tempMaxConcurrentRequests}
                      </span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">1</span>
                      <Slider
                        id="concurrent-requests"
                        min={1}
                        max={10}
                        step={1}
                        value={[tempMaxConcurrentRequests]}
                        onValueChange={(value) =>
                          setTempMaxConcurrentRequests(value[0])
                        }
                        disabled={isProcessing}
                        className="flex-1"
                      />
                      <span className="text-sm">10</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      現在の設定: 一度に{maxConcurrentRequests}
                      件のURLを並列処理します
                    </p>
                  </div>
                </div>

                <DialogFooter className="mt-4">
                  <Button onClick={saveSettings} disabled={isProcessing}>
                    設定を保存
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1 bg-white/10 hover:bg-white/20 text-white"
                  >
                    {formatLabels[downloadFormat]}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDownloadFormat("json")}>
                    {formatLabels.json}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDownloadFormat("md")}>
                    {formatLabels.md}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDownloadFormat("txt")}>
                    {formatLabels.txt}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="secondary"
                size="sm"
                onClick={downloadCrawledData}
                disabled={isProcessing || stats.completed === 0}
                className="gap-1 bg-white/10 hover:bg-white/20 text-white"
              >
                <Download className="h-4 w-4" />
                ダウンロード
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* プログレスバー */}
        <div className="relative h-2 w-full bg-gray-200">
          <motion.div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="p-6 space-y-6">
          {/* 統計情報 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="合計"
              value={stats.total}
              icon={<Clock className="h-5 w-5 text-blue-500" />}
              className="bg-blue-50"
            />
            <StatCard
              title="完了"
              value={stats.completed}
              icon={<CheckCircle className="h-5 w-5 text-green-500" />}
              className="bg-green-50"
            />
            <StatCard
              title="処理中"
              value={stats.fetching + stats.pending}
              icon={
                <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
              }
              className="bg-yellow-50"
            />
            <StatCard
              title="エラー"
              value={stats.error}
              icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
              className="bg-red-50"
            />
          </div>

          {/* URL一覧タブ */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="all">すべて ({stats.total})</TabsTrigger>
              <TabsTrigger value="completed">
                完了 ({stats.completed})
              </TabsTrigger>
              <TabsTrigger value="processing">
                処理中 ({stats.fetching + stats.pending})
              </TabsTrigger>
              <TabsTrigger value="error">エラー ({stats.error})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              <UrlList items={crawledData} />
            </TabsContent>

            <TabsContent value="completed" className="mt-0">
              <UrlList
                items={crawledData.filter(
                  (item) => item.status === "completed"
                )}
              />
            </TabsContent>

            <TabsContent value="processing" className="mt-0">
              <UrlList
                items={crawledData.filter(
                  (item) =>
                    item.status === "fetching" || item.status === "pending"
                )}
              />
            </TabsContent>

            <TabsContent value="error" className="mt-0">
              <UrlList
                items={crawledData.filter((item) => item.status === "error")}
              />
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}

// 統計カードコンポーネント
function StatCard({
  title,
  value,
  icon,
  className,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg p-4 flex items-center space-x-4 ${className}`}>
      <div className="rounded-full p-2 bg-white">{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

// URL一覧コンポーネント（仮想スクロール使用）
function UrlList({ items }: { items: CrawledPage[] }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        該当するURLがありません
      </div>
    );
  }

  // URLアイテムをレンダリングする関数
  const renderUrlItem = (index: number) => {
    const item = items[index];
    return (
      <div className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors">
        <div className="truncate flex-1 mr-2">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline truncate block"
          >
            {item.url}
          </a>
        </div>
        <div className="flex-shrink-0">
          <StatusBadge status={item.status} />
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-md border" style={{ height: "300px" }}>
      <Virtuoso
        style={{ height: "100%" }}
        totalCount={items.length}
        itemContent={renderUrlItem}
        overscan={20}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: CrawledPage["status"] }) {
  const statusConfig = {
    pending: {
      label: "待機中",
      className: "bg-gray-100 text-gray-800 border-gray-200",
      icon: <Clock className="h-3 w-3 mr-1" />,
    },
    fetching: {
      label: "取得中",
      className: "bg-blue-100 text-blue-800 border-blue-200",
      icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
    },
    completed: {
      label: "完了",
      className: "bg-green-100 text-green-800 border-green-200",
      icon: <CheckCircle className="h-3 w-3 mr-1" />,
    },
    error: {
      label: "エラー",
      className: "bg-red-100 text-red-800 border-red-200",
      icon: <AlertTriangle className="h-3 w-3 mr-1" />,
    },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={`flex items-center ${config.className}`}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}
