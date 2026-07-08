// src/composables/useChatSearch.js

export function searchAllChats(query) {
    const globalChats = JSON.parse(localStorage.getItem("ollama-chats") || "[]")
        .map((c) => ({ ...c, source: "global", projectName: null, projectId: null }))

    const projects = JSON.parse(localStorage.getItem("ollama-projects") || "[]")
    const projectChats = projects.flatMap((p) =>
        p.chats.map((c) => ({ ...c, source: "project", projectName: p.name, projectId: p.id }))
    )

    const all = [...globalChats, ...projectChats].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )

    if (!query) return all

    const lower = query.toLowerCase()
    return all.filter((c) => c.title.toLowerCase().includes(lower))
}
