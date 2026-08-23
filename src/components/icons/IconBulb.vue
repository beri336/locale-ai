<!-- src/components/icons/IconBulb.vue -->

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
    class="icon icon-bulb"
    aria-hidden="true"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M3 12h1" />
    <path d="M12 3v1" />
    <path d="M20 12h1" />
    <path d="M5.6 5.6l.7 .7" />
    <path d="M18.4 5.6l-.7 .7" />
    <path d="M6.3 18.4l-.7 .7" />
    <path d="M17.7 18.4l.7 .7" />
    <path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3h-4a3.5 3.5 0 0 0 -1 -3" />
    <path d="M9.7 17l4.6 0" />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 24 },
  strokeWidth: { type: [Number, String], default: 2 },
});
</script>