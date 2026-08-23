// src/utils/markdown.js

/// Converts Markdown text into sanitized HTML for display in the application.
/// Uses Marked for Markdown parsing, Highlight.js for code syntax highlighting
/// and DOMPurify to prevent unsafe HTML from being rendered.

import DOMPurify from "dompurify";
import hljs from "highlight.js";
import { marked } from "marked";
import "highlight.js/styles/github-dark.css";


const CODE_COPY_BUTTON_CLASS = "code-copy-btn";
const DEFAULT_LANGUAGE = "plaintext";

const SANITIZER_OPTIONS = {
  ADD_TAGS: ["button"],
  ADD_ATTR: [
    "aria-label",
    "data-code",
    "title",
    "type",
  ],
};

marked.setOptions({
  breaks: false,
  gfm: true,
});

const renderer = new marked.Renderer();

/**
 * Escapes text for safe use as an HTML attribute value.
 *
 * @param {unknown} value Value to escape
 * @returns {string} HTML-attribute-safe text
 */
function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Resolves a Highlight.js language or falls back to plain text.
 *
 * @param {string} language Markdown code-block language
 * @returns {string} Supported Highlight.js language
 */
function getHighlightLanguage(language = "") {
  const normalizedLanguage = language.trim().toLocaleLowerCase();

  return normalizedLanguage && hljs.getLanguage(normalizedLanguage)
    ? normalizedLanguage
    : DEFAULT_LANGUAGE;
}

/**
 * Creates sanitized HTML for a Markdown fenced code block.
 *
 * @param {{ text?: string, lang?: string } | string} token Marked code token
 * @returns {string} Rendered code block HTML
 */
function renderCodeBlock(token) {
  const code = typeof token === "string"
    ? token
    : String(token.text ?? "");
  const language = typeof token === "string"
    ? ""
    : String(token.lang ?? "");
  const highlightLanguage = getHighlightLanguage(language);

  const highlightedCode = hljs.highlight(code, {
    language: highlightLanguage,
  }).value;
  const encodedCode = escapeHtmlAttribute(code);

  return `<div class="code-block">
    <div class="code-header">
      <span class="code-language">${highlightLanguage}</span>
      <button
        class="${CODE_COPY_BUTTON_CLASS}"
        type="button"
        data-code="${encodedCode}"
        aria-label="Copy code"
        title="Copy code"
      >Copy</button>
    </div>
    <pre><code class="hljs">${highlightedCode}</code></pre>
  </div>`;
}

renderer.code = renderCodeBlock;

marked.use({
  renderer,
});

/**
 * Normalizes input before parsing it as Markdown.
 *
 * @param {unknown} text Markdown input
 * @returns {string} Normalized Markdown
 */
function normalizeMarkdown(text) {
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Renders Markdown as sanitized HTML.
 *
 * @param {unknown} text Markdown source text
 * @returns {string} Sanitized HTML
 */
export function renderMarkdown(text) {
  const normalizedText = normalizeMarkdown(text);

  if (!normalizedText)
    return "";

  const rawHtml = marked.parse(normalizedText);

  return DOMPurify.sanitize(rawHtml, SANITIZER_OPTIONS);
}
