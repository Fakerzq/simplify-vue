'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/*
 * @Author: Zhouqi
 * @Date: 2022-04-03 16:57:13
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-03 17:08:47
 */
/**
 * @description: 规范化class的值
 * @param value class的值
 */
function normalizeClass(value) {
    // 处理的情况无非就是三种：字符串，数组，对象
    let result = "";
    if (isString(value)) {
        // 是字符串则直接拼接
        result += value;
    }
    else if (isArray(value)) {
        // 是数组情况就递归调用normalizeClass
        for (let i = 0; i < value.length; i++) {
            result += `${normalizeClass(value[i])} `;
        }
    }
    else if (isObject(value)) {
        for (const key in value) {
            // 值为true的class才需要拼接
            if (value[key]) {
                result += `${key} `;
            }
        }
    }
    return result.trim();
}

/*
 * @Author: Zhouqi
 * @Date: 2022-03-21 20:00:07
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-04 14:12:12
 */
// 重新定义方法名，使其更具语义化命名
const extend = Object.assign;
const isArray = Array.isArray;
// 判断值是不是对象
const isObject = (val) => val !== null && typeof val === "object";
// 判断值是不是字符串
const isString = (val) => typeof val === "string";
// 判断值是不是函数
const isFunction = (val) => typeof val === "function";
// 新旧值是否有变化，以及对NaN的判断处理 NaN === NaN为false
const hasChanged = (value, oldValue) => !Object.is(value, oldValue);
// 判断是否是事件属性：onClick …………
const isOn = (key) => /^on[^a-z]/.test(key);
// 烤肉串命名转驼峰 add-name ===> addName
const camelize = (str) => str.replace(/-(\w)/g, (_, c) => (c ? c.toUpperCase() : ""));
// 将addName这种转化为AddName
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
// 处理事件触发的事件名
const toHandlerKey = (str) => str ? `on${capitalize(str)}` : "";
const EMPTY_OBJ = {};

/*
 * @Author: Zhouqi
 * @Date: 2022-03-26 21:57:02
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-04 14:55:14
 */
const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
// 创建虚拟节点函数
function createVnode(type, props = null, children = null) {
    if (props) {
        /**
         * 规范化class的值
         * vue3中有多种class props的处理，针对不同类型需要进行统一
         *
         * 1、<div class="app"></div>  对应的虚拟dom为 {props:{class:'app'}}
         * 2、<div :class="classObj"></div> classObj = {app:true, app1:true} 对应的虚拟dom为 {props:{class:{app:true, app1:true} }}
         * 2、<div :class="classArr"></div> classObj = ['app app1','app2',{app3:true}] 对应的虚拟dom为 {props:{class: ['app app1','app2',{app3:true}] }}
         */
        const { class: kclass } = props;
        if (kclass && !isString(kclass)) {
            props.class = normalizeClass(kclass);
        }
    }
    let shapeFlag = 0;
    // 处理虚拟节点的shapeFlag
    if (isString(type)) {
        shapeFlag = 1 /* ELEMENT */;
    }
    else if (isObject(type)) {
        shapeFlag = 4 /* STATEFUL_COMPONENT */;
    }
    return createBaseVNode(type, props, children, shapeFlag, true);
}
// 创建基础vnode
function createBaseVNode(type, props, children, shapeFlag, needFullChildrenNormalization = false) {
    const vnode = {
        type,
        props,
        children,
        el: null,
        shapeFlag,
    };
    if (needFullChildrenNormalization) {
        // 规范化子节点处理，子节点的类型有很多，比如数组，对象，函数等等
        normalizeChildren(vnode, children);
    }
    else {
        // 能走到这里说明children一定是string或者array类型的
        vnode.shapeFlag |= isString(children)
            ? 8 /* TEXT_CHILDREN */
            : 16 /* ARRAY_CHILDREN */;
    }
    return vnode;
}
// 创建文本节点的vnode
function createTextVnode(text) {
    return createVnode(Text, null, text);
}
// 规范化子节点，子节点的类型有多种，比如string、function、object等等
function normalizeChildren(vnode, children) {
    let type = 0;
    const { shapeFlag } = vnode;
    if (!children) ;
    else if (isArray(children)) {
        type = 16 /* ARRAY_CHILDREN */;
    }
    else if (isObject(children)) {
        if (shapeFlag & 4 /* STATEFUL_COMPONENT */) {
            // 子节点是对象表示插槽节点
            type = 32 /* SLOTS_CHILDREN */;
        }
    }
    else {
        children = String(children);
        type = 8 /* TEXT_CHILDREN */;
    }
    vnode.shapeFlag |= type;
}

/*
 * @Author: Zhouqi
 * @Date: 2022-03-30 20:59:56
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-01 20:47:47
 */
// 将slot children转化为虚拟节点
function renderSlot(slots, name, props) {
    // 取对应名称的插槽————具名插槽
    const slot = slots[name];
    if (slot) {
        if (isFunction(slot)) {
            return createVnode(Fragment, null, slot(props));
        }
    }
}

/*
 * @Author: Zhouqi
 * @Date: 2022-03-20 20:52:58
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-03-30 17:40:59
 */
