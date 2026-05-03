<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <header class="top-app-bar" role="banner" aria-label="Application navigation">
    <div class="top-app-bar__row">
      <div class="top-app-bar__title">{{ title }}</div>
      <div class="top-app-bar__actions">
        <slot name="actions"></slot>
      </div>
    </div>
  </header>
</template>

<style scoped>
.top-app-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  min-height: 64px;
  display: flex;
  align-items: center;
  background: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
}

.top-app-bar__row {
  box-sizing: border-box;
  width: min(100%, 720px);
  margin: 0 auto;
  padding: 0 12px;
  display: flex;
  align-items: center;
  min-height: 64px;
}

.top-app-bar__title {
  font: var(--md-sys-typescale-title-large-font, 500 1.375rem/1.75rem "Noto Sans JP", "BIZ UDPGothic", sans-serif);
  letter-spacing: 0;
}

.top-app-bar__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
