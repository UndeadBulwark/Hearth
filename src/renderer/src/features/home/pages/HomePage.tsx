import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import clsx from "clsx"
import fixContentUrls from "@renderer/utils/fixContentUrls"

interface NewsPost {
  title: string
  link: string
  date: string
  content: string
}

function HomePage(): JSX.Element {
  const { t } = useTranslation()

  const [posts, setPosts] = useState<NewsPost[]>([])
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    window.api.netManager
      .queryURL("https://www.vintagestory.at/blog.html/news/?d=2&rss=1")
      .then((xml: string) => {
        const parser = new DOMParser()
        const doc = parser.parseFromString(xml, "application/xml")
        const items = Array.from(doc.querySelectorAll("item"))
          .slice(0, 15)
          .map((item) => {
            const raw = item.querySelector("description")?.textContent ?? ""
            return {
              title: item.querySelector("title")?.textContent ?? "",
              link: item.querySelector("link")?.textContent ?? "",
              date: item.querySelector("pubDate")?.textContent ?? "",
              content: fixContentUrls(raw)
            }
          })
        setPosts(items)
        setLoading(false)
      })
      .catch((e: Error) => {
        setFetchError(e.message)
        setLoading(false)
      })
  }, [])

  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = (e.target as HTMLElement).closest("[data-yt-embed]") as HTMLElement | null
      if (el) {
        e.preventDefault()
        const url = el.getAttribute("data-yt-url")
        if (url) window.api.utils.openOnBrowser(url)
      }
    },
    []
  )

  const current = posts[selected]

  return (
    <div className="w-full h-full flex p-3 gap-3 overflow-hidden">
      <div className="w-full h-full flex gap-3 overflow-hidden min-w-0">
        {/* Sidebar */}
        <div className="w-56 shrink-0 flex flex-col overflow-hidden rounded-md bg-zinc-950/80 backdrop-blur-md border border-zinc-400/5 shadow-sm shadow-zinc-950/50">
          <div className="px-3 py-2 border-b border-zinc-400/5 shrink-0">
            <div className="text-xs font-bold tracking-widest uppercase text-vs">
              {t("features.home.news.latestNews")}
            </div>
          </div>

          {loading && (
            <p className="text-zinc-400 text-xs px-3 py-2">{t("features.home.news.loading")}</p>
          )}

          {fetchError && (
            <p className="text-red-400 text-xs px-3 py-2">{t("features.home.news.failedToLoad")}</p>
          )}

          <div className="flex-1 overflow-y-auto flex flex-col gap-px p-1">
            {posts.map((post, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={clsx(
                  "text-left px-2 py-1.5 rounded-sm cursor-pointer transition-all duration-150",
                  i === selected
                    ? "bg-vs/15 border border-vs/25"
                    : "bg-transparent border border-transparent hover:bg-zinc-800/40"
                )}
              >
                <div
                  className={clsx(
                    "text-xs leading-snug",
                    i === selected ? "font-semibold text-vs" : "font-normal text-zinc-300"
                  )}
                >
                  {post.title}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  {post.date
                    ? new Date(post.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })
                    : ""}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content pane */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden rounded-md bg-zinc-950/80 backdrop-blur-md border border-zinc-400/5 shadow-sm shadow-zinc-950/50">
          {current ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-zinc-400/5 shrink-0">
                <div>
                  <div className="text-sm font-bold text-zinc-100 leading-tight">{current.title}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {current.date
                      ? new Date(current.date).toLocaleDateString(undefined, {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })
                      : ""}
                  </div>
                </div>
                <a
                  href={current.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-vs shrink-0 mt-1 px-2 py-0.5 border border-vs/25 rounded-sm bg-vs/10 no-underline hover:bg-vs/20 transition-colors"
                >
                  {t("features.home.news.open")}
                </a>
              </div>

              {/* Body */}
              <div
                className="flex-1 overflow-y-auto px-5 py-4 text-sm text-zinc-300 leading-relaxed"
                onClick={handleContentClick}
                dangerouslySetInnerHTML={{ __html: current.content }}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              {t("features.home.news.selectAPost")}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HomePage
