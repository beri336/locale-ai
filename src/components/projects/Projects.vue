<!-- src/components/projects/Projects.vue -->

<template>
  <main class="projects-view">
    <!-- Header -->
    <header class="page-header">
      <!-- Page heading -->
      <div class="page-heading">
        <!-- Page icon -->
        <div class="header-icon" aria-hidden="true">
          <IconFolder />
        </div>

        <!-- Page title and description -->
        <div>
          <p class="eyebrow">Workspace</p>
          <h1>Projects</h1>
          <p class="header-description">
            Organize related chats, prompts and experiments in one place.
          </p>
        </div>
      </div>

      <!-- New project button -->
      <button class="btn-primary new-project-btn" type="button" @click="openCreateModal">
        <IconPlus :size="12" :stroke-width="2" aria-hidden="true" />
        New project
      </button>
    </header>

    <!-- Tag filter -->
    <div v-if="allTags.length" class="filter-section">
      <!-- Filter header -->
      <div class="filter-header">
        <p class="filter-label">Filter by tag</p>

        <!-- Clear filter button -->
        <button v-if="activeTagFilter" class="clear-filter-btn" type="button" @click="activeTagFilter = null">
          Clear filter
        </button>
      </div>

      <!-- Filter options -->
      <div class="filter-row">
        <button v-for="tag in allTags" :key="tag" class="tag-filter" :class="{ active: activeTagFilter === tag }"
          type="button" @click="toggleTagFilter(tag)">
          <span class="tag-filter-dot"></span>
          {{ tag }}
        </button>
      </div>
    </div>

    <!-- Project grid -->
    <div v-if="filteredProjects.length" class="project-grid">
      <!-- Project cards -->
      <article v-for="project in filteredProjects" :key="project.id" class="project-card">
        <!-- Project card -->
        <button class="project-main" type="button" :aria-label="`Open project ${project.name}`"
          @click="openProject(project.id)">
          <!-- Project card header -->
          <div class="project-card-header">
            <!-- Project title and icon -->
            <div class="project-title-group">
              <span class="project-icon" aria-hidden="true">
                <IconFolder :size="20" :stroke-width="2"></IconFolder>
              </span>
              <h2>{{ project.name }}</h2>
            </div>

            <!-- Open indicator -->
            <span class="open-indicator" aria-hidden="true">
              <IconArrowUpRight :size="20" :stroke-width="2"></IconArrowUpRight>
            </span>
          </div>

          <!-- Project description -->
          <p v-if="project.description" class="project-desc">
            {{ project.description }}
          </p>

          <p v-else class="project-desc is-empty">No description added yet.</p>

          <!-- Project tags -->
          <div v-if="project.tags.length" class="project-tags">
            <span v-for="tag in project.tags" :key="tag" class="tag-chip">
              {{ tag }}
            </span>
          </div>
        </button>

        <!-- Project footer -->
        <footer class="project-footer">
          <!-- Project metadata -->
          <span class="project-meta">
            <span class="project-meta-icon" aria-hidden="true">◌</span>
            {{ project.chats.length }}
            {{ project.chats.length === 1 ? "chat" : "chats" }}
          </span>

          <!-- Project date -->
          <span class="project-date">{{ formatDate(project.createdAt) }}</span>

          <!-- Delete button -->
          <button class="delete-btn" type="button" :aria-label="`Delete project ${project.name}`" title="Delete project"
            @click="handleDelete(project.id)">
            <IconX :size="16" :stroke-width="2" aria-hidden="true" />
          </button>
        </footer>
      </article>
    </div>

    <!-- Empty state -->
    <section v-else class="empty-state">
      <div class="empty-state-icon" aria-hidden="true">
        <IconFolder :size="40" :stroke-width="1.5" />
      </div>

      <h2>No projects yet</h2>

      <p>Create a project to group related chats, prompts and experiments.</p>

      <button class="btn-primary" type="button" @click="openCreateModal">
        <IconPlus :size="18" :stroke-width="2" aria-hidden="true" />
        Create your first project
      </button>
    </section>

    <!-- Create project modal -->
    <Teleport to="body">
      <!-- Modal -->
      <Transition name="modal">
        <!-- Modal content -->
        <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
          <section class="modal" role="dialog" aria-modal="true" aria-labelledby="create-project-title">
            <div class="modal-header">
              <!-- Modal header -->
              <div>
                <p class="eyebrow">Workspace</p>
                <h2 id="create-project-title">Create project</h2>
                <p class="modal-description">
                  Keep related chats and experiments together.
                </p>
              </div>

              <!-- Modal close button -->
              <button class="modal-close-btn" type="button" aria-label="Close dialog" @click="closeCreateModal">
                <IconX :size="16" :stroke-width="2" aria-hidden="true" />
              </button>
            </div>

            <!-- Modal form -->
            <div class="modal-form">
              <!-- Project name -->
              <div class="field-group">
                <label class="field-label" for="project-name">
                  Project name <span class="required-mark">*</span>
                </label>

                <input id="project-name" v-model="newProject.name" class="input"
                  placeholder="For example: Research or Coding notes" autocomplete="off"
                  @keydown.enter.prevent="handleCreate" ref="projectNameInput" />
              </div>

              <!-- Project description -->
              <div class="field-group">
                <label class="field-label" for="project-description">
                  Description <span class="optional-mark">Optional</span>
                </label>
                <textarea id="project-description" v-model="newProject.description" class="input textarea"
                  placeholder="What is this project for?" rows="3"></textarea>
              </div>

              <!-- Project tags -->
              <div class="field-group">
                <label class="field-label" for="project-tags">
                  Tags <span class="optional-mark">Optional</span>
                </label>
                <input id="project-tags" v-model="newProject.tagsInput" class="input"
                  placeholder="For example: work, ai, personal" autocomplete="off" />
                <p class="field-hint">Separate multiple tags with commas.</p>
              </div>
            </div>

            <!-- Modal actions -->
            <div class="modal-actions">
              <button class="btn-secondary" type="button" @click="closeCreateModal">
                Cancel
              </button>
              <button class="btn-primary" type="button" :disabled="!newProject.name.trim()" @click="handleCreate">
                Create project
              </button>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </main>
