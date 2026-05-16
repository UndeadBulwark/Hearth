function fixContentUrls(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  ;(Array.from(doc.querySelectorAll("img")) as HTMLElement[]).forEach((img) => {
    const src = img.getAttribute("src")
    if (src && src.startsWith("//")) img.setAttribute("src", "https:" + src)
    img.style.maxWidth = "100%"
    img.style.borderRadius = "6px"
    img.style.marginTop = "10px"
    img.style.marginBottom = "10px"
    img.style.display = "block"
    img.style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)"
  })
  ;(Array.from(doc.querySelectorAll("iframe")) as HTMLElement[]).forEach((iframe) => {
    let src = iframe.getAttribute("src") || ""
    if (!src || src.trim() === "") {
      src = iframe.getAttribute("data-embed-src") || ""
    }
    if (src && src.startsWith("//")) src = "https:" + src

    const ytMatch = src.match(/(?:youtube(?:-nocookie)?\.com\/embed\/)([a-zA-Z0-9_-]+)/)
    if (ytMatch) {
      const videoId = ytMatch[1]
      const embedUrl = "https://www.youtube-nocookie.com/embed/" + videoId + "?rel=0"
      const watchUrl = "https://www.youtube.com/watch?v=" + videoId
      const thumb = "https://img.youtube.com/vi/" + videoId + "/hqdefault.jpg"

      const wrapper = doc.createElement("div")
      wrapper.setAttribute("data-yt-embed", embedUrl)
      wrapper.setAttribute("data-yt-url", watchUrl)
      wrapper.style.cssText = "position:relative;width:100%;aspect-ratio:16/9;border-radius:8px;margin-top:10px;margin-bottom:10px;overflow:hidden;cursor:pointer;background:#000;"

      const img = doc.createElement("img")
      img.src = thumb
      img.style.cssText = "width:100%;height:100%;object-fit:cover;opacity:0.85;display:block;"

      const btn = doc.createElement("div")
      btn.style.cssText =
        "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:64px;height:64px;background:rgba(0,0,0,0.7);border-radius:50%;display:flex;align-items:center;justify-content:center;"
      btn.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="white"><polygon points="9,7 19,12 9,17"/></svg>'

      wrapper.appendChild(img)
      wrapper.appendChild(btn)
      iframe.parentNode?.replaceChild(wrapper, iframe)
    } else {
      iframe.removeAttribute("width")
      iframe.removeAttribute("height")
      iframe.style.cssText = "width:100%;aspect-ratio:16/9;border-radius:6px;margin-top:10px;margin-bottom:10px;border:none;display:block;"
    }
  })
  ;(Array.from(doc.querySelectorAll("a")) as HTMLElement[]).forEach((a) => {
    const href = a.getAttribute("href")
    if (href && href.startsWith("//")) a.setAttribute("href", "https:" + href)
    a.setAttribute("target", "_blank")
    a.setAttribute("rel", "noopener noreferrer")
    a.style.color = "#fbbf24"
  })
  ;(Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6")) as HTMLElement[]).forEach((h) => {
    h.style.color = "#fcd34d"
    h.style.fontWeight = "700"
    h.style.marginTop = "18px"
    h.style.marginBottom = "6px"
    h.style.lineHeight = "1.3"
    h.style.borderBottom = "1px solid rgba(251,191,36,0.15)"
    h.style.paddingBottom = "4px"
  })
  ;(Array.from(doc.querySelectorAll("p")) as HTMLElement[]).forEach((p) => {
    p.style.marginTop = "6px"
    p.style.marginBottom = "6px"
  })
  ;(Array.from(doc.querySelectorAll("ul,ol")) as HTMLElement[]).forEach((list) => {
    list.style.paddingLeft = "20px"
    list.style.marginTop = "6px"
    list.style.marginBottom = "6px"
  })

  return doc.body!.innerHTML
}

export default fixContentUrls
