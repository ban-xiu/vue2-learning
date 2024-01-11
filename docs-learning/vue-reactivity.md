## 响应式原理

### 响应式对象

#### Object.defineProperty

- Object.defineProperty(obj, prop, descriptor) 方法会直接在一个对象上定义一个新属性，或者修改一个对象的现有属性， 并返回这个对象
- 对于 descriptor，它有很多可选键值，最核心的是 get 和 set
- get 是一个给属性提供的 getter 方法，当访问该属性的时候会触发 getter 方法；set 是一个给属性提供的 setter 方法，当修改该属性做的时候会触发 setter 方法

#### initState

在 Vue 的初始化阶段，_init 方法执行的时候，会执行 initState(vm) 方法，它的定义在 src\core\instance\state.ts 中；

相当于初始化了：props -> methods -> data -> watch -> computed 等，重点分析 props 与 data 的初始化，其实都是把它们变成响应式对象

##### initProps

initProps 方法的作用是遍历定义的 props 配置，然后：

- 调用 defineReactive 方法把每个 prop 对应的值变成响应式，即可以通过 vm._props.xxx 访问到对应属性
- 通过 proxy 把 vm._props.xxx 的访问代理到 vm.xxx 上

##### initData

initData 方法的作用是遍历定义的 data 函数的返回对象，然后：

- 通过 proxy 把每一个 vm._data.xxx 都代理到 vm.xxx 上
- 调用 observe 方法观测整个 data 的变化，把 data 也变成响应式，即可以通过 vm._data.xxx 访问到定义的 data 返回函数中对应的属性

##### proxy

在 proxy 方法中，通过 Object.defineProperty 把 vm._xxx.xxx 的读写转化成 vm.xxx，就可以使用 this.xxx 访问

##### observe

- observe 方法的作用就是给非 vnode 的对象类型数据添加一个 Observer 类
- Observer 类的作用是给对象的属性添加 getter 和 setter，用于依赖收集和派发更新
- Observer 类的构造函数中首先实例化了 Dep 对象（Vue.set 中会使用到），接着通过执行 def 函数把自身实例添加到数据对象 value 的 \__ob\__ 属性上
- 接下来会对 value 做判断，如果 value 为数组会调用 observeArray 方法（遍历数组再次调用 observe 方法），如果 vaule 是对象则会遍历对象的 key 调用 defineReactivey 方法

##### defineReactive

defineReactive 的功能就是定义一个响应式对象，给对象动态添加 getter 和 setter

在 defineReactivey 方法中，首先实例化了 Dep 对象，接着拿到传入对象 obj 的属性描述符，然后对子对象递归调用 observe 方法（保证了无论 obj 的结构多复杂，它的所有子属性也能变成响应式的对象，当访问或修改 obj 中一个嵌套较深的属性，也能触发 getter 和 setter），最后利用 Object.defineProperty 去给 obj 的属性 key 添加 getter 和 setter

### 依赖收集

#### Dep

getter 用于依赖收集，其中 Dep 是整个 getter 依赖收集的核心，实际上管理了 Watcher，它的定义在 src\core\observer\dep.ts 中：

- Dep 类中有一个静态属性 target，这是一个全局唯一的 Watcher（同一时间只能有一个全局的 Watcher 被计算），另外它的属性 subs 是用来装 Watcher 的数组
- dep.depend() 方法，用于做依赖收集
- dep.addSub() 方法，用于收集 Watcher

#### Watcher

在 Watcher 的构造函数中，会调用 this.get() 方法，在 this.get() 方法中会走 pushTarget(this) -> updateComponent -> vm._render() -> getter -> dep.depend() -> dep.addSub(this) -> this.subs.push(sub)，从而完成依赖收集

#### 主要流程

在 $mount -> mountComponent -> new Watcher 时：

- 先执行 Watcher 构造函数中的 this.get() 方法
- 在 get 方法中，先会执行 pushTarget(this) 方法将 Dep.target 赋值为当前渲染 Watcher，然后会执行传入的 updateComponent 回调函数，即 vm._update(vm._render(), hydrating)
- vm._update(vm._render(), hydrating) 会先执行 vm._render() 方法生成渲染 vnode，在这个过程中会访问 vm 上的数据，触发所有数据的 getter
- 每个对象值的 getter 都持有一个 Dep，在触发 getter 时会调用 dep.depend() 方法，做依赖收集，也就会执行 dep.depend() 方法中的 Dep.target.addDep(this) 方法
- 这时 Dep.target 已经被赋值为当前渲染 Watcher，那么就会执行到 Watcher 中的 addDep 方法，进而走 dep.addSub(this) -> this.subs.push(sub)，相当于把当前 Watcher 订阅到这个数据持有 Dep 的 subs 中，目的是为后续数据变化时能通知到 subs 做准备

### 派发更新

setter 用于派发更新，setter 中调用了 dep.notify() 方法去通知所有的订阅者

#### 主要流程