</template>

<script setup>
import { ref, computed, nextTick } from "vue";
import { useRouter } from "vue-router";

import { useProjectsStore } from "@/stores/useProjectsStore";

import IconFolder from "@/components/icons/IconFolder.vue";
import IconPlus from "@/components/icons/IconPlus.vue";
import IconArrowUpRight from "@/components/icons/IconArrowUpRight.vue";
import IconX from "@/components/icons/IconX.vue";

const router = useRouter();
const projectsStore = useProjectsStore();

const activeTagFilter = ref(null);
const showCreateModal = ref(false);
const newProject = ref({ name: "", description: "", tagsInput: "" });

const projects = computed(() => projectsStore.getAllProjects());
const allTags = computed(() => projectsStore.getAllTags());

const projectNameInput = ref(null);


// computed property
const filteredProjects = computed(() => {
  if (!activeTagFilter.value) return projects.value;
  return projects.value.filter((p) => p.tags.includes(activeTagFilter.value));
});


// async function
async function openCreateModal() {
  newProject.value = { name: "", description: "", tagsInput: "" };
  showCreateModal.value = true;

  await nextTick();
  projectNameInput.value?.focus();
}


// functions
function toggleTagFilter(tag) {
  activeTagFilter.value = activeTagFilter.value === tag ? null : tag;
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
/* Page layout */
.projects-view {
  height: 100%;
  padding: var(--space-8) var(--space-6);
  overflow-y: auto;
}

/* Page header */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  max-width: var(--max-width);
  margin-bottom: 2rem;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
}

.header-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 22%, transparent);
  border-radius: 13px;
}

.eyebrow {
  margin: 0 0 0.2rem;
  color: var(--color-text-faint);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0;
  color: var(--color-text);
  font-size: clamp(1.65rem, 3vw, 2.2rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.header-description {
  margin: 0.45rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  line-height: 1.5;
}

/* Shared buttons */
.btn-primary,
.btn-secondary,
.btn-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 38px;
  padding: 0.55rem 0.85rem;
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease;
}

.btn-primary:active,
.btn-secondary:active {
  transform: translateY(1px);
}

.btn-primary {
  color: #fff;
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.btn-primary:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-secondary {
  color: var(--color-text);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-bg);
  border-color: color-mix(in srgb,
      var(--color-primary) 35%,
      var(--color-border));
}

.new-project-btn {
  flex-shrink: 0;
  margin-top: 0.2rem;
}

/* Tag filters */
.filter-section {
  max-width: var(--max-width);
  padding: 0.85rem 0 1.25rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: 0.65rem;
}

.filter-label {
  margin: 0;
  color: var(--color-text-faint);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.clear-filter-btn {
  padding: 0;
  color: var(--color-text-faint);
  font-family: inherit;
  font-size: 11px;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.clear-filter-btn:hover {
  color: var(--color-primary);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.tag-filter {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  color: var(--color-text-muted);
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  transition:
    color 0.16s ease,
    background 0.16s ease,
    border-color 0.16s ease;
}

.tag-filter-dot {
  width: 5px;
  height: 5px;
  background: currentColor;
  border-radius: 50%;
  opacity: 0.65;
}

.tag-filter:hover {
  color: var(--color-text);
  background: var(--color-surface-2);
}

.tag-filter.active {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

/* Project grid */
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(245px, 1fr));
  gap: 0.85rem;
  max-width: var(--max-width);
  padding-bottom: 2rem;
}

/* Project card */
.project-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.025);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.project-card:hover {
  border-color: color-mix(in srgb,
      var(--color-primary) 32%,
      var(--color-border));
  box-shadow: 0 12px 28px rgb(0 0 0 / 0.06);
  transform: translateY(-2px);
}

.project-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  align-items: stretch;
  gap: 0.85rem;
  padding: 1.1rem 1.1rem 0.9rem;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.project-main:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -3px;
}

.project-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.project-title-group {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.55rem;
}

.project-icon {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-primary);
  font-size: 1.15rem;
  line-height: 1;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: 9px;
}

