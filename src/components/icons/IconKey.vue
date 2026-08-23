<!-- src/components/icons/IconKey.vue -->

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
    class="icon icon-key"
    aria-hidden="true"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />

    <!-- Schlüsselkopf -->
    <circle cx="7.5" cy="15.5" r="4.5" />

    <!-- Schaft mit Schlüsselbart -->
    <path d="M10.7 12.3l8.3 -8.3" />
    <path d="M16 7l2 2" />
    <path d="M13.5 9.5l2 2" />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 24 },
  strokeWidth: { type: [Number, String], default: 2 },
});
</script>