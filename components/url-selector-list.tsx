"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ExtractedUrl } from "@/types/crawler"
import { LinkIcon, Search, CheckSquare, Square, Loader2 } from "lucide-react"
import { useState, useMemo, useCallback } from "react"
import { Virtuoso } from "react-virtuoso"

interface UrlSelectorListProps {
  extractedUrls: ExtractedUrl[]
  toggleUrlSelection: (index: number) => void
  toggleAllUrls: (selected: boolean) => void
  crawlSelectedUrls: () => Promise<void>
  isCrawling: boolean
  setExtractedUrls: React.Dispatch<React.SetStateAction<ExtractedUrl[]>>
}

export function UrlSelectorList({
  extractedUrls,
  toggleUrlSelection,
  toggleAllUrls,
  crawlSelectedUrls,
  isCrawling,
  setExtractedUrls,
}: UrlSelectorListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "selected" | "unselected">("all")

  // 抽出されたURLがない場合でも、コンポーネントを表示（ただし「URLが見つかりません」というメッセ��ジを表示）
  const hasUrls = extractedUrls.length > 0
  const selectedCount = extractedUrls.filter((url) => url.selected).length
  const unselectedCount = extractedUrls.length - selectedCount

  // 検索とフィルタリング
  const filteredUrls = useMemo(() => {
    let filtered = extractedUrls

    // フィルタータイプによるフィルタリング
    if (filterType === "selected") {
      filtered = filtered.filter((item) => item.selected)
    } else if (filterType === "unselected") {
      filtered = filtered.filter((item) => !item.selected)
    }

    // 検索クエリによるフィルタリング
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) => item.url.toLowerCase().includes(query) || item.text.toLowerCase().includes(query),
      )
    }

    return filtered
  }, [extractedUrls, searchQuery, filterType])

  // 検索結果のみを対象に選択/選択解除する関数
  const toggleFilteredUrls = useCallback(
    (selected: boolean) => {
      setExtractedUrls((prev) => {
        return prev.map((item) => {
          // 現在の検索結果に含まれているかチェック
          const isInFilteredResults = filteredUrls.some((filteredItem) => filteredItem.url === item.url)
          // 検索結果に含まれている場合のみ選択状態を変更
          return isInFilteredResults ? { ...item, selected } : item
        })
      })
    },
    [filteredUrls, setExtractedUrls],
  )

  // 検索結果内のすべてが選択されているかチェック
  const allFilteredSelected = filteredUrls.length > 0 && filteredUrls.every((item) => item.selected)
  // 検索結果内の一部が選択されているかチェック
  const someFilteredSelected = filteredUrls.some((item) => item.selected) && !allFilteredSelected

  // URLアイテムをレンダリングする関数（仮想スクロール用）
  const renderUrlItem = useCallback(
    (index: number) => {
      const item = filteredUrls[index]
      const originalIndex = extractedUrls.findIndex((url) => url.url === item.url)

      return (
        <div className="flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors border-b last:border-b-0">
          <Checkbox
            id={`url-${originalIndex}`}
            checked={item.selected}
            onCheckedChange={() => toggleUrlSelection(originalIndex)}
            disabled={isCrawling}
            className="mt-1"
          />
          <div className="grid gap-1 leading-none">
            <label
              htmlFor={`url-${originalIndex}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {item.text || "無題のリンク"}
            </label>
            <p className="text-xs text-gray-500 break-all">{item.url}</p>
          </div>
        </div>
      )
    },
    [filteredUrls, extractedUrls, toggleUrlSelection, isCrawling],
  )

  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          <CardTitle>抽出されたURL {hasUrls ? `(${extractedUrls.length}件)` : ""}</CardTitle>
        </div>
        {!hasUrls ? (
          <CardDescription className="text-blue-100">
            URLが見つかりませんでした。別のURLを試すか、コンテンツ形式を確認してください。
          </CardDescription>
        ) : (
          <CardDescription className="text-blue-100">
            クローリングするURLを選択してください。選択したURLのコンテンツが取得されます。
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {hasUrls ? (
            <>
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1">
                  <Input
                    placeholder="URLを検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFilteredUrls(true)}
                    disabled={allFilteredSelected || isCrawling || filteredUrls.length === 0}
                    className="whitespace-nowrap"
                  >
                    <CheckSquare className="h-4 w-4 mr-1" />
                    表示中のURLを選択
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFilteredUrls(false)}
                    disabled={
                      (!someFilteredSelected && !allFilteredSelected) || isCrawling || filteredUrls.length === 0
                    }
                    className="whitespace-nowrap"
                  >
                    <Square className="h-4 w-4 mr-1" />
                    表示中のURLを選択解除
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="all" onValueChange={(value) => setFilterType(value as any)}>
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="all">すべて ({extractedUrls.length})</TabsTrigger>
                  <TabsTrigger value="selected">選択済 ({selectedCount})</TabsTrigger>
                  <TabsTrigger value="unselected">未選択 ({unselectedCount})</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="border rounded-md">
                {filteredUrls.length > 0 ? (
                  <div style={{ height: "400px" }}>
                    <Virtuoso
                      style={{ height: "100%" }}
                      totalCount={filteredUrls.length}
                      itemContent={renderUrlItem}
                      overscan={20}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-60 p-4 text-gray-500">
                    検索条件に一致するURLがありません
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {selectedCount}件選択中 / 全{extractedUrls.length}件
                </Badge>
                <Button
                  onClick={crawlSelectedUrls}
                  disabled={isCrawling || selectedCount === 0}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {isCrawling ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      クローリング中...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">選択したURL ({selectedCount}件) をクローリング</div>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-md">
              <LinkIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-lg font-medium mb-1">URLが抽出されませんでした</p>
              <p className="text-sm">別のページを試してみるか、コンテンツ形式を確認してください。</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