.project-card h2 {
  margin: 0;
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 650;
  letter-spacing: -0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.open-indicator {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-text-faint);
  font-size: 0.8rem;
  background: var(--color-surface-2);
  border-radius: 50%;
  transition:
    color 0.16s ease,
    background 0.16s ease,
    transform 0.16s ease;
}

.project-card:hover .open-indicator {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  transform: translate(1px, -1px);
}

.project-desc {
  display: -webkit-box;
  min-height: 2.9em;
  margin: 0;
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.project-desc.is-empty {
  color: var(--color-text-faint);
  font-style: italic;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: auto;
}

.tag-chip {
  max-width: 100%;
  padding: 0.22rem 0.5rem;
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
}

/* Project card footer */
.project-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 42px;
  padding: 0.65rem 1.1rem;
  color: var(--color-text-faint);
  font-size: 10px;
  border-top: 1px solid var(--color-border);
}

.project-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.project-meta-icon {
  color: var(--color-primary);
  font-size: 0.9rem;
}

.project-date {
  margin-left: auto;
}

.delete-btn {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  padding: 0;
  color: var(--color-text-faint);
  font-family: inherit;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
  opacity: 0;
  transition:
    opacity 0.16s ease,
    color 0.16s ease,
    background 0.16s ease;
}

.project-card:hover .delete-btn,
.delete-btn:focus-visible {
  opacity: 1;
}

.delete-btn:hover {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

/* Empty state */
.empty-state {
  display: grid;
  justify-items: center;
  max-width: var(--max-width);
  padding: clamp(2.5rem, 8vw, 5rem) 1.5rem;
  margin: 2rem auto;
  text-align: center;
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
}

.empty-state-icon {
  display: grid;
  width: 46px;
  height: 46px;
  margin-bottom: 0.9rem;
  place-items: center;
  color: var(--color-primary);
  font-size: 1.8rem;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: 14px;
}

.empty-state h2 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-md);
  font-weight: 650;
}

.empty-state p {
  max-width: var(--max-width);
  margin: 0.5rem 0 1.1rem;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  line-height: 1.55;
}

/* Create project modal */
.modal-overlay {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 1rem;
  overflow-y: auto;
  background: rgb(10 12 16 / 0.45);
  backdrop-filter: blur(5px);
}

.modal {
  width: min(100%, 460px);
  padding: clamp(1.1rem, 4vw, 1.4rem);
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-border) 75%, transparent);
  border-radius: calc(var(--radius-lg) + 2px);
  box-shadow: 0 24px 70px rgb(0 0 0 / 0.24);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.modal-header h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.1rem;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.modal-description {
  margin: 0.35rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  line-height: 1.45;
}

.modal-close-btn {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  padding: 0;
  color: var(--color-text-muted);
  font-family: inherit;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 50%;
}

.modal-close-btn:hover {
  color: var(--color-text);
  background: var(--color-bg);
}

/* Project form */
.modal-form {
  display: grid;
  gap: 1rem;
}

.field-group {
  display: grid;
}

.field-label {
  margin-bottom: 0.45rem;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: 600;
}

.required-mark {
  color: var(--color-error);
}

.optional-mark {
  margin-left: 0.2rem;
  color: var(--color-text-faint);
  font-size: 10px;
  font-weight: 500;
}

