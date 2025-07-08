import { getCurrentInstance, inject, unref } from 'vue'
import { type MaybeRef, computedEager } from '@vueuse/core'
import { debugWarn, isClient } from '@element-plus/utils'
import { useGetDerivedNamespace } from '../use-namespace'

import type { InjectionKey, Ref } from 'vue'

export type ElIdInjectionContext = {
  prefix: number
  current: number
}

const defaultIdInjection = {
  prefix: Math.floor(Math.random() * 10000),
  current: 0,
}

export const ID_INJECTION_KEY: InjectionKey<ElIdInjectionContext> =
  Symbol('elIdInjection')

export const useIdInjection = (): ElIdInjectionContext => {
  return getCurrentInstance()
    ? inject(ID_INJECTION_KEY, defaultIdInjection)
    : defaultIdInjection
}
// deterministicId： 一个确定性的 ID（可能是响应式的），如果提供，它将被直接使用
export const useId = (deterministicId?: MaybeRef<string>): Ref<string> => {
  // 获取注入的id, 如果值是defaultIdInjection, 则说明没有注入数据
  const idInjection = useIdInjection()
  if (!isClient && idInjection === defaultIdInjection) {
    // SSR 环境中需要手动提供 ID
    debugWarn(
      'IdInjection',
      `Looks like you are using server rendering, you must provide a id provider to ensure the hydration process to be succeed
usage: app.provide(ID_INJECTION_KEY, {
  prefix: number,
  current: number,
})`
    )
  }

  const namespace = useGetDerivedNamespace()

  // NOTE: Here we use `computedEager` to calculate the id value immediately, avoiding inconsistent id generation due to the lazy feature of `computed` when server rendering.
  const idRef = computedEager(
    () =>
      unref(deterministicId) ||
      `${namespace.value}-id-${idInjection.prefix}-${idInjection.current++}`
  )

  return idRef
}
