import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jina Reader Webクローラー",
  description:
    "URLを入力して、Jina Readerを通じてウェブページのコンテンツを取得します。関連ページもクローリングできます。",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