.field-hint {
  margin: 0.4rem 0 0;
  color: var(--color-text-faint);
  font-size: 10px;
}

.input {
  display: block;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 0.65rem 0.75rem;
  color: var(--color-text);
  font-family: inherit;
  font-size: var(--text-sm);
  line-height: 1.35;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}

.input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent);
}

.input.textarea {
  min-height: 80px;
  resize: vertical;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding-top: 1.1rem;
  margin-top: 1.25rem;
  border-top: 1px solid var(--color-border);
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}

.modal-enter-active .modal,
.modal-leave-active .modal {
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

/* Touch input sizing */
@media (pointer: coarse) {
  .input {
    font-size: 16px;
  }
}

/* Mobile layout */
@media (max-width: 620px) {

  /* Page and header */
  .projects-view {
    padding: 0.85rem 0.75rem 1.5rem;
  }

  .page-header {
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .page-heading {
    gap: 0.55rem;
  }

  .header-icon {
    width: 34px;
    height: 34px;
    border-radius: 11px;
  }

  .eyebrow {
    font-size: 0.6rem;
  }

  .page-header h1 {
    font-size: 1.4rem;
  }

  .header-description {
    margin-top: 0.3rem;
    font-size: 12px;
  }

  .new-project-btn {
    width: 100%;
    min-height: 32px;
    padding: 0.4rem 0.6rem;
    margin-top: 0;
    font-size: 11px;
  }

  /* Filters */
  .filter-section {
    padding: 0.55rem 0 0.85rem;
    margin-bottom: 0.35rem;
  }

  .filter-label {
    font-size: 0.6rem;
  }

  .clear-filter-btn {
    font-size: 10px;
  }

  .filter-row {
    gap: 0.3rem;
  }

  .tag-filter {
    padding: 0.25rem 0.5rem;
    font-size: 10px;
  }

  /* Project cards */
  .project-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    padding-bottom: 1.25rem;
  }

  .project-card {
    border-radius: var(--radius-md);
  }

  .project-main {
    gap: 0.55rem;
    padding: 0.75rem 0.75rem 0.6rem;
  }

  .project-icon {
    width: 22px;
    height: 22px;
    font-size: 0.95rem;
    border-radius: 7px;
  }

  .project-card h2 {
    font-size: 12px;
  }

  .open-indicator {
    width: 20px;
    height: 20px;
    font-size: 0.65rem;
  }

  .project-desc {
    min-height: 2.4em;
    font-size: 11px;
  }

  .tag-chip {
    padding: 0.16rem 0.4rem;
    font-size: 9px;
  }

  .project-footer {
    min-height: 34px;
    padding: 0.45rem 0.75rem;
    font-size: 9px;
  }

  .project-meta-icon {
    font-size: 0.75rem;
  }

  .delete-btn {
    width: 20px;
    height: 20px;
    font-size: 0.85rem;
    opacity: 1;
  }

  /* Empty state */
  .empty-state {
    padding: 2rem 1rem;
    margin: 1rem auto;
  }

  .empty-state-icon {
    width: 36px;
    height: 36px;
    margin-bottom: 0.6rem;
    border-radius: 11px;
  }

  .empty-state h2 {
    font-size: 13px;
  }

  .empty-state p {
    margin: 0.4rem 0 0.85rem;
    font-size: 12px;
  }

  /* Bottom sheet modal */
  .modal-overlay {
    align-items: end;
    padding: 0;
  }

  .modal {
    width: 100%;
    max-height: 92vh;
    padding: 1rem;
    overflow-y: auto;
    border-bottom-right-radius: 0;
    border-bottom-left-radius: 0;
  }

  .modal-header {
    margin-bottom: 0.85rem;
  }

  .modal-header h2 {
    font-size: 0.95rem;
  }

  .modal-description {
    font-size: 11px;
  }

  .modal-close-btn {
    width: 24px;
    height: 24px;
    font-size: 1.05rem;
  }

  .modal-form {
    gap: 0.75rem;
  }

  .field-label {
    font-size: 11px;
  }

  .field-hint {
    font-size: 9px;
  }

  .input {
    padding: 0.5rem 0.6rem;
    font-size: 16px;
  }

  .input.textarea {
    min-height: 64px;
  }

  .modal-actions {
    flex-direction: column-reverse;
    gap: 0.4rem;
    padding-top: 0.85rem;
    margin-top: 0.85rem;
  }

  .modal-actions .btn-primary,
  .modal-actions .btn-secondary {
    width: 100%;
    min-height: 32px;
    font-size: 11px;
  }
}
</style>
