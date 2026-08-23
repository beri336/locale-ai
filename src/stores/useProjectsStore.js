// src/stores/useProjectsStore.js

/// Manages persisted projects and their local chat conversations.
/// Provides project and chat CRUD operations, archive and pin functionality,
/// tag collection, and automatic local-storage synchronization.

import { ref, watch } from "vue";

const STORAGE_KEY = "ollama-projects";

const PROJECT_ID_PREFIX = "project";
const CHAT_ID_PREFIX = "chat";

const DEFAULT_CHAT_TITLE = "New Chat";

/**
 * Creates a unique entity ID with a descriptive prefix.
 *
 * @param {string} prefix Entity type prefix
 * @returns {string} Unique entity ID
 */
function createId(prefix) {
    return `${prefix}_${Date.now()}_${crypto.randomUUID()}`;
}

/**
 * Returns the current timestamp as an ISO string.
 *
 * @returns {string} Current ISO timestamp
 */
function getCurrentTimestamp() {
    return new Date().toISOString();
}

/**
 * Normalizes a tag list by trimming values, removing empty values,
 * and eliminating duplicate tags case-insensitively.
 *
 * @param {unknown} tags Candidate tag values
 * @returns {string[]} Normalized tags
 */
function normalizeTags(tags) {
    if (!Array.isArray(tags))
        return [];

    const uniqueTags = new Map();

    tags.forEach((tag) => {
        const normalizedTag = String(tag).trim();

        if (normalizedTag) {
            uniqueTags.set(
                normalizedTag.toLocaleLowerCase(),
                normalizedTag,
            );
        }
    });

    return [...uniqueTags.values()];
}

/**
 * Normalizes a project loaded from local storage.
 *
 * @param {unknown} project Candidate project data
 * @returns {Object | null} Normalized project or null when invalid
 */
function normalizeProject(project) {
    if (!project || typeof project !== "object")
        return null;

    const name = String(project.name ?? "").trim();

    if (!name)
        return null;

    return {
        id: String(project.id ?? createId(PROJECT_ID_PREFIX)),
        name,
        description: String(project.description ?? "").trim(),
        tags: normalizeTags(project.tags),
        chats: Array.isArray(project.chats)
            ? project.chats.map(normalizeChat).filter(Boolean)
            : [],
        createdAt: project.createdAt ?? getCurrentTimestamp(),
    };
}

/**
 * Normalizes a chat loaded from local storage.
 *
 * @param {unknown} chat Candidate chat data
 * @returns {Object | null} Normalized chat or null when invalid
 */
function normalizeChat(chat) {
    if (!chat || typeof chat !== "object")
        return null;

    return {
        id: String(chat.id ?? createId(CHAT_ID_PREFIX)),
        title: String(chat.title ?? DEFAULT_CHAT_TITLE).trim() ||
            DEFAULT_CHAT_TITLE,
        model: normalizeModelName(chat.model),
        messages: Array.isArray(chat.messages) ? chat.messages : [],
        isArchived: Boolean(chat.isArchived),
        isPinned: Boolean(chat.isPinned),
        createdAt: chat.createdAt ?? getCurrentTimestamp(),
    };
}

/**
 * Reads and validates saved projects from local storage.
 *
 * @returns {Object[]} Persisted projects or an empty array
 */
function loadProjects() {
    try {
        const storedProjects = localStorage.getItem(STORAGE_KEY);

        if (!storedProjects)
            return [];

        const parsedProjects = JSON.parse(storedProjects);

        if (!Array.isArray(parsedProjects))
            return [];

        return parsedProjects.map(normalizeProject).filter(Boolean);
    } catch (error) {
        console.error("Could not load projects:", error);
        return [];
    }
}

/**
 * Persists projects in local storage.
 *
 * @param {Object[]} projects Projects to persist
 */
function persistProjects(projects) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
        console.error("Could not save projects:", error);
    }
}

// Shared module-level state, available to every useProjectsStore() caller.
const projects = ref(loadProjects());

/**
 * Returns all projects.
 *
 * @returns {Object[]} All persisted projects
 */
function getAllProjects() {
    return projects.value;
}

/**
 * Finds a project by its ID.
 *
 * @param {string} projectId Project identifier
 * @returns {Object | null} Matching project or null
 */
