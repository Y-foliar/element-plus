import { computed, getCurrentInstance } from 'vue'
import type { ComputedRef } from 'vue'

export const useProp = <T>(name: string): ComputedRef<T | undefined> => {
  // 获取当前组件实例
  const vm = getCurrentInstance()
  // 返回自身属性，且返回一个计算属性 (ComputedRef)，确保任何依赖的属性变更时自动更新。这点可以学习
  return computed(() => (vm?.proxy?.$props as any)?.[name])
}
