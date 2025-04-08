/**
 * Markdownテキストからリンクを抽出する
 */
export function extractLinksFromMarkdown(markdown: string): { url: string; text: string }[] {
  // Markdownリンク形式 [テキスト](URL) を抽出する正規表現
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  const links: { url: string; text: string }[] = []
  let match

  while ((match = linkRegex.exec(markdown)) !== null) {
    const text = match[1]
    const url = match[2]
    // URLからアンカー部分を除去（必要に応じて）
    const cleanUrl = url.split("#")[0]
    if (cleanUrl && cleanUrl.trim() !== "") {
      links.push({ url: cleanUrl, text })
    }
  }

  // HTML形式のリンクも抽出（Jina AI Readerが返すコンテンツにHTMLが含まれる可能性がある）
  const htmlLinkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"(?:\s+[^>]*?)?>([^<]*)<\/a>/g
  while ((match = htmlLinkRegex.exec(markdown)) !== null) {
    const url = match[1]
    const text = match[2]
    // URLからアンカー部分を除去（必要に応じて）
    const cleanUrl = url.split("#")[0]
    if (cleanUrl && cleanUrl.trim() !== "") {
      links.push({ url: cleanUrl, text: text || cleanUrl })
    }
  }

  // 重複を除去
  const uniqueLinks: { url: string; text: string }[] = []
  const seenUrls = new Set<string>()

  for (const link of links) {
    if (!seenUrls.has(link.url)) {
      seenUrls.add(link.url)
      uniqueLinks.push(link)
    }
  }

  return uniqueLinks
}

/**
 * 相対パスを絶対パスに変換する
 */
export function resolveRelativeUrl(baseUrl: string, relativeUrl: string): string {
  try {
    // URLオブジェクトを使用して絶対URLを生成
    const url = new URL(relativeUrl, baseUrl)
    return url.href
  } catch (error) {
    console.error("URL解決エラー:", error)
    return relativeUrl // エラーの場合は元のURLを返す
  }
}

/**
 * 2つのURLが同じドメインかチェックする
 */
export function isSameDomain(url1: string, url2: string): boolean {
  try {
    const domain1 = new URL(url1).hostname
    const domain2 = new URL(url2).hostname
    return domain1 === domain2
  } catch (error) {
    console.error("ドメイン比較エラー:", error)
    return false
  }
}

/**
 * URLがHTTPまたはHTTPSで始まるかチェックする
 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
  } catch (error) {
    return false
  }
}
