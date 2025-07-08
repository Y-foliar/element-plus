<template>
  <!-- ns.b(): el-mention    ns.is 根据disabled动态添加disabled class -->
  <div ref="wrapperRef" :class="[ns.b(), ns.is('disabled', disabled)]">
    <!-- mergeProps: 合并多个 props 对象 -->
    <!-- passInputProps: 传入的mentionProps中提取出input的属性，与传入的但未在mention组件定义的属性，这两者合并 -->
    <!-- $attrs: 传入组件的，除去组件声明的props和emit的其他属性 -->
    <!-- 这里用到显示绑定v-bind，绑定到el-input，因为透传attribute 会自动被添加到根元素上，el-input是内部元素，如果想要透传attribute应用到内部元素，需要显示绑定 -->
    <!-- 透传attribute: 指的是传递给一个组件，但是没有被组件声明的props或emits的属性attribute或者v-on事件监听器 https://cn.vuejs.org/guide/components/attrs -->
    <!-- combobox: 组合框，表示input会控制另一个元素自动弹出，帮助用户设置输入的值， dropdownVisible为true的时候role设置为combobox， https://www.cnblogs.com/kunmomo/p/11557965.html-->
    <!-- aria-activedescendant：是当前活跃/聚焦元素的 id  -->
    <!-- hoveringId：由contentId（useId生成的唯一id， 是mention-dropdown组件中el-scrollbar的id）和hoveringIndex组成  -->
    <!-- aria-controls：指示当前元素控制的另一个元素或多个元素 -->
    <!-- aria-expanded：元素是展开还是折叠 -->
    <!-- ariaLabel是inputProps中声明的 -->
    <!-- aria-autocomplete: 自动填充 -->
    <!-- aria-haspopup：弹出元素的类型 -->
    <el-input
      v-bind="mergeProps(passInputProps, $attrs)"
      ref="elInputRef"
      :model-value="modelValue"
      :disabled="disabled"
      :role="dropdownVisible ? 'combobox' : undefined"
      :aria-activedescendant="dropdownVisible ? hoveringId || '' : undefined"
      :aria-controls="dropdownVisible ? contentId : undefined"
      :aria-expanded="dropdownVisible || undefined"
      :aria-label="ariaLabel"
      :aria-autocomplete="dropdownVisible ? 'none' : undefined"
      :aria-haspopup="dropdownVisible ? 'listbox' : undefined"
      @input="handleInputChange"
      @keydown="handleInputKeyDown"
      @mousedown="handleInputMouseDown"
    >
      <!-- template：插入到input提供的插槽 -->
      <!--  $slots：包含所有传递给当前组件的插槽的引用
            const slots = {
              default: () => [/* VNodes representing default slot content */],
              header: () => [/* VNodes representing header slot content */],
              footer: () => [/* VNodes representing footer slot content */],
            };
            所以v-for="(_, name) in $slots"， _是值，name是键
      -->
      <!-- #：是v-slot的简写，比如<template v-slot:header>可以简写为<template #header>, 意思是将这部分的模板片段传入到子组件的header插槽中。在这里，是将<slot :name="name" v-bind="slotProps" />传入到input的对应插槽中 -->
      <!-- slotProps：子组件，即插槽提供者，给父组件传递的子组件自身的属性，即父组件可以使用子组件暴露的属性，在这里，通过v-bind="slotProps"，input最终暴露属性给引用mention的组件 -->
      <!-- jsx 你可以看下 antdv 中 例如table 等组件源码就可以看到例子， 大体是 render 函数中 吧 this.$slot 传递到被封装的组件中。$slot 有scope name 等细节自己琢磨 https://segmentfault.com/q/1010000041492730 -->
      <template v-for="(_, name) in $slots" #[name]="slotProps">
        <!-- slot是mention定义的插槽，给引用mention的组件插入内容，插槽名称与input提供的插槽相同，即引用mention的组件插入的内容最终传入插入到input的插槽，这里只是一个传递 -->
        <slot :name="name" v-bind="slotProps" />
      </template>
    </el-input>
    <!--
      fallbackPlacements: https://popper.js.org/docs/v2/modifiers/flip/#fallbackplacements
      如果 popper 的位置设置为bottom，但没有足够的空间将 popper 定位到该方向，则默认情况下，popper 的位置将更改为top。一旦检测到足够的空间，位置将恢复到最初定义（或首选）的位置。
      您还可以通过提供可供尝试的展示位置列表来定义后备展示位置。当首选展示位置上没有可用空间时，修改器将测试列表中提供的展示位置，并使用第一个可用的展示位置。
    -->
    <el-tooltip
      ref="tooltipRef"
      :visible="dropdownVisible"
      :popper-class="[ns.e('popper'), popperClass]"
      :popper-options="popperOptions"
      :placement="computedPlacement"
      :fallback-placements="computedFallbackPlacements"
      effect="light"
      pure
      :offset="offset"
      :show-arrow="showArrow"
    >
      <!-- Tooltip 触发 & 引用的元素，这里的cursorStyle相当于是覆盖光标的一个div，包括位置top left和高度height, 然后在这个div下弹出dropdown, 相当于在光标下弹出 -->
      <template #default>
        <div :style="cursorStyle" />
      </template>
      <template #content>
        <el-mention-dropdown
          ref="dropdownRef"
          :options="filteredOptions"
          :disabled="disabled"
          :loading="loading"
          :content-id="contentId"
          :aria-label="ariaLabel"
          @select="handleSelect"
          @click.stop="elInputRef?.focus"
        >
          <template v-for="(_, name) in $slots" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps" />
          </template>
        </el-mention-dropdown>
      </template>
    </el-tooltip>
  </div>
