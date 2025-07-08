import { computed, inject, ref, unref } from 'vue'
import { useGlobalSize, useProp } from '@element-plus/hooks'
import { formContextKey, formItemContextKey } from '../constants'

import type { ComponentSize } from '@element-plus/constants'
import type { MaybeRef } from '@vueuse/core'

export const useFormSize = (
  fallback?: MaybeRef<ComponentSize | undefined>,
  ignore: Partial<Record<'prop' | 'form' | 'formItem' | 'global', boolean>> = {}
) => {
  const emptyRef = ref(undefined)

  const size = ignore.prop ? emptyRef : useProp<ComponentSize>('size')
  const globalConfig = ignore.global ? emptyRef : useGlobalSize()
  const form = ignore.form
    ? { size: undefined }
    : inject(formContextKey, undefined)
  const formItem = ignore.formItem
    ? { size: undefined }
    : inject(formItemContextKey, undefined)

  return computed(
    (): ComponentSize =>
      size.value ||
      unref(fallback) ||
      formItem?.size ||
      form?.size ||
      globalConfig.value ||
      ''
  )
}
// MaybeRef： 在某些情况下，我们希望能够处理一个值，但这个值可能是一个 ref，也可能是一个普通的非响应式值。
export const useFormDisabled = (fallback?: MaybeRef<boolean | undefined>) => {
  const disabled = useProp<boolean>('disabled')
  // inject 在抽离的非vue文件的方法中，也可以使用
  const form = inject(formContextKey, undefined)
  // 这里返回的是一个computed响应式，将根据不同的状态自动更新，这点可以学习
  return computed(
    // unref 从响应式引用中提取值，无论输入是 ref 还是普通值都可以处理
    () => disabled.value || unref(fallback) || form?.disabled || false // 组件自身的 disabled 属性 || 传入的备用值 (fallback) || 注入的表单上下文中的 disabled 状态
  )
}

// These exports are used for preventing breaking changes
export const useSize = useFormSize
export const useDisabled = useFormDisabled
