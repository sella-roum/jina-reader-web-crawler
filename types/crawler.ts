export interface CrawledPage {
  url: string
  content: string | null // エラー時はnull
  status: "pending" | "fetching" | "completed" | "error"
  retryCount?: number
}

export interface ExtractedUrl {
  url: string
  text: string
  selected: boolean
}