function getProjectById(projectId) {
    return projects.value.find((project) => project.id === projectId) ?? null;
}

/**
 * Finds a chat in a project by its ID.
 *
 * @param {string} projectId Project identifier
 * @param {string} chatId Chat identifier
 * @returns {Object | null} Matching chat or null
 */
function getChatById(projectId, chatId) {
    const project = getProjectById(projectId);

    if (!project)
        return null;

    return project.chats.find((chat) => chat.id === chatId) ?? null;
}

/**
 * Creates and adds a new project.
 *
 * @param {Object} projectData Project data
 * @param {string} projectData.name Project name
 * @param {string} [projectData.description=""] Project description
 * @param {string[]} [projectData.tags=[]] Project tags
 * @returns {Object | null} Created project or null when the name is empty
 */
function createProject({
    name,
    description = "",
    tags = [],
} = {}) {
    const normalizedName = String(name ?? "").trim();

    if (!normalizedName)
        return null;

    const project = {
        id: createId(PROJECT_ID_PREFIX),
        name: normalizedName,
        description: String(description).trim(),
        tags: normalizeTags(tags),
        chats: [],
        createdAt: getCurrentTimestamp(),
    };

    projects.value.unshift(project);

    return project;
}

/**
 * Updates an existing project.
 *
 * @param {string} projectId Project identifier
 * @param {Object} updates Project fields to update
 * @returns {boolean} True when the project was updated
 */
function updateProject(projectId, updates = {}) {
    const project = getProjectById(projectId);

    if (!project || !updates || typeof updates !== "object")
        return false;

    const allowedUpdates = {
        ...(typeof updates.name === "string" && {
            name: updates.name.trim(),
        }),
        ...(typeof updates.description === "string" && {
            description: updates.description.trim(),
        }),
        ...(Array.isArray(updates.tags) && {
            tags: normalizeTags(updates.tags),
        }),
    };

    if ("name" in allowedUpdates && !allowedUpdates.name)
        return false;

    Object.assign(project, allowedUpdates);

    return true;
}

/**
 * Deletes a project and all chats contained in it.
 *
 * @param {string} projectId Project identifier
 * @returns {boolean} True when the project was deleted
 */
function deleteProject(projectId) {
    const projectIndex = projects.value.findIndex((project) => {
        return project.id === projectId;
    });

    if (projectIndex === -1)
        return false;

    projects.value.splice(projectIndex, 1);

    return true;
}

/**
 * Creates and adds a new chat to a project.
 *
 * @param {string} projectId Project identifier
 * @param {string} [model=""] Initial Ollama model name
 * @returns {Object | null} Created chat or null when the project is unknown
 */
function createChatInProject(projectId, model = "") {
    const project = getProjectById(projectId);

    if (!project)
        return null;

    const chat = {
        id: createId(CHAT_ID_PREFIX),
        title: DEFAULT_CHAT_TITLE,
        model: normalizeModelName(model),
        messages: [],
        isArchived: false,
        isPinned: false,
        createdAt: getCurrentTimestamp(),
    };

    project.chats.unshift(chat);

    return chat;
}

/**
 * Updates an existing chat in a project.
 *
 * @param {string} projectId Project identifier
 * @param {string} chatId Chat identifier
 * @param {Object} updates Chat fields to update
 * @returns {boolean} True when the chat was updated
 */
function updateChatInProject(projectId, chatId, updates = {}) {
    const chat = getChatById(projectId, chatId);

    if (!chat || !updates || typeof updates !== "object")
        return false;

    const allowedUpdates = {
        ...(typeof updates.title === "string" && {
            title: updates.title.trim() || DEFAULT_CHAT_TITLE,
        }),
        ...(typeof updates.model === "string" && {
            model: updates.model.trim(),
        }),
        ...(Array.isArray(updates.messages) && {
            messages: updates.messages,
        }),
    };

    Object.assign(chat, allowedUpdates);

    return true;
}

/**
 * Deletes a chat from a project.
 *
 * @param {string} projectId Project identifier
 * @param {string} chatId Chat identifier
 * @returns {boolean} True when the chat was deleted
 */
