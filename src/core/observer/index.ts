import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  isArray,
  hasProto,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering,
  hasChanged,
  noop
} from '../util/index'
import { isReadonly, isRef, TrackOpTypes, TriggerOpTypes } from '../../v3'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

const NO_INITIAL_VALUE = {}

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving(value: boolean) {
  shouldObserve = value
}

// ssr mock dep
const mockDep = {
  notify: noop,
  depend: noop,
  addSub: noop,
  removeSub: noop
} as Dep

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
export class Observer {
  dep: Dep
  vmCount: number // number of vms that have this object as root $data

  constructor(public value: any, public shallow = false, public mock = false) {
    // this.value = value

    // 实例化一个 Dep
    this.dep = mock ? mockDep : new Dep()

    this.vmCount = 0

    // 执行 def 函数把自身实例添加到数据对象 value 的 __ob__ 属性上
    def(value, '__ob__', this)

    // 如果 value 是数组会调用 observeArray 方法
    if (isArray(value)) {
      if (!mock) {

        // 使用重写的数组方法
        if (hasProto) {

          // 让该数组的 __proto__ 指向 arrayMethods
          /* eslint-disable no-proto */
          ;(value as any).__proto__ = arrayMethods
          /* eslint-enable no-proto */
        } else {
          for (let i = 0, l = arrayKeys.length; i < l; i++) {
            const key = arrayKeys[i]
            def(value, key, arrayMethods[key])
          }
        }
      }
      if (!shallow) {

        // 相当于重复调用 observe 方法
        this.observeArray(value)

      }
    } else {
      /**
       * Walk through all properties and convert them into
       * getter/setters. This method should only be called when
       * value type is Object.
       */

      // 如果 value 是对象则会遍历对象的 key 调用 defineReactive 方法
      const keys = Object.keys(value)
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]

        // 最终执行 defineReactive 方法
        defineReactive(value, key, NO_INITIAL_VALUE, undefined, shallow, mock)

      }
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray(value: any[]) {
    for (let i = 0, l = value.length; i < l; i++) {
      observe(value[i], false, this.mock)
    }
  }
}

// helpers

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */

// 注意 observe
export function observe(
  value: any,
  shallow?: boolean,
  ssrMockReactivity?: boolean
): Observer | void {

  // 如果已经有了 Observer 类则直接将它返回
  if (value && hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    return value.__ob__
  }
  if (
    shouldObserve &&
    (ssrMockReactivity || !isServerRendering()) &&
    (isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value.__v_skip /* ReactiveFlags.SKIP */ &&
    !isRef(value) &&
    !(value instanceof VNode)
  ) {

    // 添加 Observer 类，它的作用是给对象的属性添加 getter 和 setter，用于依赖收集和派发更新
    return new Observer(value, shallow, ssrMockReactivity)
  }
}

/**
 * Define a reactive property on an Object.
 */

// 注意 defineReactive
export function defineReactive(
  obj: object,
  key: string,
  val?: any,
  customSetter?: Function | null,
  shallow?: boolean,
  mock?: boolean,
  observeEvenIfShallow = false
) {

  // 实例化一个 Dep
  const dep = new Dep()

  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  if (
    (!getter || setter) &&
    (val === NO_INITIAL_VALUE || arguments.length === 2)
  ) {
    val = obj[key]
  }

  // 对子对象递归调用 observe 方法
  // 保证了无论 obj 的结构多复杂，它的所有子属性也能变成响应式的对象
  // 当访问或修改 obj 中一个嵌套较深的属性，也能触发 getter 和 setter
  // childOb 实际上就是 __ob__
  let childOb = shallow ? val && val.__ob__ : observe(val, false, mock)

  // 利用 Object.defineProperty 去给 obj 的属性 key 添加 getter 和 setter
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,

    // 注意 reactiveGetter
    get: function reactiveGetter() {

      // 注意 value 
      const value = getter ? getter.call(obj) : val

      if (Dep.target) {

        // 触发 getter 时会通过 dep.depend 做依赖收集
        if (__DEV__) {
          dep.depend({
            target: obj,
            type: TrackOpTypes.GET,
            key
          })
        } else {
          dep.depend()
        }

        // 注意，Vue.set 会走该流程 
        if (childOb) {
          childOb.dep.depend()
          if (isArray(value)) {

            // 如果 value 是个数组，那么就通过 dependArray 对数组每个元素做依赖收集
            dependArray(value)
          }
        }
      }

      // 返回当前属性值
      return isRef(value) && !shallow ? value.value : value

    },

    // 注意 reactiveSetter
    set: function reactiveSetter(newVal) {
      const value = getter ? getter.call(obj) : val
      if (!hasChanged(value, newVal)) {
        return
      }
      if (__DEV__ && customSetter) {
        customSetter()
      }
      if (setter) {
        setter.call(obj, newVal)
      } else if (getter) {
        // #7981: for accessor properties without setter
        return
      } else if (!shallow && isRef(value) && !isRef(newVal)) {
        value.value = newVal
        return
      } else {
        val = newVal
      }

      // 注意
      childOb = shallow ? newVal && newVal.__ob__ : observe(newVal, false, mock)

      // 派发更新的核心为 dep.notify
      if (__DEV__) {
        dep.notify({
          type: TriggerOpTypes.SET,
          target: obj,
          key,
          newValue: newVal,
          oldValue: value
        })
      } else {
        dep.notify()
      }
    }
  })

  return dep
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */

