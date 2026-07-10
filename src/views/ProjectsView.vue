<!-- src/views/ProjectsView.vue -->

<template>
  <div class="projects-view">
    <header class="page-header">
      <h1>
          <span class="nav-icon"><IconFolder /></span> Projects
        </h1>
      <button class="btn-primary" @click="openCreateModal">
        + New Project
      </button>
    </header>

    <div class="filter-row" v-if="allTags.length">
      <button
        v-for="tag in allTags"
        :key="tag"
        class="tag-filter"
        :class="{ active: activeTagFilter === tag }"
        @click="toggleTagFilter(tag)"
      >
        {{ tag }}
      </button>
    </div>

    <div v-if="filteredProjects.length" class="project-grid">
      <div
        v-for="project in filteredProjects"
        :key="project.id"
        class="project-card"
        @click="openProject(project.id)"
      >
        <div class="project-card-header">
          <h3>{{ project.name }}</h3>
          <button class="delete-btn" @click.stop="handleDelete(project.id)">
            ✕
          </button>
        </div>
        <p v-if="project.description" class="project-desc">
          {{ project.description }}
        </p>

        <div class="project-tags" v-if="project.tags.length">
          <span v-for="tag in project.tags" :key="tag" class="tag-chip">{{
            tag
          }}</span>
        </div>

        <div class="project-footer">
          <span
            >{{ project.chats.length }} chat{{
              project.chats.length === 1 ? "" : "s"
            }}</span
          >
          <span>{{ formatDate(project.createdAt) }}</span>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>No projects yet. Create one to organize multiple chats together.</p>
    </div>

    <div
      v-if="showCreateModal"
      class="modal-overlay"
      @click.self="closeCreateModal"
    >
      <div class="modal">
        <h2>Create a new Project</h2>

        <label class="modal-label">Name *</label>
        <input
          v-model="newProject.name"
          class="input"
          placeholder="e.g. Research, Coding Notes"
          required
        />

        <label class="modal-label">Description</label>
        <textarea
          v-model="newProject.description"
          class="input textarea"
          placeholder="Optional description"
        ></textarea>

        <label class="modal-label">Tags (comma-separated)</label>
        <input
          v-model="newProject.tagsInput"
          class="input"
          placeholder="e.g. work, ai, personal"
        />

        <div class="modal-actions">
          <button class="btn-ghost" @click="closeCreateModal">Cancel</button>
          <button
            class="btn-primary"
            :disabled="!newProject.name"
            @click="handleCreate"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useProjectsStore } from "@/stores/useProjectsStore";
import IconFolder from "@/components/icons/IconFolder.vue";

const router = useRouter();
const projectsStore = useProjectsStore();

const activeTagFilter = ref(null);
const showCreateModal = ref(false);
const newProject = ref({ name: "", description: "", tagsInput: "" });

const projects = computed(() => projectsStore.getAllProjects());
const allTags = computed(() => projectsStore.getAllTags());

const filteredProjects = computed(() => {
  if (!activeTagFilter.value) return projects.value;
  return projects.value.filter((p) => p.tags.includes(activeTagFilter.value));
});

function toggleTagFilter(tag) {
  activeTagFilter.value = activeTagFilter.value === tag ? null : tag;
}

function openCreateModal() {
  newProject.value = { name: "", description: "", tagsInput: "" };
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
}

function handleCreate() {
  if (!newProject.value.name.trim()) return;
  const tags = newProject.value.tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const project = projectsStore.createProject({
    name: newProject.value.name,
    description: newProject.value.description,
    tags,
  });
  closeCreateModal();
  router.push(`/projects/${project.id}`);
}

function handleDelete(id) {
  if (confirm("Delete this project? All chats inside it will be lost.")) {
    projectsStore.deleteProject(id);
  }
}

function openProject(id) {
  router.push(`/projects/${id}`);
}

function formatDate(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("de-DE", {
    dateStyle: "medium",
  });
}
</script>

<style scoped>
.projects-view {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-8) var(--space-6);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-5);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
}

.tag-filter {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.tag-filter:hover {
  background: var(--color-surface-2);
}

.tag-filter.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-4);
  padding: var(--space-1);
}

.project-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: stretch;
  transition:
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.project-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-xs);
  color: var(--color-text-faint);
  margin-top: var(--space-1);
}

.project-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.project-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.project-card-header h3 {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
}

.project-desc {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  line-height: 1.5;
}

.delete-btn {
  background: none;
  border: none;
  color: var(--color-text-faint);
  cursor: pointer;
  font-size: var(--text-xs);
}

.delete-btn:hover {
  color: var(--color-error);
}

.project-desc {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin: var(--space-2) 0;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: var(--space-3);
}

.tag-chip {
  padding: 2px 8px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 11px;
  color: var(--color-text-muted);
}

.project-footer {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-xs);
  color: var(--color-text-faint);
  padding: 0 var(--space-4);
}

.empty-state {
  padding: var(--space-8) 0;
  text-align: center;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  width: 400px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.modal h2 {
  font-size: var(--text-lg);
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.modal-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-weight: 500;
  margin-top: var(--space-2);
}

.input {
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text);
}

.input.textarea {
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.btn-primary {
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-ghost {
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.btn-ghost:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}

/* Page header styling */
.page-header h1 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* Nav icon SVG styling */
.nav-icon svg {
  width: 20px;
  height: 20px;
  display: block;
}
</style>
