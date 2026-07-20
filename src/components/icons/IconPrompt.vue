<!-- src/components/icons/IconPrompt.vue -->

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :stroke-width="strokeWidth"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5Z"
    />
    <path d="M7.5 9h4" />
    <path d="M7.5 12.5h6" />
    <path
      d="m16.7 8.1.45 1.25 1.25.45-1.25.45-.45 1.25-.45-1.25-1.25-.45 1.25-.45.45-1.25Z"
    />
  </svg>
</template>

<script setup>
defineProps({
  size: {
    type: [Number, String],
    default: 24,
  },
  strokeWidth: {
    type: [Number, String],
    default: 1.8,
  },
});
</script>
