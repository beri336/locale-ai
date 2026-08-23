<!-- src/components/icons/IconPackageOff.vue -->

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
    class="icon icon-package-off"
    aria-hidden="true"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M6 6.5l6 -3.5l7 4v8.5l-2 1.15" />
    <path d="M12 12l7 -4" />
    <path d="M12 12v7" />
    <path d="M9 20l-4 -2.3v-8.7l1.8 -1.05" />
    <path d="M5 9l7 4" />
    <path d="M3 3l18 18" />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 24 },
  strokeWidth: { type: [Number, String], default: 2 },
});
</script>