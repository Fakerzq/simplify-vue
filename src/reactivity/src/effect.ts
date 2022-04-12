/*
 * @Author: Zhouqi
 * @Date: 2022-03-20 20:52:58
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-12 22:42:49
 */
import { extend, isArray, isMap } from "../../shared/src/index";
import { Dep } from "./dep";
import { TriggerOpTypes } from "./operations";

interface RectiveEffectOptions {
  onStop?: Function;
  scheduler?: Function;
  lazy?: boolean;
}

interface ReactiveEffectRunner {
  _effect: ReactiveEffect;
}

export const ITERATE_KEY = Symbol("iterate");
export const MAP_KEY_ITERATE_KEY = Symbol("Map key iterate");

export class ReactiveEffect {
  deps: Dep[] = [];
  onStop?: Function;
  private active = true;

  constructor(public effectFn, public scheduler?) {}

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
      // 移除依赖
      cleanup(this);
      this.onStop && this.onStop();
      this.active = false;
    }
  }
}

// 找到所有依赖这个 effect 的响应式对象，从这些响应式对象里面把 effect 给删除掉
function cleanup(effect: ReactiveEffect) {
  effect.deps.forEach((deps) => {
    deps.delete(effect);
  });
  effect.deps.length = 0;
}

let activeEffect: ReactiveEffect | undefined;
/**
 * 收集当前正在使用的ReactiveEffect，在嵌套effect的情况下，每一个effect执行
 * 时内部的ReactiveEffect是不同的。建立activeEffectStack是为了能够在对应的
 * effect函数执行时收集到正确的activeEffect。
 *
 * effect(() => {
 *     effect(() => {
 *       执行逻辑
 *     });
 *     执行逻辑
 *   });
 *
 * 执行过程：
 * 外层effect执行 ---> activeEffect=当前effect内部创建的ReactiveEffect
 * 并且被收集到activeEffectStack中 ---> 内部effect执行 ---> activeEffect=当前effect
 * 内部创建的ReactiveEffect并且被收集到activeEffectStack中 ---> 内部effect执行完成，
 * activeEffectStack弹出栈顶的ReactiveEffect，此时栈顶的ReactiveEffect对应外层effect，
 * 取出后赋值给当前的activeEffect
 */
const activeEffectStack: Array<any> = [];

let shouldTrack = true;

// 能否能进行依赖收集
export function canTrack(): boolean {
  return !!(shouldTrack && activeEffect);
}

// 暂停依赖追踪
export function pauseTracking() {
  shouldTrack = false;
}

// 恢复依赖追踪
export function resetTracking() {
  shouldTrack = true;
}

/**
 * options:{
 *    scheduler: 用户自定义的调度器函数
 *    onStop: 清除响应式时触发回调函数;
 *    lazy: 是否懒执行，即第一次不执行fn
 * }
 */
export function effect(effectFn: Function, options: RectiveEffectOptions = {}) {
  const _effect = new ReactiveEffect(effectFn, options.scheduler);
  options && extend(_effect, options);
  // 如果不是懒执行，则执行一次副作用函数
  if (!options.lazy) _effect.run();
  const runner: any = _effect.run.bind(_effect);
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
export function track(target: object, key: unknown) {
  // if (!activeEffect) return;
  if (!canTrack()) return;
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
export function trackEffects(deps: Dep) {
  deps.add(activeEffect!);
  activeEffect!.deps.push(deps);
}

// 触发依赖函数
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown
) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  let deps: (Dep | undefined)[] = [];

  if (key === "length" && isArray(target)) {
    /**
     * 如果操作了数组的length，比如 arr = [1], arr.length = 0;
     * 此时会删除arr[0]这个元素，需要触发key为0相关的依赖；当时假如
     * arr.length = 1，此时arr[0]依旧存在，不受影响，不需要触发依赖。
     * 因此我们得出一个结论，当修改数组的长度属性时，需要触发原数组中下标大于
     * 新length值的依赖。
     */
    depsMap.forEach((dep, key) => {
      // 不要遗漏了key为length的依赖，因为操作了length
      if (key === "length" || key >= (newValue as number)) {
        deps.push(dep);
      }
    });
  } else {
    // 如果key不是undefined，则获取对应key上的deps依赖集合
    if (key !== void 0) {
      deps.push(depsMap.get(key));
    }

    // 针对不同的type还需要做特殊处理
    switch (type) {
      case TriggerOpTypes.SET:
        // Map的forEach既关心键，也关心值，因此修改的时候也要获取ITERATE_KEY相关的依赖
        if (isMap(target)) {
          deps.push(depsMap.get(ITERATE_KEY));
        }
        break;
      case TriggerOpTypes.ADD:
        if (!isArray(target)) {
          // 对象新增属性操作，影响for in操作，需要获取ITERATE_KEY相关的依赖
          deps.push(depsMap.get(ITERATE_KEY));
          if (isMap(target)) {
            // Map新增属性操作，影响keys操作，需要获取MAP_KEY_ITERATE_KEY相关的依赖
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
          }
        } else {
          // 数组新增元素操作，会影响length属性，需要获取length相关的依赖
          deps.push(depsMap.get("length"));
        }
        break;
      case TriggerOpTypes.DELETE:
        // 删除属性操作，影响for 新操作，需要获取ITERATE_KEY相关的依赖
        deps.push(depsMap.get(ITERATE_KEY));
        if (isMap(target)) {
          // Map删除属性操作，影响keys操作，需要获取MAP_KEY_ITERATE_KEY相关的依赖
          deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
        }
        break;
      default:
        break;
    }
  }

  // 构建一个新的effect集合，防止无限循环，比如：删除effect的同时又添加effect
  const effects: ReactiveEffect[] = [];

  for (const dep of deps) {
    if (dep) {
      effects.push(...dep);
    }
  }
  triggerEffects(effects);
}

// 抽离公共的触发依赖逻辑
export function triggerEffects(deps: (Dep | ReactiveEffect)[]) {
  // dep不是数组的话转化成数组，比如ref触发依赖传入的是一个set集合
  const depsToRun = isArray(deps) ? deps : [...deps];
  depsToRun.forEach((dep: any) => {
    /**
       * 这里的dep !== activeEffect是为了防止obj++这种形成：收集--》更新--》收集的循环现象
       * effect(() => {
        // user.num ++ ====> user.num = user.num + 1;
        user.num++;
       });
       */
    if (dep !== activeEffect) {
      const scheduler = dep.scheduler;
      // 触发依赖的时候，如果存在用户自定义调度器，则执行调度器函数，否则执行依赖函数
      scheduler ? scheduler(dep.effectFn) : dep.run();
    }
  });
}

// 停止副作用函数执行
export function stop(runner: ReactiveEffectRunner) {
  runner._effect.stop();
}