- 在 src\core\observer\dep.ts 中 dep.notify() 方法的作用为：遍历所有的 subs，也就是 Watcher 的实例数组，然后调用每一个 Watcher 的 update 方法
- 在 update 方法中，会调用 queueWatcher(this) 方法，把当前 Watcher 放入一个队列中，每次数据改变不会马上触发 Watcher 的回调，而是把这些 Watcher 先添加到一个队列里，然后通过 nextTick(flushSchedulerQueue) 在 nextTick 后执行 flushSchedulerQueue
- 在 src\core\observer\scheduler.ts 中 flushSchedulerQueue 方法的作用为：
  - 按 id 对队列做了从小到大的排序，确保了：
    - 组件的更新由父到子；因为父组件的创建过程是先于子的，所以 Watcher 的创建也是先父后子，执行顺序也应该保持先父后子
    - 用户的自定义 Watcher 要优先于渲染 Watcher 执行；因为用户自定义 Watcher 是在渲染 Watcher 之前创建的
    - 如果一个组件在父组件的 Watcher 执行期间被销毁，那么它对应的 Watcher 执行都可以被跳过，所以父组件的 Watcher 应该先执行
  - 遍历队列中的所有 Watcher，执行每一个 Watcher 的 run() 方法：
    - 实际上就是传入 Watcher 的回调函数，首先通过 this.get() 得到它当前的值，然后做判断，如果满足新旧值不等、新值是对象类型、deep 模式任何一个条件，则执行 Watcher 的回调
    - 注意回调函数执行的时候会把第一个和第二个参数传入新值 value 和旧值 oldValue，使得自定义 Watcher 的时候能在回调函数的参数中拿到新旧值
  - 执行 resetSchedulerState 函数做状态恢复，就是把这些控制流程状态的一些变量恢复到初始值，把 Watcher 队列清空

### 注意事项

#### 对象添加属性

- 当我们去给这个对象添加一个新的属性的时候，是不能够触发它的 setter 的， Vue 为了解决这个问题，定义了一个全局 API： Vue.set 方法
- Vue.set 方法在 src\core\global-api\index.ts 中初始化：Vue.set = set
- set 方法的定义在 src\core\observer\index.ts 中，set 方法接收 3 个参数，target 可能是数组或者是普通对象，key 代表的是数组的下标或者是对象的键值，val 代表添加的值
- 如果 target 是数组且 key 是一个合法的下标，则之前通过 splice 去添加进数组然后返回 val
- 如果 target 是对象，当 key 已经存在于 target 中，直接则直接赋值 target[key] = val 返回 val，因为这样的变化是可以观测到的
- 获取到 target.\__ob\__ 并赋值给 ob，\__ob\__ 是在 Observer 的构造函数执行的时候初始化的，表示 Observer 的一个实例，如果它不存在，则说明 target 不是一个响应式的对象，则直接赋值 target[key] = val 并返回 val
- 最后通过 defineReactive(ob.value, key, val) 把新添加的属性变成响应式对象，然后再通过 dep.notify() 触发依赖通知，这里的 dep 已经在 Observer 的构造函数执行时创建

#### 重写数组方法

在通过 observe 方法去观察对象的时候会实例化 Observer，在它的构造函数中专门对数组做了处理：通过重写数组方法，获取到插入的值，然后把新添加的值变成一个响应式对象，并且再调用 ob.dep.notify() 触发依赖通知

### 组件更新

vm.update() -> vm.\__patch\__ -> patch 时，patch 方法中在保证 oldVnode 不为空，并且它和 vnode 都是 VNode 类型的情况下，接下来会通过 sameVNode(oldVnode, vnode) 判断它们是否是相同的 VNode 来决定走不同的更新逻辑

#### 新旧节点不同

如果新旧 vnode 不同，那么更新的逻辑本质上是要替换已存在的节点，大致分为 3 步：

- 以当前旧节点为参考节点，创建新的节点，并插入到 dom 中（通过 createElm 方法实现）
- 更新父的占位符节点
- 删除旧节点，就是遍历待删除的 vnodes 做删除操作（通过 removeVnodes 方法实现）

#### 新旧节点相同

如果新旧节点相同，那么会调用 patchVNode 方法，它的作用就是把新的 vnode patch 到旧的 vnode 上，大致分为 4 步：

- 执行 componentVNodeHooks 中的钩子函数 prepatch，执行 prepatch 函数中的 updateChildren 方法，更新了 vnode 对应的实例 vm 的一系列属性，包括占位符 vm.$vnode 的更新、slot 的更新，listeners 的更新，props 的更新等
- 在 prepatch 钩子函数执行完成后，会执行所有 module 的 update 钩子函数以及用户自定义 update 钩子函数
- 继续完成 patch 过程，会使用到 updateChildren 函数来更新子节点
- 最后执行 postpatch 钩子函数，它是组件自定义的钩子函数，有则执行

##### updateChildren

updateChildren 方法最复杂，它是 diff 算法的主要实现

### Props

#### 规范化

在初始化 props 之前，首先会对 props 做一次 normalize，其实上就是将传入的 props 属性转化为规范的 json 形式，它发生在 mergeOptions 的时候

#### 初始化

props 的初始化主要发生在 initState 中的 initProps 阶段

主要过程为：校验（是否满足传入的配置）-> 转化为响应式 -> 代理

#### Props 更新

#### 子组件 props 更新

- prop 数据的值变化在父组件，在父组件的 render 过程中会访问到这个 prop 数据，所以当 prop 数据变化一定会触发父组件的重新渲染
- 会走：vm.update() -> vm.\__patch\__ -> patch -> patchVNode -> prepatch -> updateChildren
- 在 updateChildren 方法中重新验证和计算新的 prop 数据，更新 vm._props，也就是子组件的 props，这个就是子组件 props 的更新过程

#### 子组件重新渲染

在两种情况下子组件会重新渲染：一个是 prop 值被修改，另一个是对象类型的 prop 内部属性的变化
