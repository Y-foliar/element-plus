import { computed, onBeforeUnmount, ref, shallowRef, unref, watch } from 'vue'
import { createPopper } from '@popperjs/core'
import { fromPairs } from 'lodash-unified'

import type { Ref } from 'vue'
import type {
  Instance,
  Modifier,
  Options,
  State,
  VirtualElement,
} from '@popperjs/core'

type ElementType = HTMLElement | undefined
type ReferenceElement = ElementType | VirtualElement
export type PartialOptions = Partial<Options>

export const usePopper = (
  referenceElementRef: Ref<ReferenceElement>,
  popperElementRef: Ref<ElementType>,
  opts: Ref<PartialOptions> | PartialOptions = {} as PartialOptions
) => {
  const stateUpdater = {
    name: 'updateState',
    enabled: true,
    phase: 'write',
    fn: ({ state }) => {
      const derivedState = deriveState(state)

      Object.assign(states.value, derivedState)
    },
    requires: ['computeStyles'],
  } as Modifier<'updateState', any>

  const options = computed<Options>(() => {
    const { onFirstUpdate, placement, strategy, modifiers } = unref(opts)

    return {
      onFirstUpdate,
      placement: placement || 'bottom',
      strategy: strategy || 'absolute',
      modifiers: [
        ...(modifiers || []),
        stateUpdater,
        { name: 'applyStyles', enabled: false },
      ],
    }
  })

  const instanceRef = shallowRef<Instance | undefined>()
  const states = ref<Pick<State, 'styles' | 'attributes'>>({
    styles: {
      popper: {
        position: unref(options).strategy,
        left: '0',
        top: '0',
      },
      arrow: {
        position: 'absolute',
      },
    },
    attributes: {},
  })

  const destroy = () => {
    if (!instanceRef.value) return

    instanceRef.value.destroy()
    instanceRef.value = undefined
  }

  watch(
    options,
    (newOptions) => {
      const instance = unref(instanceRef)
      if (instance) {
        instance.setOptions(newOptions)
      }
    },
    {
      deep: true,
    }
  )

  watch(
    [referenceElementRef, popperElementRef],
    ([referenceElement, popperElement]) => {
      destroy()
      if (!referenceElement || !popperElement) return

      instanceRef.value = createPopper(
        referenceElement,
        popperElement,
        unref(options)
      )
    }
  )

  onBeforeUnmount(() => {
    destroy()
  })
  // hly:
  // 通过 unref 和 computed 的组合使用，我们能够确保返回的状态是响应式的、安全的
  // unref 可以确保无论 instanceRef 是一个普通对象还是一个 ref 对象，都可以正确地获取其内部的值。这种一致性对于兼容性和简化处理逻辑很重要。
  // 通过 computed 返回状态，能够创建一个封装层，这样外部代码不能直接修改 Popper 实例的内部状态。这保持了组件接口的纯净和稳定。
  return {
    state: computed(() => ({ ...(unref(instanceRef)?.state || {}) })),
    styles: computed(() => unref(states).styles),
    attributes: computed(() => unref(states).attributes),
    update: () => unref(instanceRef)?.update(),
    forceUpdate: () => unref(instanceRef)?.forceUpdate(),
    // Preventing end users from modifying the instance.
    instanceRef: computed(() => unref(instanceRef)),
  }
}

function deriveState(state: State) {
  const elements = Object.keys(state.elements) as unknown as Array<
    keyof State['elements']
  >

  const styles = fromPairs(
    elements.map(
      (element) =>
        [element, state.styles[element] || {}] as [
          string,
          State['styles'][keyof State['styles']]
        ]
    )
  )

  const attributes = fromPairs(
    elements.map(
      (element) =>
        [element, state.attributes[element]] as [
          string,
          State['attributes'][keyof State['attributes']]
        ]
    )
  )

  return {
    styles,
    attributes,
  }
}

export type UsePopperReturn = ReturnType<typeof usePopper>
