## 生命周期

最终执行生命周期的函数都是调用 callHook 方法，它的定义在 src\core\instance\lifecycle.ts 中：

- 根据传入的字符串 hook，去拿到 vm.$options[hook] 对应的回调函数数组，然后遍历执行，执行的时候把 vm 作为函数执行的上下文
- 在合并配置时各个阶段的生命周期的函数已经被合并到 vm.$options 里了
- callhook 函数的功能就是调用某个生命周期钩子注册的所有回调函数

### beforeCreate & created

在 src\core\instance\init.ts 中：

- beforeCreate 和 created 函数都是在实例化 Vue 的阶段，在 _init 方法中执行的
- beforeCreate 和 created 的钩子调用是在 initState 的前后，initState 的作用是初始化 props data methods watch computed 等属性
- beforeCreate 的钩子函数中就不能获取与调用到 initState 中的属性与方法
- 在这两个钩子函数执行的时候，并没有渲染 dom，所以也不能访问 dom

### beforeMount & mounted

在 src\core\instance\lifecycle.ts 中：

- 这两个钩子函数都是在 mountComponent 函数中调用，beforeMount 发生在 new Watcher -> vm._render（渲染 vnode） 之前，也就是在 mount（dom 挂载） 之前
- 在执行完 Watcher 中的 vm._update 把 vnode 给 patch 到真实 dom 后（通过 createElm 方法实现），会进行一个判断，如果 vm.$vnode 为空（表明这不是一次组件的初始化过程，而是通过外部 new Vue 初始化过程），才会执行 mounted 钩子
- 而组件的 vnode 被 patch 到 dom 后（通过 createElm 方法实现），会执行 invokeInsertHook 函数，把传入的 insertedVnodeQueue 里保存的钩子函数依次执行一遍
- invokeInsertHook 函数通过调用了 componentVNodeHooks 中的钩子函数 insert 实现功能，在 insert 内部调用了 mounted 钩子

### beforeUpdate & updated

- beforeUpdate 和 updated 的钩子函数执行时机都应该是在数据更新的时候
- beforeUpdate 是在 mountComponent 函数中的 Watcher 内的 before 函数中执行，当已经 mounted 同时没有 destroyed 时才会执行 beforeUpdate
- update 的执行时机是在在 src\core\observer\scheduler.ts 中的 flushSchedulerQueue 函数调用的时候
- flushSchedulerQueue 函数中调用了 callUpdatedHooks(updatedQueue) 方法，updatedQueue 是更新了的 Wathcer 数组，在 callUpdatedHooks 函数会遍历 updatedQueue，只有满足 Watcher 为 vm._watcher（当前组件的 Watcher） 以及组件已经 mounted 这两个条件，才会执行 updated 钩子函数
- 在实例化 Watcher 的过程中，在它的构造函数里会判断 isRenderWatcher（是否为一个渲染相关的 Watcher），接着把当前 watcher 的实例赋值给 vm._watcher，在 callUpdatedHooks 函数中，只有 vm._watcher 的回调执行完毕后，才会执行 updated 钩子函数

### beforeDestroy & destroyed

- beforeDestroy 和 destroyed 钩子函数的执行时机在组件销毁的阶段，组件的销毁过程之后会详细介绍，最终会调用 src\core\instance\lifecycle.ts 中的 $destroy 方法
- beforeDestroy 钩子函数的执行时机是在 $destroy 函数执行最开始的地方，接着执行了一系列的销毁动作，包括从 parent 的 $children 中删掉自身，删除 Watcher，当前渲染的 vnode 执行销毁钩子函数等，执行完毕后再调用 destroy 钩子函数
- 通过 vm.\__patch\__(vm._vnode, null) 触发子组件的销毁钩子函数，层层递归调用


