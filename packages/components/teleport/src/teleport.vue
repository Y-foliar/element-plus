<template>
  <template v-if="disabled">
    <slot />
  </template>
  <teleport v-else :to="to">
    <slot />
  </teleport>
</template>

<script lang="ts" setup>
import { teleportProps } from './teleport'
// props原来是可以复用的
defineProps(teleportProps)
</script>
