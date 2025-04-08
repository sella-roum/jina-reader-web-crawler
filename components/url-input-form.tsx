"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AlertCircle, Globe, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface UrlInputFormProps {
  initialUrl: string;
  setInitialUrl: (url: string) => void;
  fetchInitialContent: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function UrlInputForm({
  initialUrl,
  setInitialUrl,
  fetchInitialContent,
  isLoading,
  error,
}: UrlInputFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialUrl && !isLoading) {
      fetchInitialContent();
    }
  };

  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          <CardTitle>クローリングするURLを入力</CardTitle>
        </div>
        <CardDescription className="text-blue-100">
          クローリングを開始したいドキュメントのURLを入力してください。
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Input
                type="url"
                placeholder="https://example.com/docs"
                value={initialUrl}
                onChange={(e) => setInitialUrl(e.target.value)}
                disabled={isLoading}
                className="pr-10 h-12"
                required
              />
              <Globe className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            </div>
            <Button
              type="submit"
              disabled={isLoading || !initialUrl}
              className="h-12 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isLoading ? (
                <motion.div
                  className="flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  取得中...
                </motion.div>
              ) : (
                <motion.div
                  className="flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  最初のページを取得
                  <ArrowRight className="h-4 w-4" />
                </motion.div>
              )}
            </Button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          <div className="text-sm text-gray-500 mt-2">
            <p>
              入力したURLのページを取得し、そのページ内のリンクを抽出します。
              Jina Reader
              APIを使用してコンテンツを取得するため、一部のウェブサイトでは取得できない場合があります。
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
