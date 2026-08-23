<!-- src/components/icons/IconDeviceMobile.vue -->

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
    class="icon icon-device-mobile"
    aria-hidden="true"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <rect x="7" y="4" width="10" height="16" rx="1" />
    <path d="M11 5h2" />
    <path d="M12 17v.01" />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 24 },
  strokeWidth: { type: [Number, String], default: 2 },
});
</script>