class ReactiveEffect {
    constructor(effectFn, scheduler) {
        this.effectFn = effectFn;
        this.scheduler = scheduler;
        this.deps = [];
        this.active = true;
    }
    run() {
        activeEffect = this;
        activeEffectStack.push(this);
        /**
         * cleanup的作用是清除当前ReactiveEffect所关联的deps，即响应式对象key对应的Set依赖集合
         * effectFn = () => {
            // user.ok为false时，user.name始终应该是123，即使user.age发生改变也不应该触发副作用函数执行
            user.name = user.ok ? user.age : "123";
           };
           当user.ok变成false时会触发副作用函数，此时会清空ok、age上面的依赖，并且重新收集ok的依赖，
           由于三元表达式的结果，age不会收集依赖，因此即使修改user.age也不再会触发副作用函数执行。
         */
        cleanup(this);
        const result = this.effectFn();
        activeEffectStack.pop();
        activeEffect = activeEffectStack[activeEffectStack.length - 1];
        // activeEffect = undefined
        return result;
    }
    stop() {
        // active用于防止重复调用stop
        if (this.active) {
            cleanup(this);
            this.onStop && this.onStop();
            this.active = false;
        }
    }
}
// 找到所有依赖这个 effect 的响应式对象，从这些响应式对象里面把 effect 给删除掉
function cleanup(effect) {
    effect.deps.forEach((deps) => {
        deps.delete(effect);
    });
    effect.deps.length = 0;
}
let activeEffect;
/**
 * 收集当前正在使用的ReactiveEffect，在嵌套effect的情况下，每一个effect执行
 * 时内部的ReactiveEffect是不同的。建立activeEffectStack是为了能够在对应的
 * effect函数执行时收集到正确的activeEffect。
 *
 * effect(() => {
      effect(() => {
        执行逻辑
      });
      执行逻辑
    });
 *
 * 执行过程：
 * 外层effect执行 ---> activeEffect=当前effect内部创建的ReactiveEffect
 * 并且被收集到activeEffectStack中 ---> 内部effect执行 ---> activeEffect=当前effect
 * 内部创建的ReactiveEffect并且被收集到activeEffectStack中 ---> 内部effect执行完成，
 * activeEffectStack弹出栈顶的ReactiveEffect，此时栈顶的ReactiveEffect对应外层effect，
 * 取出后赋值给当前的activeEffect
 */
const activeEffectStack = [];
/**
 * options:{
 *    scheduler: 用户自定义的调度器函数
 *    onStop: 清除响应式时触发回调函数;
 *    lazy: 是否懒执行，即第一次不执行fn
 * }
 */
function effect(effectFn, options = {}) {
    const _effect = new ReactiveEffect(effectFn, options.scheduler);
    options && extend(_effect, options);
    // 如果不是懒执行，则执行一次副作用函数
    if (!options.lazy)
        _effect.run();
    const runner = _effect.run.bind(_effect);
    runner._effect = _effect;
    return runner;
}
/**
 * WeackMap{
 *    target: Map{
 *        key: Set(effectFn)
 *    }
 * }
 * 这里使用WeakMap是因为当target引用对象被销毁时，它所建立的依赖关系其实已经没有存在的必要了
 * 可以被辣鸡回收机制回收
 */
const targetMap = new WeakMap();
// 依赖收集函数
function track(target, key) {
    // if (!activeEffect) return;
    if (!canTrack())
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let deps = depsMap.get(key);
    if (!deps) {
        deps = new Set();
        depsMap.set(key, deps);
    }
    trackEffects(deps);
}
// 抽离收集依赖公共逻辑
function trackEffects(deps) {
    deps.add(activeEffect);
    activeEffect.deps.push(deps);
}
// 触发依赖函数
function trigger(target, key) {
    const depsMap = targetMap.get(target);
    if (!depsMap)
        return;
    const deps = depsMap.get(key);
    if (!deps)
        return;
    triggerEffects(deps);
}
// 抽离公共的触发依赖逻辑
function triggerEffects(deps) {
    /**
     * 构建一个新的set，避免在另一个set的forEach中形成set.delete(1)，set.add(1)死循环现象
     */
    const depsToRun = new Set();
    deps.forEach((dep) => {
        /**
           * 这里的dep !== activeEffect是为了防止obj++这种形成：收集--》更新--》收集的循环现象
           * effect(() => {
            // user.num ++ ====> user.num = user.num + 1;
            user.num++;
           });
           */
        dep !== activeEffect && depsToRun.add(dep);
    });
    depsToRun.forEach((dep) => {
        const scheduler = dep.scheduler;
        // 触发依赖的时候，如果存在用户自定义调度器，则执行调度器函数，否则执行依赖函数
        scheduler ? scheduler(dep.effectFn) : dep.run();
    });
}
// 停止副作用函数执行
function stop(runner) {
    runner._effect.stop();
}
// 能否能进行依赖收集
function canTrack() {
    return !!(activeEffect);
}

/*
 * @Author: Zhouqi
 * @Date: 2022-03-22 17:58:01
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-03-30 16:32:11
 */
