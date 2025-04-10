"use client";

import { Button } from "@/components/ui/button";
import { ResultsList } from "@/components/results-list";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ResultsPage() {
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
              クローリング結果一覧
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              保存されたクローリング結果を閲覧、ダウンロード、削除できます。
            </p>
          </motion.div>

          <div className="mb-4">
            <Link href="/">
              <Button variant="outline" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                クローラーに戻る
              </Button>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <ResultsList />
          </motion.div>

          {/* <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center text-gray-500 text-sm mt-8"
          >
            <p>© {new Date().getFullYear()} Jina AI Reader Webクローラー</p>
          </motion.div> */}
        </div>
      </main>
      <Toaster />
    </ThemeProvider>
  );
}
