import { ASSET_TYPES } from 'shared/constants'
import type { GlobalAPI } from 'types/global-api'
import { isFunction, isPlainObject, validateComponentName } from '../util/index'

// 相当于初始化了 3 个全局函数：
// src\shared\constants.ts 中的 ASSET_TYPES = ['component','directive','filter']
// 合并配置时已经创建了这 3 个全局函数的空对象，此时进行赋值
export function initAssetRegisters(Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  ASSET_TYPES.forEach(type => {
    // @ts-expect-error function is not exact same type
    Vue[type] = function (
      id: string,
      definition?: Function | Object
    ): Function | Object | void {
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (__DEV__ && type === 'component') {
          validateComponentName(id)
        }

        // 如果 type 是 component 且 definition 是一个对象
        // 通过 this.opitons._base.extend 把这个对象转换成一个继承于 Vue 的构造函数
        if (type === 'component' && isPlainObject(definition)) {
          // @ts-expect-error
          definition.name = definition.name || id
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && isFunction(definition)) {
          definition = { bind: definition, update: definition }
        }

        // 挂载到 Vue.options 上 
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