// 封装proxy get函数
const createGetter = function (isReadOnly = false, isShallow = false) {
    return function (target, key, receiver) {
        // 如果访问的是__v_reactive，则返回!isReadOnly的值
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadOnly;
        }
        // 如果访问的是__v_isReadonly，则返回isReadOnly值
        if (key === "__v_isReadonly" /* IS_READONLY */) {
            return isReadOnly;
        }
        // 如果访问的是__v_raw属性，就返回原始对象
        if (key === "__v_raw" /* RAW */) {
            return target;
        }
        const result = Reflect.get(target, key, receiver);
        // 只读属性不不能设置值，所以无需建立依赖关系
        if (!isReadOnly) {
            track(target, key);
        }
        // 浅响应
        if (isShallow) {
            return result;
        }
        // 深响应，如果访问的属性是一个对象则继续处理对象
        if (isObject(result)) {
            return isReadOnly ? readonly(result) : reactive(result);
        }
        return result;
    };
};
// 封装proxy set函数
const createSetter = function () {
    return function (target, key, newValue, receiver) {
        // 先获取旧的值，再去更新值，避免影响触发依赖的判断 oldValue !== newValue
        const oldValue = target[key];
        const result = Reflect.set(target, key, newValue, receiver);
        // 特殊情况：NaN !== NaN 为true
        if (hasChanged(newValue, oldValue)) {
            // 触发依赖
            trigger(target, key);
        }
        return result;
    };
};
// 初始化的时候创建
const reactiveGetter = createGetter();
const shallowReactiveGetter = createGetter(false, true);
const readonlyGetter = createGetter(true);
const shallowReadonlyGetter = createGetter(true, true);
const reactiveSetter = createSetter();
// 响应处理器
const reactiveHandler = {
    get: reactiveGetter,
    set: reactiveSetter,
};
// 浅响应处理器
const shallowReactiveHandler = {
    get: shallowReactiveGetter,
    set: reactiveSetter,
};
// 只读处理器
const readonlyHandler = {
    get: readonlyGetter,
    set(target, key, newValue, receiver) {
        console.warn(`${key} is readonly`);
        return true;
    },
};
// 浅只读处理器
const shallowReadonlyHandler = extend({}, readonlyHandler, {
    get: shallowReadonlyGetter,
});

/*
 * @Author: Zhouqi
 * @Date: 2022-03-20 20:47:45
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-03-30 17:16:50
 */
// 创建响应式对象
function reactive(raw) {
    // 如果对象是一个只读的proxy，则直接返回
    if (isReadonly(raw)) {
        return raw;
    }
    return createReactive(raw, reactiveHandler);
}
// 创建浅响应对象
function shallowReactive(raw) {
    return createReactive(raw, shallowReactiveHandler);
}
// 创建只读对象
function readonly(raw) {
    return createReactive(raw, readonlyHandler);
}
// 创建浅只读对象
function shallowReadonly(raw) {
    return createReactive(raw, shallowReadonlyHandler);
}
// 对象是不是响应式的
function isReactive(variable) {
    return !!variable["__v_isReactive" /* IS_REACTIVE */];
}
// 对象是不是只读的
function isReadonly(variable) {
    return !!variable["__v_isReadonly" /* IS_READONLY */];
}
// 对象是不是readonly或者reactive的
function isProxy(variable) {
    return isReactive(variable) || isReadonly(variable);
}
// 返回代理对象的原始对象
function toRaw(observed) {
    const raw = observed && observed["__v_raw" /* RAW */];
    // toRaw返回的对象依旧是代理对象，则递归去找原始对象
    return raw ? toRaw(raw) : observed;
}
function createReactive(raw, handler) {
    return new Proxy(raw, handler);
}

/*
 * @Author: Zhouqi
 * @Date: 2022-03-23 21:32:36
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-03-30 20:19:16
 */
class RefImpl {
    constructor(value, __v_isShallow = false) {
        this.__v_isShallow = __v_isShallow;
        this.__v_isRef = true;
        // 如果不是shallow的情况且value是obj时需要响应式处理
        this._value = __v_isShallow ? value : toReactive(value);
        // 如果不是shallow的情况且value如果是响应式的，则需要拿到原始对象
        this._rawValue = __v_isShallow ? value : toRaw(value);
        this.deps = new Set();
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        // 如果不是shallow的情况且value如果是响应式的，则需要拿到原始对象
        newValue = this.__v_isShallow ? newValue : toRaw(newValue);
        // 比较的时候拿原始值去比较
        if (hasChanged(newValue, this._rawValue)) {
            this._rawValue = newValue;
            // 如果不是shallow的情况且新的值时普通对象的话需要去响应式处理
            this._value = this.__v_isShallow ? newValue : toReactive(newValue);
            triggerEffects(this.deps);
        }
    }
}
class ObjectRefImpl {
    constructor(_target, _key) {
        this._target = _target;
        this._key = _key;
        this.__v_isRef = true;
    }
    get value() {
        const val = this._target[this._key];
        return val;
    }
    set value(newValue) {
        this._target[this._key] = newValue;
    }
}
function ref(value) {
    return createRef(value, false);
}
// 代理ref对象，使之不需要要通过.value去访问值（例如在template里面使用ref时不需要.value）
function proxyRefs(objectWithRefs) {
    // 如果是reactive对象则不需要处理，直接返回对象
    return isReactive(objectWithRefs)
        ? objectWithRefs
        : new Proxy(objectWithRefs, {
            get(target, key, receiver) {
                return unRef(Reflect.get(target, key, receiver));
            },
            set(target, key, newValue, receiver) {
                // 旧的值是ref，但是新的值不是ref时，直接修改.value的值。否则直接设置新值
                const oldValue = target[key];
                if (isRef(oldValue) && !isRef(newValue)) {
                    oldValue.value = newValue;
                    return true;
                }
                return Reflect.set(target, key, newValue, receiver);
            },
        });
}
// 浅ref，只对value做响应式处理
function shallowRef(value) {
    return createRef(value, true);
}
// 判断一个值是不是ref
function isRef(ref) {
    return !!(ref && ref.__v_isRef === true);
}
// 如果参数是一个ref，则返回内部值，否则返回参数本身
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
// 收集ref的依赖函数
function trackRefValue(ref) {
    if (canTrack()) {
        trackEffects(ref.deps);
    }
}
// 可以用来为源响应式对象上的某个 property 新创建一个 ref。然后，ref 可以被传递，它会保持对其源 property 的响应式连接
function toRef(object, key) {
    return isRef(object) ? object : new ObjectRefImpl(object, key);
}
// 将响应式对象转换为普通对象，其中结果对象的每个 property 都是指向原始对象相应 property 的 ref
function toRefs(object) {
    if (isRef(object))
        return object;
    const result = isArray(object) ? new Array(object.length) : {};
    for (const key in object) {
        result[key] = toRef(object, key);
    }
    return result;
}
// 创建ref的工厂函数
function createRef(value, shallow) {
    return new RefImpl(value, shallow);
}
// 对ref传入的值做处理，如果是对象，则进行reactive处理
const toReactive = (value) => (isObject(value) ? reactive(value) : value);