</template>

<script lang="ts" setup>
import { computed, mergeProps, nextTick, ref } from 'vue'
import { pick } from 'lodash-unified'
import { useFocusController, useId, useNamespace } from '@element-plus/hooks'
import ElInput, { inputProps } from '@element-plus/components/input'
import ElTooltip from '@element-plus/components/tooltip'
import { EVENT_CODE, UPDATE_MODEL_EVENT } from '@element-plus/constants'
import { useFormDisabled } from '@element-plus/components/form'
import { isFunction } from '@element-plus/utils'
import { mentionEmits, mentionProps } from './mention'
import { getCursorPosition, getMentionCtx } from './helper'
import ElMentionDropdown from './mention-dropdown.vue'

import type { Placement } from '@popperjs/core'
import type { CSSProperties, ComputedRef, Ref } from 'vue'
import type { InputInstance } from '@element-plus/components/input'
import type { TooltipInstance } from '@element-plus/components/tooltip'
import type { MentionCtx, MentionOption } from './types'

defineOptions({
  name: 'ElMention',
  inheritAttrs: false, // 组件将不会自动将未声明为 props 的特性应用到组件的根元素。 $attrs
})

const props = defineProps(mentionProps)
// defineEmits 可以接受两种形式的参数，数组和对象
// 对象: 用于定义事件及其参数验证规则。这种方式不仅定义了事件名称，还提供了每个事件的参数验证函数
// 每个键是事件名称，值是一个验证函数，用于检查传递给事件的参数是否符合预期。
const emit = defineEmits(mentionEmits)
// 从props中，选出key在inputProps的属性，形成新的对象，即在传入的属性中挑选出el-input的属性
const passInputProps = computed(() => pick(props, Object.keys(inputProps)))
// class空间
const ns = useNamespace('mention')
const disabled = useFormDisabled()
// 为组件生成一个唯一的 ID, 细节目前每太看明白
const contentId = useId()
// el-input 组件实例的引用
// export type InputInstance = InstanceType<typeof Input>
const elInputRef = ref<InputInstance>()
const tooltipRef = ref<TooltipInstance>()
// dropdownRef: ElMentionDropdown 组件实例的类型
// InstanceType<T> 是一个 TypeScript 内置的工具类型，它返回构造函数 T 所生成实例的类型
// 调用 ref() 不传入初始值，使得 dropdownRef 的初始值为 undefined。通常会在组件挂载后通过模板中的 ref 属性绑定到实际的 DOM 元素或组件实例。
const dropdownRef = ref<InstanceType<typeof ElMentionDropdown>>()

const visible = ref(false)
// 光标所在位置,用来帮助定位下拉框的位置
const cursorStyle = ref<CSSProperties>()
const mentionCtx = ref<MentionCtx>()

