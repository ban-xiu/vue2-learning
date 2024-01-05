## new Vue 发生了什么

构造函数在 src\core\instance\index.ts 中，它调用从 src\core\instance\init.ts 引入的 _init 方法，主要实现了：

- 合并配置 $option
- 初始化生命周期 life
- 初始化事件 event
- 初始化渲染 render
- beforeCreate 与 inject
- 初始化数据 data method props computed watch 等
- provide 与 create
- 如果有 el 配置，则将 vm 实例挂载

### 实例挂载的实现

src\platforms\web\runtime\index.ts 中，定义了 Vue 的原型方法 $mount，它实现了挂载的逻辑：

- 调用 mountComponent 方法，实现组件的挂载
- 判断是否有 render 函数，如果没有则将 render 函数 设置为 createEmptyVNode 函数，用于创建一个空的 vnode

在 src\core\instance\lifecycle.ts 中，定义了 mountComponent 方法，它实现了组件的挂载：

- 调用 beforeMount 钩子
- 定义 updateComponent 方法
- 初始化渲染 watcher，在它的回调函数中会调用 updateComponent 方法
- 调用 updateComponent 中的 vm._render 方法，生成 vnode
- 调用 updateComponent 中的 vm._update 方法，更新 dom
- 调用 mounted 钩子

### render 方法的实现

在 src\core\instance\render.ts 中，定义了 Vue 的原型方法 _render，它实现了 render 方法的逻辑：

实际上是调用了 createElement 方法，生成 vnode

在 src\core\vdom\create-element.ts 中，定义了 createElement 方法，它实现了创建 vnode 的逻辑：

- createElement 方法是对 _createElement 方法的封装，使得传参更灵活
- _createElement 方法有 5 个参数：context 表示 vnode 的上下文环境，tag 表示标签，data 表示 vnode 的数据，children 表示当前 vnode 的子节点，normalizationType 表示子节点规范的类型，通过 new Vnode 实现
- 根据传入参数的不同类型返回相对应的 vnode

### update 方法的实现

src/core/instance/lifecycle.ts 中，定义了 Vue 的原型方法 _update，它实现了 update 方法的逻辑：

- 它被调用的时机有 2 个，一个是首次渲染，一个是数据更新的时候
- _update 实际上调用了 vm.\__patch\__ 方法，实现 dom 的更新
- vm.\__patch\__ 实际上返回了 patch 方法，它实现了真正的 dom 更新
- patch 方法接收 3 个参数：oldVnode 表示旧的 vnode，vnode 表示经过 render 处理后新的 vnode，hydrating 表示是否在服务器端渲染
- patch 方法内部调用 createElm 方法，通过虚拟节点创建真实的 dom 并插入到它的父节点中
- 调用 createChildren 方法去创建子元素，实际上是遍历子虚拟节点，递归调用 createElm 方法

### 总结

new Vue -> init -> $mount -> render -> vnode -> patch -> dom









