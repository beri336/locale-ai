<!-- src/components/icons/IconBrandWindows.vue -->

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
    class="icon icon-brand-windows"
    aria-hidden="true"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M4 5l7 -1v7h-7v-6" />
    <path d="M13 4l7 -1v8h-7v-7" />
    <path d="M4 13h7v7l-7 -1v-6" />
    <path d="M13 13h7v8l-7 -1v-7" />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 24 },
  strokeWidth: { type: [Number, String], default: 2 },
});
</script>