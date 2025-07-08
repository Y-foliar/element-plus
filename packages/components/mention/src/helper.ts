import { ensureArray, isFirefox } from '@element-plus/utils'

import type { MentionCtx, MentionOption } from './types'

export const filterOption = (
  pattern: string,
  option: MentionOption
): boolean => {
  const lowerCase = pattern.toLowerCase()
  const label = option.label || option.value
  return label.toLowerCase().includes(lowerCase)
}
/*
从光标位置开始向左扫描遇到的第一个

输入@123;(光标)@1234;
end: 4
pattern: "123"
prefix: "@"
prefixIndex: 0
selectionEnd: 5
splitIndex: 4
start: 1

@qqq@123;(光标)@1234;
end: 8
pattern: "123"
prefix: "@"
prefixIndex: 4
selectionEnd: 9
splitIndex: 8
start: 5
**/
export const getMentionCtx = (
  inputEl: HTMLInputElement | HTMLTextAreaElement,
  prefix: string | string[],
  split: string
) => {
  // 增强字符串的处理能力 算法能力
  // 表示所选文本的结束索引。当没有选择时，这将返回当前文本输入光标位置后紧接着的字符的偏移量。ab(光标)c, 则值为2, abc, 值为3
  const { selectionEnd } = inputEl
  if (selectionEnd === null) return
  const inputValue = inputEl.value
  // ensureArray把不是array的数据转为array, 比如'@'转为['@']
  const prefixArray = ensureArray(prefix)
  let splitIndex = -1
  let mentionCtx: MentionCtx | undefined
  /**
    @qqq@123;@1234;(光标)

    char ; i 14 第一个字符为光标的前一个
    char 4 i 13
    char 3 i 12
    char 2 i 11
    char 1 i 10
    char @ i 9

    end: 14
    pattern: "1234"
    prefix: "@"
    prefixIndex: 9
    selectionEnd: 15
    splitIndex: 14
    start: 10


    @qqq@123;@1234(光标)

    char 4 i 13
    char 3 i 12
    char 2 i 11
    char 1 i 10
    char @ i 9

    end: 14
    pattern: "1234"
    prefix: "@"
    prefixIndex: 9
    selectionEnd: 14
    splitIndex: -1
    start: 10
   * */
  for (let i = selectionEnd - 1; i >= 0; --i) {
    const char = inputValue[i]
    if (char === split || char === '\n' || char === '\r') {
      splitIndex = i
      continue
    }
    if (prefixArray.includes(char)) {
      const end = splitIndex === -1 ? selectionEnd : splitIndex
      const pattern = inputValue.slice(i + 1, end)
      mentionCtx = {
        pattern, // 匹配到的最后一个prefix后的到spkit之间的字符,  输入 "@JohnDoe"，则 pattern 是 "JohnDoe", 输入 "@123@", 则 pattern 是 "", 输入 "@123@1234;123", 则 pattern 是 "1234",
        start: i + 1, // pattern开始的下标 (输入框第一位字符的下标是0, 输入 "@123@1234;123", 则 start 是 "5")
        end, // pattern结束的下标, 输入 "@123@1234;123" 或者"@123@1234", 则 end 都是 "9", 如果光标位于输入末尾且没有分隔符，那么 end 会是整个提及模式的结束处；如果有分隔符，则结束位置会是分隔符的位置。
        prefix: char, // 识别提及的前缀字符, 如@
        prefixIndex: i, // 最后一个prefix下标, 输入 "@123@1234;123" 则是 4
        splitIndex, // 最后一个分隔符下标
        selectionEnd, // 所选文本的结束索引,如上述描述
      }
      break
    }
  }
  return mentionCtx
}

