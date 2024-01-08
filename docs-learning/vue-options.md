## 合并配置

### 外部调用场景

在 src\core\instance\init.ts 中，当执行 new Vue 的时候，在执行 this._init(options) 的时候，就会执行 mergeOptions 方法去合并 options，合并完的结果保留在 vm.$options 中：

- 实际上就是把 resolveConstructorOptions(vm.constructor) 的返回值和 options 做合并，在 new Vue 的普通场景下， resolveConstructorOptions 还是简单返回 vm.constructor.options
- vm.constructor 相当于 Vue.options，在 initGlobalAPI(Vue) 的时候定义了这个值

 initGlobalAPI 的定义在 src\core\global-api\index.ts 中：

- 先通过 Vue.options = Object.create(null) 创建一个配置空对象，然后遍历 ASSET_TYPES 空对象组装到 Vue.options 中
- ASSET_TYPES 的定义在 src\shared\onstants.ts 中：包括了 component，directive，filter，3 个字符串
 
在 src\core\util\options.ts 中有 mergeOptions 方法的定义：

- mergeOptions 主要功能就是把 parent 和 child 这两个传入的对象参数根据一些合并策略，合并成一个新对象并返回
- 先递归把 extends 和 mixins 合并到 parent 上，然后遍历 parent，调用 mergeField，然后再遍历 child，如果 key 不在 parent 的自身属性上，则调用 mergeField
- mergeField 函数，它对不同的 key 有着不同的合并策略，通过执行 mergeField 函数，把合并后的结果保存到 options 对象中，最终返回它

### 组件场景

组件的构造函数 Sub 是通过 Vue.extend 继承自 Vue 的，代码定义在 src\core\global-api\extend.ts 中：

- 在 extend 方法中同样调用了 mergeOptions 方法，把传入的组件对象和 Vue.options 合并到 Sub.opitons
- 随着组件创建的流程，合并 options 的过程走到了 _init 方法中的 initInternalComponent(vm, options) 逻辑
- initInternalComponent 只是做了简单的一层对象赋值，合并完的结果保留在 vm.$options 中

### 总结

- 在 new Vue 的普通场景下执行 _init 方法中的 mergeOptions 方法去合并 options
- 在组件场景下执行 _init 方法中的 initInternalComponen 方法去合并 options
- 合并完的结果都保留在 vm.$options 中




