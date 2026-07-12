// src/utils/markdown.js

import { marked } from "marked";
import hljs from "highlight.js";
import DOMPurify from "dompurify";
import "highlight.js/styles/github-dark.css";

marked.setOptions({
    breaks: true,
    gfm: true,
});

const renderer = new marked.Renderer();

function escapeHtmlAttribute(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

renderer.code = (token) => {
    const code = typeof token === "string" ? token : token.text;
    const language = typeof token === "string" ? "" : token.lang;

    const validLang =
        language && hljs.getLanguage(language) ? language : "plaintext";

    const highlighted = hljs.highlight(code, {
        language: validLang,
    }).value;

    const encodedCode = escapeHtmlAttribute(code);

    return `
    <pre class="code-block">
      <div class="code-header">
        <span class="code-language">${validLang}</span>
        <button
          class="code-copy-btn"
          type="button"
          data-code="${encodedCode}"
          aria-label="Copy code"
          title="Copy code"
        >
          Copy
        </button>
      </div>
      <code class="hljs">${highlighted}</code>
    </pre>
  `;
};

marked.use({ renderer });

export function renderMarkdown(text) {
    if (!text) return "";

    const rawHtml = marked.parse(text);

    return DOMPurify.sanitize(rawHtml, {
        ADD_ATTR: ["data-code", "aria-label"],
    });
}