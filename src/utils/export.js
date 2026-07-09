// src/utils/export.js

export function buildChatMarkdown(chat) {
    if (!chat?.messages?.length) return ""

    const lines = [`# ${chat.title || "Chat Export"}`, ""]
    lines.push(`_Model: ${chat.model || "unknown"}_`)
    lines.push(`_Exported: ${new Date().toLocaleString()}_`)
    lines.push("", "---", "")

    for (const message of chat.messages) {
        const role = message.role === "user" ? "🧑 User" : "🤖 Assistant"
        lines.push(`## ${role}`)
        lines.push("")
        lines.push(message.content)
        lines.push("")
        if (message.role === "assistant" && message.model) {
            lines.push(`*${message.model} · ${message.tokenCount || 0} tokens*`)
            lines.push("")
        }
        lines.push("---", "")
    }

    return lines.join("\n")
}

export function downloadMarkdownFile(markdown, filename) {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

export function sanitizeFilename(name) {
    return (name || "chat")
        .replace(/[^a-z0-9äöüß\-_ ]/gi, "")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase()
        .slice(0, 60)
}