/**
 * fork from textarea-caret-position
 * https://github.com/component/textarea-caret-position
 * The MIT License (MIT)
 * Copyright (c) 2015 Jonathan Ong me@jongleberry.com
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
// 这里用的是textarea-caret-position的实现
export const getCursorPosition = (
  element: HTMLInputElement | HTMLTextAreaElement,
  options = {
    debug: false,
    useSelectionEnd: false,
  }
) => {
  const selectionStart =
    element.selectionStart !== null ? element.selectionStart : 0
  const selectionEnd = element.selectionEnd !== null ? element.selectionEnd : 0
  const position = options.useSelectionEnd ? selectionEnd : selectionStart
  // We'll copy the properties below into the mirror div.
  // Note that some browsers, such as Firefox, do not concatenate properties
  // into their shorthand (e.g. padding-top, padding-bottom etc. -> padding),
  // so we have to list every single property explicitly.
  const properties: string[] = [
    'direction', // RTL support
    'boxSizing',
    'width', // on Chrome and IE, exclude the scrollbar, so the mirror div wraps exactly as the textarea does
    'height',
    'overflowX',
    'overflowY', // copy the scrollbar for IE
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    // https://developer.mozilla.org/en-US/docs/Web/CSS/font
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration', // might not make a difference, but better be safe
    'letterSpacing',
    'wordSpacing',
    'tabSize',
    'MozTabSize',
  ]

  if (options.debug) {
    const el = document.querySelector(
      '#input-textarea-caret-position-mirror-div'
    )
    if (el?.parentNode) el.parentNode.removeChild(el)
  }

  // The mirror div will replicate the textareas style
  const div = document.createElement('div')
  div.id = 'input-textarea-caret-position-mirror-div'
  document.body.appendChild(div)

  const style = div.style
  // getComputedStyle 方法在浏览器中用于获取指定元素的计算样式。这些计算样式是由浏览器解析后的最终样式属性值，
  // 包括了所有应用的 CSS 规则，例如内联样式、内部样式表和外部样式表。
  // getComputedStyle 是开发者在处理元素样式时的强大工具，尤其是在需要动态读取或计算页面布局信息时。
  const computed = window.getComputedStyle(element)

  const isInput = element.nodeName === 'INPUT'

  // Default textarea styles
  style.whiteSpace = isInput ? 'nowrap' : 'pre-wrap'
  if (!isInput) style.wordWrap = 'break-word' // only for textarea-s

  // Position off-screen
  style.position = 'absolute' // required to return coordinates properly
  if (!options.debug) style.visibility = 'hidden' // not 'display: none' because we want rendering

  // Transfer the element's properties to the div
  properties.forEach((prop) => {
    if (isInput && prop === 'lineHeight') {
      // Special case for <input>s because text is rendered centered and line height may be != height
      if (computed.boxSizing === 'border-box') {
        const height = Number.parseInt(computed.height as string)
        const outerHeight =
          Number.parseInt(computed.paddingTop as string) +
          Number.parseInt(computed.paddingBottom as string) +
          Number.parseInt(computed.borderTopWidth as string) +
          Number.parseInt(computed.borderBottomWidth as string)
        const targetHeight =
          outerHeight + Number.parseInt(computed.lineHeight as string)
        if (height > targetHeight) {
          style.lineHeight = `${height - outerHeight}px`
        } else if (height === targetHeight) {
          style.lineHeight = computed.lineHeight
        } else {
          style.lineHeight = '0'
        }
      } else {
        style.lineHeight = computed.height
      }
    } else {
      style[prop as any] = computed[prop as any]
    }
  })

  if (isFirefox()) {
    // Firefox lies about the overflow property for textareas: https://bugzilla.mozilla.org/show_bug.cgi?id=984275
    if (element.scrollHeight > Number.parseInt(computed.height as string)) {
      style.overflowY = 'scroll'
    }
  } else {
    style.overflow = 'hidden' // for Chrome to not render a scrollbar; IE keeps overflowY = 'scroll'
  }

  div.textContent = element.value.slice(0, Math.max(0, position))
  // The second special handling for input type="text" vs textarea:
  // spaces need to be replaced with non-breaking spaces - http://stackoverflow.com/a/13402035/1269037
  if (isInput && div.textContent) {
    div.textContent = div.textContent.replace(/\s/g, '\u00A0')
  }

  const span = document.createElement('span')
  // Wrapping must be replicated *exactly*, including when a long word gets
  // onto the next line, with whitespace at the end of the line before (#7).
  // The  *only* reliable way to do that is to copy the *entire* rest of the
  // textareas content into the <span> created at the caret position.
  // For inputs, just '.' would be enough, but no need to bother.
  span.textContent = element.value.slice(Math.max(0, position)) || '.' // || because a completely empty faux span doesn't render at all
  span.style.position = 'relative'
  span.style.left = `${-element.scrollLeft}px`
  span.style.top = `${-element.scrollTop}px`
  div.appendChild(span)
  // top 值代表了光标（插入符号）顶点到镜像 div 顶部的距离，纵向坐标
  // left 表示光标（插入符号）相对于文本区域（textarea）或输入框（input）的左边界的水平距离。这是光标所在位置的横向坐标。
  // 这里height没有用行高，而是字号大小固定乘以1.5的行高
  const relativePosition = {
    top: span.offsetTop + Number.parseInt(computed.borderTopWidth as string),
    left: span.offsetLeft + Number.parseInt(computed.borderLeftWidth as string),
    // We don't use line-height since it may be too large for position. Eg. 34px
    // for input
    height: Number.parseInt(computed.fontSize as string) * 1.5,
  }

  if (options.debug) {
    span.style.backgroundColor = '#aaa'
  } else {
    document.body.removeChild(div)
  }

  if (relativePosition.left >= element.clientWidth) {
    relativePosition.left = element.clientWidth
  }
  return relativePosition
}
