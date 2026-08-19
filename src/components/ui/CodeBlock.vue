<!-- src/components/ui/CodeBlock.vue -->

<template>
  <pre class="code-block"><code><slot /></code></pre>
</template>

<style scoped>
.code-block {
  margin: 0.75rem 0;
  padding: 0.875rem 1rem;
  overflow-x: auto;
  border-radius: 0.5rem;
  background: #161b22;
  color: #e6edf3;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
}
</style>