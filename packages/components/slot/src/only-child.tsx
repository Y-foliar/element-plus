import {
  Comment,
  Fragment,
  Text,
  cloneVNode,
  defineComponent,
  inject,
  withDirectives,
} from 'vue'
import { NOOP, debugWarn, isObject } from '@element-plus/utils'
import {
  FORWARD_REF_INJECTION_KEY,
  useForwardRefDirective,
  useNamespace,
} from '@element-plus/hooks'

import type { Ref, VNode } from 'vue'

const NAME = 'ElOnlyChild'

export const OnlyChild = defineComponent({
  name: NAME,
  setup(_, { slots, attrs }) {
    const forwardRefInjection = inject(FORWARD_REF_INJECTION_KEY)
    const forwardRefDirective = useForwardRefDirective(
      forwardRefInjection?.setForwardRef ?? NOOP
    )
    return () => {
      const defaultSlot = slots.default?.(attrs)
      if (!defaultSlot) return null

      if (defaultSlot.length > 1) {
        debugWarn(NAME, 'requires exact only one valid child.')
        return null
      }

      const firstLegitNode = findFirstLegitChild(defaultSlot)
      if (!firstLegitNode) {
        debugWarn(NAME, 'no valid child node found')
        return null
      }
      // hly
      // 用这个方法，cloneVNode再添加自定义指令或者属性，这是可以对三方库的组件进行自定义改造的途径吗
      // 比如想给某个组件加属性或者指令，可以克隆vnode后再添加
      // 官方文档： https://cn.vuejs.org/api/render-function#withdirectives
      // 可以全局搜索一下cloneVNode还在element-plus哪里使用了，学习一下cloneVNode的妙用，多看开源库中cloneVNode的使用，慢慢的领悟这个方法的妙用
      return withDirectives(cloneVNode(firstLegitNode!, attrs), [
        [forwardRefDirective],
      ])
    }
  },
})

function findFirstLegitChild(node: VNode[] | undefined): VNode | null {
  if (!node) return null
  const children = node as VNode[]
  for (const child of children) {
    /**
     * when user uses h(Fragment, [text]) to render plain string,
     * this switch case just cannot handle, when the value is primitives
     * we should just return the wrapped string
     */
    if (isObject(child)) {
      switch (child.type) {
        case Comment:
          continue
        case Text:
        case 'svg':
          return wrapTextContent(child)
        case Fragment:
          return findFirstLegitChild(child.children as VNode[])
        default:
          return child
      }
    }
    return wrapTextContent(child)
  }
  return null
}

function wrapTextContent(s: string | VNode) {
  const ns = useNamespace('only-child')
  return <span class={ns.e('content')}>{s}</span>
}

export type OnlyChildExpose = {
  forwardRef: Ref<HTMLElement>
}
