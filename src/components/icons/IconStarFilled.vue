<!-- src/components/icons/IconStarFilled.vue -->

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="icon icon-star-filled"
    aria-hidden="true"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
      d="M12 2l2.928 6.22l6.572 .956l-4.75 4.832l1.121 6.816l-5.871 -3.23l-5.871 3.23l1.121 -6.816l-4.75 -4.832l6.572 -.956z"
    />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 24 },
  strokeWidth: { type: [Number, String], default: 2 },
});
</script>