const computedPlacement = computed<Placement>(() =>
  props.showArrow ? props.placement : `${props.placement}-start`
)

const computedFallbackPlacements = computed<Placement[]>(() =>
  props.showArrow ? ['bottom', 'top'] : ['bottom-start', 'top-start']
)
// computed: 创建计算属性的函数, 计算属性会在其依赖的响应式数据发生变化时自动重新计算其值
const filteredOptions = computed(() => {
  const { filterOption, options } = props
  if (!mentionCtx.value || !filterOption) return options
  return options.filter((option) =>
    // 根据某种规则过滤选项
    filterOption(mentionCtx.value!.pattern, option)
  )
})

const dropdownVisible = computed(() => {
  return visible.value && (!!filteredOptions.value.length || props.loading)
})
// 下拉框选项中hover的条目
const hoveringId = computed(() => {
  return `${contentId.value}-${dropdownRef.value?.hoveringIndex}`
})

const handleInputChange = (value: string) => {
  emit('update:modelValue', value)
  syncAfterCursorMove()
}

const handleInputKeyDown = (event: KeyboardEvent | Event) => {
  if (!('code' in event) || elInputRef.value?.isComposing) return

  switch (event.code) {
    case EVENT_CODE.left:
    case EVENT_CODE.right:
      syncAfterCursorMove()
      break
    case EVENT_CODE.up:
    case EVENT_CODE.down:
      if (!visible.value) return
      event.preventDefault()
      dropdownRef.value?.navigateOptions(
        event.code === EVENT_CODE.up ? 'prev' : 'next'
      )
      break
    case EVENT_CODE.enter:
    case EVENT_CODE.numpadEnter:
      if (!visible.value) return
      event.preventDefault()
      if (dropdownRef.value?.hoverOption) {
        dropdownRef.value?.selectHoverOption()
      } else {
        visible.value = false
      }
      break
    case EVENT_CODE.esc:
      if (!visible.value) return
      event.preventDefault()
      visible.value = false
      break
    case EVENT_CODE.backspace:
      // 整体删除
      if (props.whole && mentionCtx.value) {
        const { splitIndex, selectionEnd, pattern, prefixIndex, prefix } =
          mentionCtx.value
        const inputEl = getInputEl()
        if (!inputEl) return
        const inputValue = inputEl.value
        const matchOption = props.options.find((item) => item.value === pattern)
        const isWhole = isFunction(props.checkIsWhole)
          ? props.checkIsWhole(pattern, prefix)
          : matchOption
        if (isWhole && splitIndex !== -1 && splitIndex + 1 === selectionEnd) {
          event.preventDefault()
          const newValue =
            inputValue.slice(0, prefixIndex) + inputValue.slice(splitIndex + 1)
          emit(UPDATE_MODEL_EVENT, newValue)

          const newSelectionEnd = prefixIndex
          nextTick(() => {
            // input value is updated
            inputEl.selectionStart = newSelectionEnd
            inputEl.selectionEnd = newSelectionEnd
            syncDropdownVisible()
          })
        }
      }
  }
}

const { wrapperRef } = useFocusController(elInputRef, {
  beforeFocus() {
    return disabled.value
  },
  afterFocus() {
    syncAfterCursorMove()
  },
  beforeBlur(event) {
    return tooltipRef.value?.isFocusInsideContent(event)
  },
  afterBlur() {
    visible.value = false
  },
})

const handleInputMouseDown = () => {
  syncAfterCursorMove()
}

