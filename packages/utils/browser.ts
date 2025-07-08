// @vueuse/core库中有判断环境的方法
import { isClient, isIOS } from '@vueuse/core'

export const isFirefox = (): boolean =>
  isClient && /firefox/i.test(window.navigator.userAgent)

export { isClient, isIOS }
