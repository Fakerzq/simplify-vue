# simplify-vue3
一个简易版本的 vue3 源码

### 内容输出
https://github.com/scout-hub/technology-blog/tree/dev/vue/vue3%20%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90

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
   - [x] toRaw/markRaw
   - [x] Object类型的响应式处理
   - [x] Set、Map类型的响应式处理
   - [x] 数组方法的响应式处理
   - [x] computed及其相关属性
   - [x] effect
   - [x] ref/shallowRef/isRef/unref/toRef/toRefs/proxyRefs
   - [x] 等等
- runtime-core
   - [x] createApp
   - [x] defineAsyncComponent
   - [x] Transition组件
   - [x] Teleport组件
   - [x] KeepAlive组件
   - [x] slot插槽、组件类型、element类型、Text类型、Fragment类型、Comment类型节点的渲染更新卸载
   - [x] customRender自定义渲染器
   - [x] provide/inject
   - [x] attrs/props初始化和更新、props类型校验
   - [x] emit事件派发/emits选项校验
   - [x] $el/$slots/$props/$attrs/$data
   - [x] 部分指令(v-show，v-model)
   - [x] 生命周期
   - [x] nextTick
   - [x] watchEffect/watch/watchSyncEffect/watchPostEffect
   - [x] render函数
   - [x] getCurrentInstance
   - [x] 快速diff算法
   - [x] patchFlag靶向更新文本节点、class属性、其他动态props、children节点
   - [x] block树 
   - [x] 等等
- runtime-dom
   - [x] 属性绑定
   - [x] 事件处理
- compiler-core
   - [x] 解析插值、文本、元素、组件
   - [x] 插值、文本、元素、组件组合（支持嵌套）的template编译、转化、生成
   - [x] 普通元素v-show、v-if/v-else-if/v-else、v-bind、v-on、v-for、v-model
   - [x] template下多根标签节点渲染 
   - [x] patchFlag: 动态文本节点标记，动态class属性标记，动态props属性标记，指令标记(v-show)
   - [x] block标记：v-if、v-for等等
- shared
   - [x] 辅助函数
