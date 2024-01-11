## 组件化

### createComponent 的核心流程

在 src\core\vdom\create-element.ts 中的 _createElement 方法内，有一段逻辑是对参数 tag 的判断，如果是一个普通的 html 标签，则会实例化一个普通 vnode 节点，否则通过 createComponent 方法创建一个组件 vnode 

在 src\core\vdom\create-component.ts 中定义了 createComponent 方法，主要有 3 个核心流程：

- 构造子类构造函数
- 安装组件钩子函数
- 实例化 vnode

#### 构造子类构造函数

- src\core\global-api\index.ts 中的 initGlobalAPI 函数内有：Vue.options._base = Vue
- src\core\instance\init.ts 中的 _init 函数内通过合并配置，把 Vue 上的一些 option 扩展到了 vm.$options 上，所以就能通过 vm.$options._base 拿到 Vue 这个构造函数
- 通过 baseCtor = context.$options._base，拿到 Vue 这个构造函数，context 是传入的 vm 组件
- 然后执行：Ctor = baseCtor.extend(Ctor as typeof Component)，拿到一个子类构造函数

##### extend 方法

在 src\core\global-api\extend.ts 中定义了 extend 方法:

- extend 的作用就是构造一个 Vue 的子类，返回一个构造函数
- 用原型继承方式把一个纯对象转换为一个继承于 Vue 的构造器 Sub 并返回
- 然后对 Sub 这个对象本身扩展了一些属性（扩展options、添加全局 API 等），并且对配置中的 props 和 computed 做了初始化工作
- 实例化 Sub 的时候，其实会执行 this._init 方法，再次走到了 Vue 实例的初始化逻辑

#### 安装组件钩子函数

- 即 installComponentHooks(data)
- installComponentHooks 的作用就是把 componentVNodeHooks 的钩子函数合并到 data.hook 中，以便后续使用，data 是 createComponent 方法传入的参数

#### 实例化 vnode

- 通过 new Vnode 实例化了组件 vnode，是 vm._render 的过程 
- 与普通元素节点的 vnode 不同，组件的 vnode 是没有 children 的
- 接下来会走 vm._update -> vm.\__patch\__ -> patch -> createElm 以创建元素节点

##### 一个新定义的 createComponent 

在 src\core\vdom\patch.ts 中 createElm 方法内先调用了一个新定义的 createComponent 方法：

在这个 createComponent 方法中，如果 vnode 是组件类型，那么走以下流程（不再走创建普通 vnode 的流程）：

- 调用 componentVNodeHooks 中的 init 钩子函数
- 在 init 函数中：调用 createComponentInstanceForVnode 方法，创建一个 Vue 的实例（子组件），然后调用 $mount 方法挂载子组件（组件自己接管了 $mount 的过程，是不传 el 的），相当于走 $mount -> mountComponent 
- createComponentInstanceForVnode 方法，里面做了一些配置（包含了父子关系），并标记为组件，同时主要通过继承于 Vue 的构造器 Sub 创建子组件（组件实例化在这个时机），所以会调用 _init 方法
- 在 _init 方法中，由于有组件标记，所以会先走到 initInternalComponent 方法，里面合并了一些配置（包含了父子关系），再继续走完 _init
- 在 $mount -> mountComponent 之后，流转父子关系，继续走： vm._render -> vm._update -> vm.\__patch\__ -> patch -> createElm

### 组件注册

#### 全局注册

- 通过 Vue.component(id, definition) 实现，它的定义过程发生在最开始初始化 Vue 的全局函数（initGlobalAPI）的时候
- initGlobalAPI 方法内部调用了 src\core\global-api\assets.ts 中的 initAssetRegisters 方法

在 initAssetRegisters 方法内：

- 通过遍历 ASSET_TYPES = ['component','directive','filter'] 的 3 个 type，初始化了 3 个全局函数，挂载到 Vue.options 上
- 如果 type 是 component 且传入的 definition 是一个对象：通过 extend 方法把这个对象转换成一个继承于 Vue 的构造函数
- extend 方法内执行了 mergeOptions 方法，把 Vue.options 合并到 Sub.options 上，然后在组件的实例化时，Sub.options.components 会合并到 vm.$options.components 上
- 然后在创建 vnode 的过程中，会执行 _createElement 方法，通过 resolveAsset 方法拿到当前组件的构造函数 Ctor，进而执行 createComponent 方法，把Ctor 作为参数传入

#### 局部注册

通过 components: {} 实现

在组件的 Vue 的实例化阶段有一个合并 option 的逻辑，同上，把 components 合并到 vm.$options.components 上，这样就可以在 resolveAsset 的时候拿到当前组件的构造函数 Ctor，进而执行 createComponent 方法，把 Ctor 作为参数传入