/*
 * @Author: Zhouqi
 * @Date: 2022-03-30 09:49:57
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-03-30 14:59:23
 */
/**
 * @description: 事件触发函数
 * @param instance 组件实例
 * @param event 事件名
 */
function emit(instance, event, ...rawArg) {
    const { props } = instance;
    /**
     * 针对两种事件名做处理
     * add-name 烤肉串命名
     * addName 驼峰命名
     * 如果是烤肉串命名，先转换为驼峰命名，再转化为AddName这种名称类型
     */
    const handler = props[toHandlerKey(event)] || props[toHandlerKey(camelize(event))];
    if (handler) {
        handler(...rawArg);
    }
}

/*
 * @Author: Zhouqi
 * @Date: 2022-03-28 22:34:06
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-03-28 22:38:13
 */
/**
 * @description: 初始化props
 * @param instance 组件实例
 * @param rawProps 初始状态下的props
 */
function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

/*
 * @Author: Zhouqi
 * @Date: 2022-03-27 21:17:03
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-02 17:39:34
 */
// 建立map映射对应vnode上的属性，利于扩展
const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (hasOwn(props, key)) {
            return props[key];
        }
        else if (setupState && hasOwn(setupState, key)) {
            return setupState[key];
        }
        // 属性映射表上有对应的属性则返回对应的属性值
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};
function hasOwn(target, key) {
    return Object.prototype.hasOwnProperty.call(target, key);
}

/*
 * @Author: Zhouqi
 * @Date: 2022-03-30 21:16:45
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-03 21:47:03
 */
/**
 * 插槽的vnode结构
 */
// 初始化插槽
function initSlots(instance, children) {
    // 判断是不是插槽节点
    if (32 /* SLOTS_CHILDREN */ & instance.vnode.shapeFlag) {
        normalizeObjectSlots(children, instance.slots);
    }
}
// 将children中的插槽节点赋值到组件实例的slots对象上
function normalizeObjectSlots(children, slots) {
    // slots是一个对象，用于实现具名插槽
    for (const key in children) {
        const slot = children[key];
        // 将插件转换为函数实现作用于插槽
        slots[key] = (props) => normalizeSlotValue(slot(props));
    }
}
// 对插槽值对处理，转换成数组类型的子节点
function normalizeSlotValue(slot) {
    return isArray(slot) ? slot : [slot];
}

/*
 * @Author: Zhouqi
 * @Date: 2022-03-26 22:15:52
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-04 13:08:34
 */
/**
 * @description: 创建组件实例
 * @param vnode 虚拟节点
 * @param parent 父组件实例
 */
function createComponentInstance(vnode, parent) {
    const componentInstance = {
        isMounted: false,
        subTree: null,
        vnode,
        ctx: {},
        slots: {},
        type: vnode.type,
        emit: null,
        parent,
        provides: parent ? parent.provides : Object.create(null),
    };
    // 在_属性中存储组件实例对象
    componentInstance.ctx = { _: componentInstance };
    componentInstance.emit = emit.bind(null, componentInstance);
    return componentInstance;
}
/**
 * @description: 是否是有状态组件
 * @param  instance 组件实例
 */
function isStatefulComponent(instance) {
    return instance.vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */;
}
/**
 * @description: 初始化组件
 * @param instance 组件实例
 */
function setupComponent(instance) {
    const { props, children } = instance.vnode;
    const isStateful = isStatefulComponent(instance);
    // 初始化props
    initProps(instance, props);
    // 初始化slots
    initSlots(instance, children);
    const setupResult = isStateful ? setupStatefulComponent(instance) : undefined;
    return setupResult;
}
let currentInstance = null;
/**
 * @description: 获取当前的组件实例
 */
function getCurrentInstance() {
    return currentInstance;
}
/**
 * @description: 有状态组件
 * @param instance
 */
function setupStatefulComponent(instance) {
    const { type: component, props, emit } = instance;
    const { setup } = component;
    // 这里只是代理了instance上的ctx对象
    // 在处理函数中由于需要instance组件实例，因此需要在ctx中增加一个变量_去存储组件实例，供处理函数内部访问
    // 通过这个代理，我们就能用this.xxx去访问数据了
    instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers);
    // 调用组件上的setup方法获取到数据
    if (setup) {
        setCurrentInstance(instance);
        // props是浅只读的，在开发模式下是shallowReadonly类型，生产环境下不会进行shallowReadonly处理，这里默认进行shallowReadonly处理
        const setupResult = setup(shallowReadonly(props), { emit }) || {};
        unsetCurrentInstance();
        handleSetupResult(instance, setupResult);
    }
}
/**
 * @description: 处理setup返回值
 * @param instance 组件实例
 * @param setupResult setup返回值
 */
function handleSetupResult(instance, setupResult) {
    if (isObject(setupResult)) {
        instance.setupState = proxyRefs(setupResult);
    }
    // TODO
    // setup返回函数时表示render函数
    finishComponentSetup(instance);
}
/**
 * @description: 完成组件初始化
 * @param instance 组件实例
 */
function finishComponentSetup(instance) {
    const { type: component, proxy } = instance;
    if (component.render) {
        instance.render = component.render.bind(proxy);
    }
}
/**
 * @description: 修改当前组件实例
 * @param instance 当前组件实例
 */
