# simplify-vue
a simplified version of vue3 implementation for study

### 测试
pnpm test

### 开发
pnpm dev

### 生产
pnpm build

### 目前实现的功能
- reactivity
   - [x] reactive/shallowReactive/isReactive/toReactive
   - [x] readonly/shallowReadonly/isReadonly/toReadonly
   - [x] isProxy
   - [x] toRaw
   - [ ] markRaw
   - [x] Object类型的响应式处理
   - [x] Set、Map类型的响应式处理
   - [x] 数组方法的响应式处理
   - [x] computed及其相关属性
   - [x] effect
   - [x] ref/shallowRef/isRef/unref/toRef/toRefs/proxyRefs
   - [x] 等等
- runtime-core
   - [x] createApp
   - [x] defineAsyncComponent/defineComponent
   - [x] Transition组件
   - [x] Teleport组件
   - [x] KeepAlive组件
   - [x] Functional Component
   - [x] slot插槽、组件类型、element类型、Text类型、Fragment类型、Comment类型节点的渲染更新卸载
   - [x] customRender自定义渲染器
   - [x] provide/inject
   - [x] attrs/props初始化和更新、props类型校验
   - [x] emit事件派发/emits选项校验
   - [x] $el/$slots/$props/$attrs/$data
   - [x] 生命周期
   - [x] watchEffect/watch/watchSyncEffect/watchPostEffect
   - [x] setup函数
   - [x] render函数
   - [x] getCurrentInstance
   - [x] vnode
   - [x] 快速diff算法
   - [x] nextTick
   - [x] 等等
- runtime-dom
   - [x] 属性绑定
   - [x] 事件处理
- compiler-core
   - [x] 解析插值、文本、元素
   - [x] 插值、文本、元素组合（支持嵌套）的template编译、转化、生成
   - [x] 普通元素v-show、v-if/v-else、v-bind、v-on
- shared
   - [x] 辅助函数
