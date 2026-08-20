<!-- src/icons/IconPseudocode.vue -->

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- Document outline -->
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />

    <!-- Code symbol -->
    <path d="m9 13-2 2 2 2" />
    <path d="m15 13 2 2-2 2" />
  </svg>
</template>

<script setup>
defineProps({
  size: {
    type: [Number, String],
    default: 20,
  },
  strokeWidth: {
    type: [Number, String],
    default: 1.8,
  },
});
</script>