function setCurrentInstance(instance) {
    currentInstance = instance;
}
/**
 * @description: 重置当前组件实例
 */
function unsetCurrentInstance() {
    currentInstance = null;
}

/*
 * @Author: Zhouqi
 * @Date: 2022-04-02 14:43:10
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-02 17:20:23
 */
/**
 * @description: 依赖提供
 * @param key 键
 * @param value 值
 */
function provide(key, value) {
    if (!currentInstance) {
        return;
    }
    const instance = currentInstance;
    let provides = instance.provides;
    const parentProvides = instance.parent && instance.parent.provides;
    /**
     * 默认情况下，当前组件实例的provides继承父组件的provides
     * 如果当前组件需要定义provides，则需要实现原型链的方式，避免当前组件实例在创建provides的时候
     * 影响到父组件的provides。
     * 当通过inject注入的时候，也是按照原型链的方式去查找
     */
    if (provides === parentProvides) {
        // 如果当前组件实例的provides等于父组件的provides，则表示初始化的状态，此时设置当前组件provides的原型为父组件的provides
        provides = instance.provides = Object.create(parentProvides);
    }
    provides[key] = value;
}
/**
 * @description: 依赖注入
 * @param key 键
 * @param defaultValue 默认值
 * @param treatDefaultAsFactory 如果默认值是一个函数，是否执行函数得到返回结果
 */
function inject(key, defaultValue, treatDefaultAsFactory = false) {
    var _a;
    const instance = currentInstance;
    if (instance) {
        const provides = (_a = instance.parent) === null || _a === void 0 ? void 0 : _a.provides;
        // 如果要注入的key存在于父组件的provides中则返回值
        if (key in provides) {
            return provides[key];
        }
        // 如果要注册的key不存在于父组件的provides中，则有默认值时返回默认值
        if (defaultValue) {
            return treatDefaultAsFactory && isFunction(defaultValue)
                ? defaultValue.call(instance.proxy)
                : defaultValue;
        }
    }
}

/*
 * @Author: Zhouqi
 * @Date: 2022-04-03 14:53:41
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-03 15:26:34
 */
function createAppApi(render) {
    return function createApp(rootComponent) {
        const app = {
            use() { },
            mixin() { },
            component() { },
            directive() { },
            mount(rootContainer) {
                // 创建虚拟节点
                const vnode = createVnode(rootComponent);
                // 渲染真实节点
                render(vnode, rootContainer);
            },
            unmount() { },
            provide() { },
        };
        return app;
    };
}

/*
 * @Author: Zhouqi
 * @Date: 2022-03-26 21:59:49
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-04 21:16:54
 */
/**
 * @description: 自定义渲染器
 * @param options 传入的平台渲染方法集合
 */
function createRenderer(options) {
    return baseCreateRenderer(options);
}
/**
 * @description: 创建基础渲染器函数
 * @param options 传入的平台渲染方法集合
 */
