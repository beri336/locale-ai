// src/utils/export.js

/// Builds Markdown exports for chats and downloads them as files.
/// Formats chat metadata and messages, and creates safe filenames
/// from user-provided chat titles.

const DEFAULT_CHAT_TITLE = "Chat Export";
const DEFAULT_FILENAME = "chat";
const DEFAULT_MODEL_NAME = "unknown";

const GITHUB_USERNAME = "beri336";
const GITHUB_REPOSITORY = "locale-ai";
const GITHUB_PROFILE_URL = `https://github.com/${GITHUB_USERNAME}/${GITHUB_REPOSITORY}`;
const EXPORT_ICON_URL =
    `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPOSITORY}/main/public/pwa-64x64.png`;

const MARKDOWN_MIME_TYPE = "text/markdown;charset=utf-8";
const MAX_FILENAME_LENGTH = 60;

const MESSAGE_ROLES = {
    ASSISTANT: "assistant",
    USER: "user",
};

const ROLE_LABELS = {
    [MESSAGE_ROLES.ASSISTANT]: "🤖 Assistant",
    [MESSAGE_ROLES.USER]: "🧑 User",
};


/**
 * Returns the display label for a chat-message role.
 *
 * @param {string} role Message role
 * @returns {string} Markdown-ready role label
 */
function getRoleLabel(role) {
    return ROLE_LABELS[role] ?? "💬 Message";
}

/**
 * Formats export metadata for an assistant message.
 *
 * @param {Object} message Chat message
 * @returns {string | null} Metadata line or null when unavailable
 */
function getAssistantMetadata(message) {
    if (
        message.role !== MESSAGE_ROLES.ASSISTANT ||
        !message.model
    ) {
        return null;
    }

    const tokenCount = Number(message.tokenCount) || 0;

    return `*${message.model} · ${tokenCount} tokens*`;
}

/**
 * Creates a Markdown document from a chat and its messages.
 *
 * @param {Object} chat Chat to export
 * @param {string} [chat.title] Chat title
 * @param {string} [chat.model] Default chat model
 * @param {Array<{ role: string, content: string }>} [chat.messages] Chat messages
 * @returns {string} Generated Markdown or an empty string when no messages exist
 */
export function buildChatMarkdown(chat) {
    if (!Array.isArray(chat?.messages) || chat.messages.length === 0)
        return "";

    const title = String(chat.title ?? "").trim() || DEFAULT_CHAT_TITLE;
    const model = String(chat.model ?? "").trim() || DEFAULT_MODEL_NAME;

    const lines = [
        `[![LocalAI icon](${EXPORT_ICON_URL})](${GITHUB_PROFILE_URL})`,
        `# ${title}`,
        "",
        `_Model: ${model}_`,
        `_Exported: ${new Date().toLocaleString()}_`,
        "",
        "---",
        "",
    ];

    chat.messages.forEach((message) => {
        const content = String(message?.content ?? "").trim();

        if (!content)
            return;

        lines.push(`## ${getRoleLabel(message.role)}`);
        lines.push("");
        lines.push(content);
        lines.push("");

        const metadata = getAssistantMetadata(message);

        if (metadata) {
            lines.push(metadata);
            lines.push("");
        }

        lines.push("---");
        lines.push("");
    });

    lines.push(
        "",
        "---",
        "",
        `Exported with LocalAI · Created by [${GITHUB_USERNAME}]·(${GITHUB_PROFILE_URL})`,
    );

    return lines.join("\n");
}

/**
 * Downloads Markdown content as a local file.
 *
 * @param {string} markdown Markdown content to download
 * @param {string} filename Download filename
 */
export function downloadMarkdownFile(markdown, filename) {
    const content = String(markdown ?? "");
    const safeFilename = sanitizeFilename(filename)
        .replace(/\.md$/i, "") || DEFAULT_FILENAME;

    const blob = new Blob(
        [content],
        {
            type: MARKDOWN_MIME_TYPE,
        },
    );
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFilename}.md`;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

/**
 * Converts a value into a filename-safe slug.
 *
 * @param {unknown} value Value used to create a filename
 * @returns {string} Safe filename without an extension
 */
export function sanitizeFilename(value) {
    const filename = String(value ?? "")
        .normalize("NFC")
        .replace(/[^a-z0-9äöüß\-_ ]/gi, "")
        .trim()
        .replace(/\s+/g, "-")
        .toLocaleLowerCase()
        .slice(0, MAX_FILENAME_LENGTH);

    return filename || DEFAULT_FILENAME;
}
