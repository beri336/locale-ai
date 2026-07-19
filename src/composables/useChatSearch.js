// src/composables/useChatSearch.js

import { ref, computed } from "vue";
import { useProjectsStore } from "@/stores/useProjectsStore";

const CHAT_STORAGE_KEY = "ollama-chats";
const MAX_SNIPPET_LENGTH = 150;
const DEBOUNCE_MS = 200;

function normalize(value = "") {
    return String(value).toLocaleLowerCase().trim();
}

function getGlobalChats() {
    try {
        const stored = localStorage.getItem(CHAT_STORAGE_KEY);
        const chats = stored ? JSON.parse(stored) : [];

        return Array.isArray(chats) ? chats : [];
    } catch (error) {
        console.error("Could not read saved chats for search:", error);
        return [];
    }
}

function getMessageText(message) {
    if (typeof message === "string")
        return message;

    return message?.content ?? message?.text ?? message?.message ?? "";
}

function getSnippet(text, query) {
    const source = String(text).replace(/\s+/g, " ").trim();
    if (!source)
        return "";

    const index = normalize(source).indexOf(normalize(query));
    if (index === -1)
        return source.slice(0, MAX_SNIPPET_LENGTH);

    const start = Math.max(0, index - 55);
    const end = Math.min(
        source.length,
        index + String(query).length + 95,
    );

    return `${start > 0 ? "…" : ""}${source.slice(start, end)}${end < source.length ? "…" : ""
        }`;
}

function getMatch(chat, project, query) {
    const title = chat.title ?? "Untitled chat";
    const model = chat.model ?? "";
    const projectName = project?.name ?? "";
    const messages = Array.isArray(chat.messages) ? chat.messages : [];

    if (normalize(title).includes(query)) {
        return {
            type: "title",
            label: "Title",
            snippet: title,
            score: 4,
        };
    }

    if (normalize(projectName).includes(query)) {
        return {
            type: "project",
            label: "Project",
            snippet: `Project: ${projectName}`,
            score: 3,
        };
    }

    if (normalize(model).includes(query)) {
        return {
            type: "model",
            label: "Model",
            snippet: `Model: ${model}`,
            score: 2,
        };
    }

    const matchedMessage = messages.find((message) =>
        normalize(getMessageText(message)).includes(query),
    );

    if (matchedMessage) {
        return {
            type: "message",
            label: matchedMessage.role === "assistant" ? "Assistant" : "You",
            snippet: getSnippet(getMessageText(matchedMessage), query),
            score: 1,
        };
    }

    return null;
}

function buildEntry({ chat, project, source }, match = null) {
    return {
        id: `${source}-${chat.id}`,
        chatId: chat.id,
        title: chat.title || "Untitled chat",
        source,
        projectId: project?.id ?? null,
        projectName: project?.name ?? null,
        model: chat.model ?? null,
        messages: Array.isArray(chat.messages) ? chat.messages : [],
        matchType: match?.type ?? null,
        matchLabel: match?.label ?? null,
        snippet: match?.snippet ?? "",
        score: match?.score ?? 0,
        updatedAt: chat.updatedAt ?? chat.createdAt ?? 0,
    };
}

export function useChatSearch() {
    const projectsStore = useProjectsStore();
    const searchQuery = ref("");
    let debounceTimer = null;
    const debouncedQuery = ref("");

    function setSearchQuery(value) {
        searchQuery.value = value;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            debouncedQuery.value = value;
        }, DEBOUNCE_MS);
    }

    const results = computed(() => {
        const query = normalize(debouncedQuery.value);

        const globalChats = getGlobalChats().map((chat) => ({
            chat,
            project: null,
            source: "global",
        }));

        const projectChats = projectsStore.getAllProjects().flatMap((project) =>
            (project.chats ?? []).map((chat) => ({
                chat,
                project,
                source: "project",
            })),
        );

        const allChats = [...globalChats, ...projectChats];

        if (!query) {
            return allChats
                .map((entry) => buildEntry(entry))
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        }

        return allChats
            .map((entry) => {
                const match = getMatch(entry.chat, entry.project, query);
                return match ? buildEntry(entry, match) : null;
            })
            .filter(Boolean)
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            });
    });

    return {
        searchQuery,
        setSearchQuery,
        results,
    };
}