function baseCreateRenderer(options) {
    /**
     * @description: 渲染函数
     * @param vnode 虚拟节点
     * @param container 容器
     */
    function render(vnode, container) {
        // 新的虚拟节点为null，说明是卸载操作
        if (vnode === null) ;
        else {
            patch(container._vnode || null, vnode, container, null);
        }
        // 缓存当前vnode，下一次更新的时候，该值就是旧的vnode
        container._vnode = vnode;
    }
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options;
    /**
     * @description: 更新函数
     * @param n1 老的虚拟节点
     * @param n2 新的虚拟节点
     * @param container 容器
     * @param parentComponent 父组件实例
     */
    const patch = (n1, n2, container, parentComponent = null) => {
        if (n1 === n2) {
            return;
        }
        const { shapeFlag, type } = n2;
        switch (type) {
            // 特殊虚拟节点类型处理
            case Fragment:
                // 处理type为Fragment的节点（插槽）
                processFragment(n1, n2, container, parentComponent);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                // if is element
                if (shapeFlag & 1 /* ELEMENT */) {
                    processElement(n1, n2, container, parentComponent);
                }
                else if (shapeFlag & 4 /* STATEFUL_COMPONENT */) {
                    // if is component
                    processComponent(n1, n2, container, parentComponent);
                }
        }
    };
    /**
     * @description: 处理Fragment节点
     * @param n1 老的虚拟节点
     * @param n2 新的虚拟节点
     * @param container 容器
     * @param parentComponent 父组件实例
     */
    const processFragment = (n1, n2, container, parentComponent) => {
        // 老的虚拟节点不存，则表示创建节点
        if (n1 === null) {
            const { children } = n2;
            mountChildren(children, container, parentComponent);
        }
    };
    /**
     * @description: 处理节点为Text类型的虚拟节点
     * @param  n1 老的虚拟节点
     * @param  n2 新的虚拟节点
     * @param  container 容器
     */
    const processText = (n1, n2, container) => {
        // 老的虚拟节点不存，则表示创建节点
        if (n1 === null) {
            const { children } = n2;
            const el = (n2.el = document.createTextNode(children));
            container.appendChild(el);
        }
    };
    /**
     * @description: 处理组件
     * @param n1 旧的虚拟节点
     * @param n2 新的虚拟节点
     * @param container 容器
     * @param  parentComponent 父组件实例
     */
    const processComponent = (n1, n2, container, parentComponent) => {
        // n1为null表示初始化组件
        if (n1 === null) {
            mountComponent(n2, container, parentComponent);
        }
    };
    /**
     * @description: 创建元素
     * @param  initialVNode 初始虚拟节点
     * @param  container 容器
     * @param  parentComponent 父组件实例
     */
    const mountComponent = (initialVNode, container, parentComponent) => {
        // 获取组件实例
        const instance = createComponentInstance(initialVNode, parentComponent);
        // 初始化组件
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container);
    };
    /**
     * @description: 执行渲染和挂载
     * @param  instance 组件实例
     * @param  initialVNode 初始虚拟节点
     * @param  container 容器
     */
    const setupRenderEffect = (instance, initialVNode, container) => {
        // 收集依赖，在依赖的响应式数据变化后可以执行更新
        effect(() => {
            // 通过isMounted判断组件是否创建过，如果没创建过则表示初始化渲染，否则为更新
            if (!instance.isMounted) {
                const subTree = (instance.subTree = instance.render());
                patch(null, subTree, container, instance);
                // 表示组件Dom已经创建完成
                instance.isMounted = true;
                // 到这一步说明元素都已经渲染完成了，也就能够获取到根节点，这里的subTree就是根组件
                initialVNode.el = subTree.el;
            }
            else {
                // 更新
                const nextTree = instance.render();
                const prevTree = instance.subTree;
                instance.subTree = nextTree;
                patch(prevTree, nextTree, container, instance);
            }
        });
    };
    /**
     * @description: 处理普通元素
     * @param n1 老的虚拟节点
     * @param n2 新的虚拟节点
     * @param container 父容器
     * @param parentComponent 父组件实例
     */
    const processElement = (n1, n2, container, parentComponent) => {
        // 旧的虚拟节点不存在，说明是初始化渲染
        if (n1 === null) {
            mountElement(n2, container, parentComponent);
        }
        else {
            // 更新
            patchElement(n1, n2, parentComponent);
        }
    };
    /**
     * @description: 更新元素
     * @param n1 旧的虚拟节点
     * @param n2 新的虚拟节点
     * @param parentComponent 父组件实例
     */
    const patchElement = (n1, n2, parentComponent) => {
        // 新的虚拟节点上没有el，需要继承老的虚拟节点上的el
        const el = (n2.el = n1.el);
        patchChildren(n1, n2, el, parentComponent);
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        /**
         * props更新的三种情况
         * 1、旧的和新都存在key且新旧值存在但是不一样 —————— 更新属性值
         * 2、新的key上的值不存在 ———— 删除属性
         * 3、旧的key在新的上面不存在 ———— 删除属性
         */
        patchProps(el, n2, oldProps, newProps);
    };
    /**
     * @description: 更新孩子节点
     * @param n1 旧的虚拟节点
     * @param n2 新的虚拟节点
     * @param container 容器
     * @param parentComponent 父组件实例
     */
    const patchChildren = (n1, n2, container, parentComponent) => {
        const c1 = n1.children;
        const c2 = n2.children;
        const prevShapeFlag = n1 ? n1.shapeFlag : 0;
        const { shapeFlag } = n2;
        // 更新的几种情况
        if (shapeFlag & 8 /* TEXT_CHILDREN */) {
            // 1. 新的虚拟节点的子节点是一个文本节点，旧的虚拟节点的子节点是一个数组，则删除旧的节点元素，然后创建新的文本节点
            unmountChildren(c1);
            // 2. 旧的虚拟节点也是一个文本节点，但是文本内容不同，此时只需要更新文本内容
            if (c1 !== c2) {
                hostSetElementText(container, c2);
            }
        }
        else {
            // 走进这里说明新的孩子节点不存在或者是数组类型
            if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
                if (shapeFlag & 16 /* ARRAY_CHILDREN */) ;
                else {
                    // 4. 新的节点不存在，则删除旧的子节点
                    unmountChildren(c1);
                }
            }
            else {
                // 旧的孩子节点为文本节点。这种情况不管怎样，旧的文本节点都必须清空
                if (prevShapeFlag & 8 /* TEXT_CHILDREN */) {
                    // 5. 旧的是一个文本节点，新的子节点不存在，将文本清空
                    hostSetElementText(container, "");
                }
                if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                    // 6. 旧的是文本节点，新的是数组节点，则清空文本并创建新的子节点
                    mountChildren(c2, container, parentComponent);
                }
            }
        }
    };
    /**
     * @description: 删除数组类型的子节点
     * @param children 孩子节点vnode
     */
    const unmountChildren = (children) => {
        const childrenLength = children.length;
        for (let i = 0; i < childrenLength; i++) {
            hostRemove(children[i].el);
        }
    };
    /**
     * @description: 更新props属性
     * @param el 容器
     * @param n2 新的虚拟节点
     * @param oldProps 旧的props
     * @param newProps 新的props
     */
    const patchProps = (el, n2, oldProps, newProps) => {
        if (oldProps === newProps)
            return;
        for (const key in newProps) {
            const nextValue = newProps[key];
            const prevValue = oldProps[key];
            if (nextValue !== prevValue) {
                hostPatchProp(el, key, prevValue, nextValue);
            }
        }
        if (oldProps === EMPTY_OBJ)
            return;
        for (const key in oldProps) {
            // 旧的key在新的中找不到则表示删除
            if (!(key in newProps)) {
                hostPatchProp(el, key, oldProps[key], null);
            }
        }
    };
    /**
     * @description: 生成普通元素
     * @param  vnode 虚拟dom
     * @param  container 父容器
     * @param  parentComponent 父组件实例
     */
    const mountElement = (vnode, container, parentComponent) => {
        const { type, props, children, shapeFlag } = vnode;
        const el = (vnode.el = hostCreateElement(type));
        // 处理children
        if (shapeFlag & 8 /* TEXT_CHILDREN */) {
            // 孩子是一个字符串表示文本类型
            el.textContent = children;
        }
        else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
            mountChildren(children, el, parentComponent);
        }
        if (props) {
            // 处理props
            for (const key in props) {
                hostPatchProp(el, key, null, props[key]);
            }
        }
        hostInsert(el, container, null);
    };
    /**
     * @description: 递归处理子节点
     * @param children 子节点
     * @param container 父容器
     * @param parentComponent 父组件实例
     */
    const mountChildren = (children, container, parentComponent) => {
        children.forEach((vnode) => {
            patch(null, vnode, container, parentComponent);
        });
    };
    return {
        createApp: createAppApi(render),
    };
}

