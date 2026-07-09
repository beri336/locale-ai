// src/utils/markdown.js

import { marked } from "marked"
import hljs from "highlight.js"
import DOMPurify from "dompurify"
import "highlight.js/styles/github-dark.css"

marked.setOptions({
    breaks: true,
    gfm: true,
})

const renderer = new marked.Renderer()

renderer.code = (token) => {
    const code = typeof token === "string" ? token : token.text
    const language = typeof token === "string" ? arguments[1] : token.lang

    const validLang = hljs.getLanguage(language) ? language : "plaintext"
    const highlighted = hljs.highlight(code, { language: validLang }).value

    return `<pre class="code-block"><div class="code-header">${validLang}</div><code class="hljs">${highlighted}</code></pre>`
}

marked.use({ renderer })

export function renderMarkdown(text) {
    if (!text) return ""
    const rawHtml = marked.parse(text)
    return DOMPurify.sanitize(rawHtml)
}