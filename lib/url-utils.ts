/**
 * URLをルーティングで使用できる形式にエンコードする
 */
export function encodeUrlForRouting(url: string): string {
  return encodeURIComponent(url)
}

/**
 * ルーティングで使用されたURLをデコードする
 */
export function decodeUrlFromRouting(encodedUrl: string): string {
  return decodeURIComponent(encodedUrl)
}