/*
 * @Author: Zhouqi
 * @Date: 2022-03-27 14:37:57
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-03-27 14:38:59
 */
function h(type, props, children) {
    return createVnode(type, props, children);
}

/*
 * @Author: Zhouqi
 * @Date: 2022-04-03 15:36:54
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-04 20:39:52
 */
// 平台渲染操作
const nodeOps = {
    // 创建节点
    createElement(type) {
        return document.createElement(type);
    },
    // 添加节点
    insert: (child, parent, anchor) => {
        parent.insertBefore(child, anchor || null);
    },
    // 删除节点
    remove(child) {
        const parent = child.parentNode;
        parent && parent.removeChild(child);
    },
    // 设置文本内容
    setElementText(el, text) {
        el.textContent = text;
    },
};

/*
 * @Author: Zhouqi
 * @Date: 2022-04-04 13:53:46
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-04 13:54:54
 */
function patchAttr(el, key, value) {
    // 新的值不存在，则表示删除属性
    if (value === null || value === undefined) {
        el.removeAttribute(key);
    }
    else {
        el.setAttribute(key, value);
    }
}

/*
 * @Author: Zhouqi
 * @Date: 2022-03-28 20:16:47
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-03-29 15:42:46
 */
// 事件绑定
function addEventListener(el, event, handler) {
    el.addEventListener(event, handler);
}
// 事件销毁
function removeEventListener(el, event, handler) {
    el.removeEventListener(event, handler);
}
// 获取当前时间，默认使用低精度时间
let _getNow = Date.now;
/**
 * 由于不同浏览器事件的timeStamp使用的epoch time（新纪元时间）不同，因此这里需要兼容当前时间的获取
 * 当游览器事件使用的timeStamp是低精度时间（新纪元时间为 0:0:0 UTC 1st January 1970.）时，getNow函数需要使用Date.now（低精度）
 * 当浏览器事件使用的timeStamp是高精度时间时（新纪元时间为系统启动的时间），getNow函数需要使用performace.now（高精度）
 *
 * https://www.w3.org/TR/2000/REC-DOM-Level-2-Events-20001113/events.html#Events-Event-timeStamp
 * https://www.w3.org/TR/hr-time/#sec-domhighrestimestamp
 * http://jimliu.net/2014/03/16/hrt-in-js/
 */
if (typeof window !== "undefined" &&
    window.performance &&
    window.performance.now) {
    const eventTimeStamp = document.createEvent("event").timeStamp;
    // 假如当前时间大于事件的timeStamp，则认为事件使用的是高精度时间，此时getNow函数也应该返回高精度时间
    if (_getNow() > eventTimeStamp) {
        _getNow = () => window.performance.now();
    }
}
// 为了优化频繁调用performance.now的性能，我们在一个事件循环内注册的所有事件统一使用一个timeStamp
let cachedNow = 0;
// 创建微任务，当一个tick执行完时重置cachedNow
const p = Promise.resolve();
const rest = () => {
    cachedNow = 0;
};
const getNow = () => cachedNow || (p.then(rest), (cachedNow = _getNow()));
// props上的事件注册函数
function patchEvent(el, key, preValue, nextValue) {
    /**
     * 这里创建一个伪造的事件代理函数invoker，将原始事件赋值到invoker的value属性上
     * 将invoker作为最终绑定的事件，在执行invoker函数时内部会执行原始的绑定事件，即执行invoker.value()
     *
     * 新建伪造的事件代理函数有几个作用：
     * 1、方便事件更新
     * 2、控制原始事件的执行（涉及到事件冒泡机制）
     * 3、…………?
     *
     * 由于原生事件类型有很多，为了不互相覆盖，这里需要建立一个map对象invokers，key指代事件类型，值是伪造的事件代理函数
     */
    const invokers = el._vei || (el._vei = {});
    const eventName = key.slice(2).toLowerCase();
    const hasInvoker = invokers[eventName];
    if (nextValue) {
        // 如果存在新的值且旧的事件代理函数存在，则表示更新事件，否则表示添加新的事件绑定
        if (hasInvoker) {
            /**
             * 1、方便事件更新
             * 在更新事件时，不需要销毁原来的事件，再绑定新的事件，而只要更新invoker.value属性即可
             */
            hasInvoker.value = nextValue;
        }
        else {
            const invoker = (invokers[eventName] = createInvoker(nextValue));
            addEventListener(el, eventName, invoker);
            invoker.attached = getNow();
        }
    }
    else if (hasInvoker) {
        // 新的值不存在且事件代理函数存在，则表示销毁事件绑定
        removeEventListener(el, eventName, hasInvoker);
        invokers[eventName] = undefined;
    }
}
// 创建事件代理函数
function createInvoker(events) {
    const invoker = (e) => {
        const timestamp = e.timeStamp;
        // console.log(timestamp);
        /**
         * 2、控制原始事件的执行（涉及到事件冒泡机制）
         * 假设父vnode上有onClick事件，事件值取决于一个响应式数据的值，比如：onClick: isTrue ? () => console.log(1) : null，
         * 子vnode上有一个绑定事件onClick: () => { isTrue = true }，当点击子vnode时会触发click事件，由于事件冒泡机制，click
         * 会向上冒泡到父节点，由于isTrue初始为false，因此父节点上不应该有绑定的click事件，但是却打印了1。
         * 这是由于vue的更新机制和事件冒泡时机导致的，实际上当isTrue被修改为true时触发了事件更新，更新后父节点上绑定了事件，之后事件才
         * 冒泡到父节点上，执行了父节点绑定的click事件。而解决方式就是在执行子元素事件的时候记录事件执行的时间，在这个时间点之后绑定的事件都
         * 不要去执行，这时候就需要有控制原始事件执行的功能。
         */
        // 事件冒泡时，e会往上传递其中s.timestamp就是事件最开始执行的事件
        if (timestamp < invoker.attached)
            return;
        // 如果events是一个数组，则循环执行
        isArray(invoker.value)
            ? invoker.value.forEach((fn) => fn(e))
            : invoker.value(e);
    };
    invoker.value = events;
    return invoker;
}

