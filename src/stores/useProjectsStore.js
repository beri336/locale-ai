// src/stores/useProjectsStore.js

import { ref, watch } from 'vue'

const STORAGE_KEY = 'ollama-projects'

function loadProjects() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : []
    } catch (error) {
        console.error('Failed to load projects:', error)
        return []
    }
}

function persistProjects(value) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch (error) {
        console.error('Failed to save projects:', error)
    }
}

function saveProjects() {
    persistProjects(projects.value)
}

function getAllProjects() {
    return projects.value
}

function getProjectById(id) {
    return projects.value.find((p) => p.id === id) || null
}

function createProject({ name, description = '', tags = [] }) {
    const project = {
        id: `project_${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        tags: tags.map((t) => t.trim()).filter(Boolean),
        chats: [],
        createdAt: new Date().toISOString(),
    }
    projects.value.unshift(project)
    return project
}

function updateProject(id, updates) {
    const project = getProjectById(id)

    if (!project)
        return false
    
    Object.assign(project, updates)
    return true
}

function deleteProject(id) {
    const index = projects.value.findIndex((p) => p.id === id)
    
    if (index === -1)
        return false
    
    projects.value.splice(index, 1)
    return true
}

function createChatInProject(projectId, model) {
    const project = getProjectById(projectId)

    if (!project)
        return null
    
    const chat = {
        id: `chat_${Date.now()}`,
        title: 'New Chat',
        model: model || '',
        messages: [],
        isArchived: false,
        createdAt: new Date().toISOString(),
    }

    project.chats.unshift(chat)
    return chat
}

function updateChatInProject(projectId, chatId, updates) {
    const project = getProjectById(projectId)
    if (!project)
        return false
    
    const chat = project.chats.find((c) => c.id === chatId)
    if (!chat)
        return false

    Object.assign(chat, updates)
    return true
}

function deleteChatFromProject(projectId, chatId) {
    const project = getProjectById(projectId)
    
    if (!project)
        return false
    
    project.chats = project.chats.filter((c) => c.id !== chatId)
    return true
}

function getAllTags() {
    const tagSet = new Set()
    projects.value.forEach((p) => p.tags.forEach((t) => tagSet.add(t)))
    return Array.from(tagSet).sort()
}

// Archive
function getArchivedChats(project) {
    return project.chats.filter((c) => c.isArchived)
}

function getAllArchivedChats() {
    return projects.value.flatMap((project) =>
        project.chats
            .filter((c) => c.isArchived)
            .map((chat) => ({ chat, project }))
    )
}

function toggleChatArchive(projectId, chatId) {
    const project = getProjectById(projectId)
    if (!project)
        return false
    
    const chat = project.chats.find((c) => c.id === chatId)
    if (!chat)
        return false

    chat.isArchived = !chat.isArchived    
    if (chat.isArchived)
        chat.isPinned = false

    return true
}

const projects = ref(loadProjects())

watch(projects, (value) => persistProjects(value), { deep: true })

function getVisibleChats(project) {
    return project.chats.filter((c) => !c.isArchived)
}

function sortChatsByPin(chats) {
    return [...chats].sort((a, b) => {
        if (!!a.isPinned !== !!b.isPinned)
            return a.isPinned ? -1 : 1
        return new Date(b.createdAt) - new Date(a.createdAt)
    })
}

function toggleChatPin(projectId, chatId) {
    const project = getProjectById(projectId)
    if (!project)
        return false
    
    const chat = project.chats.find((c) => c.id === chatId)
    if (!chat)
        return false

    chat.isPinned = !chat.isPinned
    return true
}

export function useProjectsStore() {
    return {
        projects,
        getAllProjects,
        getProjectById,
        createProject,
        updateProject,
        deleteProject,
        createChatInProject,
        deleteChatFromProject,
        getAllTags,
        saveProjects,
        getArchivedChats,
        getAllArchivedChats,
        toggleChatArchive,
        getVisibleChats,
        sortChatsByPin,
        toggleChatPin,
        updateChatInProject,
    }
}