function deleteChatFromProject(projectId, chatId) {
    const project = getProjectById(projectId);

    if (!project)
        return false;

    const chatIndex = project.chats.findIndex((chat) => chat.id === chatId);

    if (chatIndex === -1)
        return false;

    project.chats.splice(chatIndex, 1);

    return true;
}

/**
 * Returns all project tags sorted alphabetically.
 *
 * @returns {string[]} Unique project tags
 */
function getAllTags() {
    const tags = projects.value.flatMap((project) => project.tags);

    return normalizeTags(tags).sort((firstTag, secondTag) => {
        return firstTag.localeCompare(secondTag);
    });
}

/**
 * Returns archived chats belonging to a project.
 *
 * @param {Object} project Project to inspect
 * @returns {Object[]} Archived chats
 */
function getArchivedChats(project) {
    if (!project || !Array.isArray(project.chats))
        return [];

    return project.chats.filter((chat) => chat.isArchived);
}

/**
 * Returns all archived chats together with their parent project.
 *
 * @returns {Array<{ chat: Object, project: Object }>} Archived chat entries
 */
function getAllArchivedChats() {
    return projects.value.flatMap((project) => {
        return getArchivedChats(project).map((chat) => ({
            chat,
            project,
        }));
    });
}

/**
 * Returns chats that are not archived.
 *
 * @param {Object} project Project to inspect
 * @returns {Object[]} Visible chats
 */
function getVisibleChats(project) {
    if (!project || !Array.isArray(project.chats))
        return [];

    return project.chats.filter((chat) => !chat.isArchived);
}

/**
 * Sorts chats with pinned chats first and newer chats before older chats.
 *
 * @param {Object[]} chats Chats to sort
 * @returns {Object[]} Sorted copy of chats
 */
function sortChatsByPin(chats) {
    if (!Array.isArray(chats))
        return [];

    return [...chats].sort((firstChat, secondChat) => {
        if (Boolean(firstChat.isPinned) !== Boolean(secondChat.isPinned)) {
            return firstChat.isPinned ? -1 : 1;
        }

        return new Date(secondChat.createdAt) -
            new Date(firstChat.createdAt);
    });
}

/**
 * Toggles a chat's archived state.
 *
 * Archiving a chat automatically removes its pinned state.
 *
 * @param {string} projectId Project identifier
 * @param {string} chatId Chat identifier
 * @returns {boolean} True when the archive state was changed
 */
function toggleChatArchive(projectId, chatId) {
    const chat = getChatById(projectId, chatId);

    if (!chat)
        return false;

    chat.isArchived = !chat.isArchived;

    if (chat.isArchived)
        chat.isPinned = false;

    return true;
}

/**
 * Toggles a chat's pinned state.
 *
 * Archived chats cannot be pinned.
 *
 * @param {string} projectId Project identifier
 * @param {string} chatId Chat identifier
 * @returns {boolean} True when the pin state was changed
 */
function toggleChatPin(projectId, chatId) {
    const chat = getChatById(projectId, chatId);

    if (!chat || chat.isArchived)
        return false;

    chat.isPinned = !chat.isPinned;

    return true;
}

/**
 * Persists the current shared project state.
 */
function saveProjects() {
    persistProjects(projects.value);
}

/**
 * Removes a provider prefix from a stored Ollama model value.
 *
 * Project chats store Ollama models without "ollama:" because Ollama's
 * API expects values such as "llama3.2:1b".
 *
 * @param {unknown} value Model value
 * @returns {string} Normalized model name
 */
function normalizeModelName(value) {
    return String(value ?? "")
        .trim()
        .replace(/^ollama:/i, "");
}

watch(
    projects,
    (currentProjects) => {
        persistProjects(currentProjects);
    },
    {
        deep: true,
    },
);

/**
 * Provides access to globally shared project and project-chat state.
 *
 * @returns {Object} Projects state and actions
 */
export function useProjectsStore() {
    return {
        projects,
        getAllProjects,
        getProjectById,
        createProject,
        updateProject,
        deleteProject,
        createChatInProject,
        updateChatInProject,
        deleteChatFromProject,
        getAllTags,
        getArchivedChats,
        getAllArchivedChats,
        getVisibleChats,
        sortChatsByPin,
        toggleChatArchive,
        toggleChatPin,
        saveProjects,
        normalizeModelName,
    };
}