// 注意 set
export function set<T>(array: T[], key: number, value: T): T
export function set<T>(object: object, key: string | number, value: T): T

// set 方法接收 3个参数，一般来说，target 可能是数组或者是普通对象，key 代表的是数组的下标或者是对象的键值，val 代表添加的值
export function set(
  target: any[] | Record<string, any>,
  key: any,
  val: any
): any {
  if (__DEV__ && (isUndef(target) || isPrimitive(target))) {
    warn(
      `Cannot set reactive property on undefined, null, or primitive value: ${target}`
    )
  }
  if (isReadonly(target)) {
    __DEV__ && warn(`Set operation on key "${key}" failed: target is readonly.`)
    return
  }

  // 获取到 target.__ob__ 并赋值给 ob
  // target.__ob__ 是在 Observer 的构造函数执行的时候初始化的
  const ob = (target as any).__ob__

  // 如果 target 是数组且 key 是一个合法的下标，则会通过 splice 去添加进数组然后返回
  if (isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    // when mocking for SSR, array methods are not hijacked
    if (ob && !ob.shallow && ob.mock) {
      observe(val, false, true)
    }

    // 返回添加的值
    return val

  }

  // target 为对象时
  // 如果 key 已经存在于 target 中，则直接赋值返回，因为这样的变化是可以观测到的
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  if ((target as any)._isVue || (ob && ob.vmCount)) {
    __DEV__ &&
      warn(
        'Avoid adding reactive properties to a Vue instance or its root $data ' +
          'at runtime - declare it upfront in the data option.'
      )
    return val
  }

  // 如果 ob = target.__ob__ 不存在，则说明 target 不是一个响应式的对象，则直接赋值并返回
  if (!ob) {
    target[key] = val
    return val
  }

  // 把新添加的属性变成响应式对象
  defineReactive(ob.value, key, val, undefined, ob.shallow, ob.mock)

  if (__DEV__) {
    ob.dep.notify({
      type: TriggerOpTypes.ADD,
      target: target,
      key,
      newValue: val,
      oldValue: undefined
    })
  } else {
    ob.dep.notify()
  }
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del<T>(array: T[], key: number): void
export function del(object: object, key: string | number): void
export function del(target: any[] | object, key: any) {
  if (__DEV__ && (isUndef(target) || isPrimitive(target))) {
    warn(
      `Cannot delete reactive property on undefined, null, or primitive value: ${target}`
    )
  }
  if (isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target as any).__ob__
  if ((target as any)._isVue || (ob && ob.vmCount)) {
    __DEV__ &&
      warn(
        'Avoid deleting properties on a Vue instance or its root $data ' +
          '- just set it to null.'
      )
    return
  }
  if (isReadonly(target)) {
    __DEV__ &&
      warn(`Delete operation on key "${key}" failed: target is readonly.`)
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  if (__DEV__) {
    ob.dep.notify({
      type: TriggerOpTypes.DELETE,
      target: target,
      key
    })
  } else {
    ob.dep.notify()
  }
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray(value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    if (e && e.__ob__) {
      e.__ob__.dep.depend()
    }
    if (isArray(e)) {
      dependArray(e)
    }
  }
}
