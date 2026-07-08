// src/stores/useProjectsStore.js
import { ref } from 'vue'

const STORAGE_KEY = 'ollama-projects'

const projects = ref(loadProjects())

function loadProjects() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : []
    } catch (error) {
        console.error('Failed to load projects:', error)
        return []
    }
}

function saveProjects() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.value))
    } catch (error) {
        console.error('Failed to save projects:', error)
    }
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
    saveProjects()
    return project
}

function updateProject(id, updates) {
    const project = getProjectById(id)
    if (!project) return false
    Object.assign(project, updates)
    saveProjects()
    return true
}

function deleteProject(id) {
    const index = projects.value.findIndex((p) => p.id === id)
    if (index === -1) return false
    projects.value.splice(index, 1)
    saveProjects()
    return true
}

function createChatInProject(projectId, model) {
    const project = getProjectById(projectId)
    if (!project) return null
    const chat = {
        id: `chat_${Date.now()}`,
        title: 'New Chat',
        model: model || '',
        messages: [],
        createdAt: new Date().toISOString(),
    }
    project.chats.unshift(chat)
    saveProjects()
    return chat
}

function deleteChatFromProject(projectId, chatId) {
    const project = getProjectById(projectId)
    if (!project) return false
    project.chats = project.chats.filter((c) => c.id !== chatId)
    saveProjects()
    return true
}

function getAllTags() {
    const tagSet = new Set()
    projects.value.forEach((p) => p.tags.forEach((t) => tagSet.add(t)))
    return Array.from(tagSet).sort()
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
    }
}