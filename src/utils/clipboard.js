// src/utils/clipboard.js

/// Copies text to the user's clipboard.
/// Uses the modern Clipboard API when available and falls back to a hidden
/// textarea with the legacy copy command for unsupported environments.

/**
 * Copies text to the clipboard with a fallback for older browser environments.
 *
 * @param {unknown} value Value to copy
 * @returns {Promise<boolean>} True when the text was copied successfully
 */
export async function copyToClipboard(value) {
    const text = String(value ?? "");

    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);

            return true;
        } catch (error) {
            console.warn("Clipboard API copy failed; using fallback:", error);
        }
    }

    return copyWithFallback(text);
}

/**
 * Copies text with a temporary textarea and the legacy copy command.
 *
 * @param {string} text Text to copy
 * @returns {boolean} True when the copy operation succeeded
 */
function copyWithFallback(text) {
    const textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";

    document.body.appendChild(textarea);
    textarea.select();

    try {
        return document.execCommand("copy");
    } catch (error) {
        console.error("Clipboard fallback copy failed:", error);

        return false;
    } finally {
        textarea.remove();
    }
}