/*
感觉有bug, 从提及中间删除，乱输入，然后再选中某个提及，会有后面一段
比如下拉中有Fuphoenixes，输入框中@Fuphoenixs @kooriookami
光标放在x后，@Fuphoenix（光标）s @kooriookami ，选中下拉框选项Fuphoenixes，输入框变成@Fuphoenixes s @kooriookami
不过也有可能是在两个提及见要有其他的文案，不然两提及前的文案就没有了，如果是这样，那没有问题，比如两个人名间，有插入一段话，但我感觉分隔符前的要替换吧
**/
const handleSelect = (item: MentionOption) => {
  if (!mentionCtx.value) return
  const inputEl = getInputEl()
  if (!inputEl) return
  const inputValue = inputEl.value
  const { split } = props
  /*
  item.value = "werzxc"
  "@1234;wer(光标)"
  newEndPart         ;wer
  alreadySeparated   true
  newMiddlePart      werzxc
  newValue           @ + werzxc + ;wer  => @werzxc;wer


  item.value = "werzxc"
  "@1234;@wer(光标)"
  newEndPart         ''
  alreadySeparated   false
  newMiddlePart      werzxc;
  newValue           @1234;@ + werzxc; + ''  => @1234;@werzxc

  **/
  const newEndPart = inputValue.slice(mentionCtx.value.end) // 从提及结束位置到输入框末尾的文本 "@1234;wer" ";wer"
  const alreadySeparated = newEndPart.startsWith(split) // 检查提及之后的文本是否已经以分隔符开头。 如上行的例子为true
  const newMiddlePart = `${item.value}${alreadySeparated ? '' : split}`

  const newValue =
    inputValue.slice(0, mentionCtx.value.start) + newMiddlePart + newEndPart

  emit(UPDATE_MODEL_EVENT, newValue)
  emit('select', item, mentionCtx.value.prefix)

  const newSelectionEnd =
    mentionCtx.value.start + newMiddlePart.length + (alreadySeparated ? 1 : 0)

  nextTick(() => {
    // input value is updated
    inputEl.selectionStart = newSelectionEnd
    inputEl.selectionEnd = newSelectionEnd
    inputEl.focus()
    syncDropdownVisible()
  })
}
// 获取input dom元素
const getInputEl = () =>
  props.type === 'textarea'
    ? elInputRef.value?.textarea
    : elInputRef.value?.input

// 光标变化后,重新计算光标位置, 更新下拉框的显示隐藏, 更新下拉框数据
const syncAfterCursorMove = () => {
  // can't use nextTick(), get cursor position will be wrong
  setTimeout(() => {
    syncCursor()
    syncDropdownVisible()
    nextTick(() => tooltipRef.value?.updatePopper())
  }, 0)
}
// 根据光标,重新计算cursorStyle.value, absolute定位, 相对于el-mention的根元素
const syncCursor = () => {
  const inputEl = getInputEl()
  if (!inputEl) return
  // 光标位置
  const caretPosition = getCursorPosition(inputEl)
  // DOMRect对象 对象包含元素的大小及其相对于视口的位置
  // input元素
  const inputRect = inputEl.getBoundingClientRect()
  // el-input元素，最外层的div  $el dom元素
  const elInputRect = elInputRef.value!.$el.getBoundingClientRect()

  cursorStyle.value = {
    position: 'absolute',
    width: 0,
    height: `${caretPosition.height}px`,
    left: `${caretPosition.left + inputRect.left - elInputRect.left}px`,
    top: `${caretPosition.top + inputRect.top - elInputRect.top}px`,
  }
}
// 检测用户是否正在输入一个有效的提及模式，并适时地显示或隐藏相关的建议下拉菜单。
const syncDropdownVisible = () => {
  const inputEl = getInputEl()
  // document.activeElement: 返回当前获得焦点的元素, 如果不是input,则visible为false
  if (document.activeElement !== inputEl) {
    visible.value = false
    return
  }
  // prefix: 触发字段的前缀如@
  // split: 用于拆分提及的字符。 字符串长度必须且只能为 1, 默认' '
  const { prefix, split } = props
  mentionCtx.value = getMentionCtx(inputEl, prefix, split)
  // 比如想输入@1234 在输入@12的时候会出现下拉框 在"@1234;" 或者"@1234 " 有分隔符的时候, 这个时候已经不用下拉框了, 因为这个提及已经结束
  if (mentionCtx.value && mentionCtx.value.splitIndex === -1) {
    visible.value = true
    emit('search', mentionCtx.value.pattern, mentionCtx.value.prefix)
    return
  }
  visible.value = false
}

defineExpose<{
  input: Ref<InputInstance | undefined>
  tooltip: Ref<TooltipInstance | undefined>
  dropdownVisible: ComputedRef<boolean>
}>({
  input: elInputRef,
  tooltip: tooltipRef,
  dropdownVisible,
})
</script>
