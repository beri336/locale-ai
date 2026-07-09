// src/utils/clipboard.js

export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch (error) {
        console.error("Clipboard copy failed:", error)
        const textarea = document.createElement("textarea")
        textarea.value = text
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        try {
            document.execCommand("copy")
            return true
        } catch (fallbackError) {
            console.error("Fallback copy failed:", fallbackError)
            return false
        } finally {
            document.body.removeChild(textarea)
        }
    }
}