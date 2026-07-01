<!-- src/components/ui/UnderConstructionView.vue -->
<template>
  <div class="under-construction">
    <div class="stripes"></div>
    <div class="diagonal-band">
      <div class="band-content">
        <span v-for="n in 12" :key="n" class="band-item">
          <svg class="cone-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <polygon points="12,2 20,20 4,20" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
            <line x1="3" y1="20" x2="21" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
          <span class="site-name">{{ siteName }}</span>
        </span>
      </div>
    </div>
    <div class="badge">
      <svg class="badge-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="40" height="40" rx="4" stroke="currentColor" stroke-width="2.5" stroke-dasharray="8 4" />
        <polygon points="24,12 34,34 14,34" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
        <line x1="10" y1="34" x2="38" y2="34" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      </svg>
      <p class="badge-label">{{ siteName }}</p>
      <p class="badge-sub">Under Construction</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  siteName: { type: String, default: 'Mein Projekt' }
})
</script>

<style scoped>
.under-construction {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 0px);
  background-color: #1a1a1a;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Arial Black", "Impact", sans-serif;
}

.stripes {
  position: absolute;
  inset: -50%;
  width: 200%;
  height: 200%;
  background: repeating-linear-gradient(-45deg, #f5c400 0px, #f5c400 40px, #1a1a1a 40px, #1a1a1a 80px);
  opacity: 0.12;
  pointer-events: none;
}

.diagonal-band {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  overflow: hidden;
}

.band-content {
  display: flex;
  align-items: center;
  gap: 2rem;
  white-space: nowrap;
  transform: rotate(-35deg);
  width: 250vw;
  background: linear-gradient(90deg, transparent 0%, #f5c400 8%, #f5c400 92%, transparent 100%);
  padding: 1rem 0;
}

.band-item {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  color: #1a1a1a;
  font-size: clamp(1rem, 2.5vw, 1.75rem);
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  flex-shrink: 0;
}

.cone-icon {
  width: clamp(1.2rem, 2.5vw, 2rem);
  height: clamp(1.2rem, 2.5vw, 2rem);
  color: #1a1a1a;
}

.badge {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: rgba(26, 26, 26, 0.85);
  border: 2px dashed #f5c400;
  border-radius: 1rem;
  padding: clamp(1.5rem, 4vw, 3rem) clamp(2rem, 6vw, 5rem);
  backdrop-filter: blur(12px);
  box-shadow: 0 0 0 1px rgba(245, 196, 0, 0.15), 0 24px 64px rgba(0, 0, 0, 0.6);
}

.badge-icon {
  width: clamp(3rem, 8vw, 5rem);
  height: clamp(3rem, 8vw, 5rem);
  color: #f5c400;
  margin-bottom: 0.25rem;
}

.badge-label {
  font-size: clamp(1.25rem, 4vw, 2.75rem);
  font-weight: 900;
  color: #f5c400;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: center;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  max-width: 20ch;
}

.badge-sub {
  font-size: clamp(0.7rem, 1.5vw, 1rem);
  color: rgba(245, 196, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-weight: 700;
}
</style>