/*
 * @Author: Zhouqi
 * @Date: 2022-04-04 14:03:59
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-04 14:10:00
 */
/**
 * @description: 更新dom属性
 * @param el dom元素
 * @param key 属性
 * @param value 值
 */
function patchDOMProp(el, key, value) {
    if (value === "" || value === null) {
        const type = typeof el[key];
        // 对于dom属性上的值为boolean的情况下，如果设置的值是空的则需要转化为true
        if (type === "boolean") {
            el[key] = true;
            return;
        }
        el.removeAttribute(key);
        return;
    }
    el[key] = value;
}

/*
 * @Author: Zhouqi
 * @Date: 2022-03-27 15:44:22
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-04 14:04:53
 */
/**
 * @description: 处理props属性
 * 处理props时需要理解HTML Attribute 和 DOM property的关系
 *
 * 例如:
 * 我们可以通过input.value属性去获取input的文本值，这个value就是input元素上的属性，也就是DOM property
 * <input value="123" /> 这个value属性可以设置在input标签上，值可以通过getAttribute去获取，这个value就是HTML Attribute
 * HTML Attribute可能跟DOM property有对应的映射关系（id->id），也可能没有（aria-）或者有多个映射关系（value->value/defaultValue），同样名称也不一定对应（class->className）
 *
 * <input value="123" /> 上的value属性对应着元素input上的value属性，但是input标签上的value值并不总是和input元素上的值相等
 * 当我们初始化<input value="123" />时，通过input.value获取到的和input标签上的value值是一样的
 * 但是当我们修改input里面的内容时，通过input.value去访问value值和通过getAttribute方法获取inpu标签上的value值是不一样的
 * input标签上的value值依然还是初始时设置的值，因为我们可以认为HTML Attribute的值是DOM property上的初始值。
 *
 * 在处理元素属性上需要遵循一个结论：如果对应的属性可以在DOM property上找到，就去设置对应的DOM property，如果没找到就通过setAttribute去设置，当然还有其它特殊情况会慢慢补充
 * @param el 元素
 * @param key 属性名
 */
function patchProp(el, key, preValue, nextValue) {
    if (shouldSetAsProp(el, key)) {
        patchDOMProp(el, key, nextValue);
    }
    else if (key === "class") {
        // class通过className去设置性能最好
        el.className = nextValue;
    }
    else if (isOn(key)) {
        // 注册事件
        patchEvent(el, key, preValue, nextValue);
    }
    else {
        // 更新html属性
        patchAttr(el, key, nextValue);
    }
}
// 是否可以直接设置DOM property
function shouldSetAsProp(el, key, value) {
    // form属性是只读的，只能通过setAttribute设置属性
    if (key === "form") {
        return false;
    }
    return key in el;
}

/*
 * @Author: Zhouqi
 * @Date: 2022-03-26 21:20:44
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-03 20:31:00
 */
const rendererOptions = extend({ patchProp }, nodeOps);
function ensureRenderer() {
    return createRenderer(rendererOptions);
}
const createApp = (...args) => {
    const app = ensureRenderer().createApp(...args);
    // 劫持app实例上原有的mount函数
    const { mount } = app;
    app.mount = (containerOrSelector) => {
        const container = normalizeContainer(containerOrSelector);
        if (!container)
            return;
        mount(container);
    };
    return app;
};
/**
 * @description: 识别容器，如果是dom则直接返回；如果是字符串，则通过字符串获取dom
 * @param container 挂载元素
 */
function normalizeContainer(container) {
    if (typeof container === "string") {
        return document.querySelector(container);
    }
    return container;
}

exports.ReactiveEffect = ReactiveEffect;
exports.canTrack = canTrack;
exports.createApp = createApp;
exports.createRenderer = createRenderer;
exports.createTextVnode = createTextVnode;
exports.effect = effect;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.isProxy = isProxy;
exports.isReactive = isReactive;
exports.isReadonly = isReadonly;
exports.isRef = isRef;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.reactive = reactive;
exports.readonly = readonly;
exports.ref = ref;
exports.renderSlot = renderSlot;
exports.shallowReactive = shallowReactive;
exports.shallowReadonly = shallowReadonly;
exports.shallowRef = shallowRef;
exports.stop = stop;
exports.toRaw = toRaw;
exports.toRef = toRef;
exports.toRefs = toRefs;
exports.track = track;
exports.trackEffects = trackEffects;
exports.trackRefValue = trackRefValue;
exports.trigger = trigger;
exports.triggerEffects = triggerEffects;
exports.unRef = unRef;