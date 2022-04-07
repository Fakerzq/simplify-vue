/*
 * @Author: Zhouqi
 * @Date: 2022-03-28 22:34:06
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-07 11:50:14
 */

import { shallowReactive } from "../../reactivity/src";
import {
  camelize,
  EMPTY_OBJ,
  hasOwn,
  isArray,
  isFunction,
  isObject,
} from "../../shared/src";

const enum BooleanFlags {
  shouldCast,
  shouldCastTrue,
}

/**
 * @description: 初始化props
 * @param instance 组件实例
 * @param rawProps 初始状态下的props
 * @param isStateful 是否是有状态组件
 */
export function initProps(instance, rawProps, isStateful) {
  // instance.props = rawProps || {};
  const attrs = {};
  // 创建一个props对象，区分组件实例上的props和虚拟dom上的props
  // 组件实例上的props只能访问到组件propsOptions定义的属性，区分出了attrs
  // vnode上的props是渲染用的props，没有区分attrs
  const props = {};

  setFullProps(instance, rawProps, props, attrs);
  // 有状态组件
  if (isStateful) {
    instance.props = shallowReactive(props);
  } else {
    // 函数式组件
  }
  instance.attrs = attrs;
}

/**
 * @description: 处理props和attrs
 * @param instance 组件实例
 * @param rawProps props对象
 * @param props 处理后最终的props
 * @param attrs 处理后最终的attrs
 */
function setFullProps(instance, rawProps, props, attrs) {
  const [normalized, needCastKeys] = instance.propsOptions;
  let rawCastValues = {};

  if (rawProps) {
    for (const key in rawProps) {
      // 对于保留关键字不需要处理，例如key、ref，这里不像vue3一样用isReservedProp函数做处理
      if (key === "ref" || key === "key") {
        continue;
      }
      const value = rawProps[key];
      let camelKey;
      // 统一转为驼峰命名
      if (normalized && hasOwn(normalized, (camelKey = camelize(key)))) {
        const shouldCast = needCastKeys && needCastKeys.includes(camelKey);
        shouldCast
          ? (rawCastValues[camelKey] = value)
          : (props[camelKey] = value);
      } else {
        // 处理attrs
        if (!(key in attrs) || attrs[camelKey] !== value) {
          attrs[camelKey] = value;
        }
      }
    }
  }

  // 特殊处理
  if (needCastKeys) {
    const castValues = rawCastValues || EMPTY_OBJ;
    const len = needCastKeys.length;
    for (let i = 0; i < len; i++) {
      const key = needCastKeys[i];
      props[key] = resolvePropValue(
        normalized,
        props,
        key,
        castValues[key],
        instance,
        !hasOwn(castValues, key)
      );
    }
  }
}

/**
 * @description: 解析props值，做一定的特殊处理
 * @param options props规则
 * @param props 处理后最终的props
 * @param key 属性名
 * @param value 属性值
 * @param instance 组件实例
 * @param isAbsent 在传入的props上是否有propsOptions校验规则上的key
 */
function resolvePropValue(options, props, key, value, instance, isAbsent) {
  const opt = options[key];
  if (opt) {
    const hasDefaultKey = hasOwn(opt, "default");
    if (hasDefaultKey && value === undefined) {
      const defaultValue = opt.default;
      value = defaultValue;
    }
    // 对于boolean类型数据的处理
    if (opt[BooleanFlags.shouldCast]) {
      //  如果校验类型里面有属性并且传入的props里面有对应的属性但是没有默认值的情况下value默认置为false
      if (!isAbsent && !hasDefaultKey) {
        value = false;
      } else if (opt[BooleanFlags.shouldCastTrue] && value === "") {
        // 针对html特定boolean属性值的兼容处理
        value = true;
      }
    }
  }
  return value;
}

/**
 * @description: 校验props选项的名称是否有效
 * @param {string} key 属性名
 */
function validatePropName(key: string) {
  // $开头的可能会和组件内部保留的属性名重复
  if (key[0] !== "$") {
    return true;
  }
  return false;
}

/**
 * @description: 解析组件上的propsOptions
 * @param comp 组件数据对象
 */
export function normalizePropsOptions(comp) {
  /**
   * ropsOptions类型
   * 1、数组 =====> props:['name','value']
   * 2、对象 =====> props:{name:{type:'xxx'……}} || props:{name:Person} || props:{name:[String,……]}
   */
  const { props: rawPropsOptions } = comp;
  const normalized = {};
  const needCastKeys: string[] = [];

  if (isArray(rawPropsOptions)) {
    const propsLength = rawPropsOptions.length;
    for (let i = 0; i < propsLength; i++) {
      const normalizedKey = camelize(rawPropsOptions[i]);
      if (validatePropName(normalizedKey)) {
        // 如果属性名符合规范，则默认初始化为空对象
        normalized[normalizedKey] = EMPTY_OBJ;
      }
    }
  } else if (isObject(rawPropsOptions)) {
    for (const key in rawPropsOptions) {
      const normalizedKey = camelize(key);
      if (validatePropName(normalizedKey)) {
        const options = rawPropsOptions[key];
        // 如果属性名对应的值是一个数组或者函数，那么这个值就是name对应的type
        const prop = (normalized[normalizedKey] =
          isArray(options) || isFunction(options)
            ? { type: options }
            : options);
        const booleanIndex = getTypeIndex(Boolean, prop.type);
        const stringIndex = getTypeIndex(String, prop.type);
        // 对于Boolean类型的props值需要处理的标记
        prop[BooleanFlags.shouldCast] = booleanIndex > -1;
        // 是否需要将Boolean类型的值处理为true的标记，比如’‘处理为true，这个跟html上的绑定属性有着一定的关联
        // 例如 <button disabled></button>本意为禁用，但是经过模板解析后成了props:{disabled:''}
        // ''这个值通过el.disabled（disabled的这个属性值在dom元素上的类型为Boolean）设置会转化为false，也就是不禁用。
        // 这显然和用户的真实意图相反，因此这里对于空字符串的属性值需要特殊处理，即把空字符串转换为true
        prop[BooleanFlags.shouldCastTrue] =
          stringIndex < 0 || booleanIndex < stringIndex;
        // 校验类型为boolean的或者有default默认值配置的props key值需要特殊处理
        if (booleanIndex > -1 || hasOwn(prop, "default")) {
          // 这里把需要特殊处理的key先添加到needCastKeys数组中供后面initProps使用
          needCastKeys.push(normalizedKey);
        }
      }
    }
  }
  return [normalized, needCastKeys];
}

/**
 * @description: 查找给定构造函数在传入的构造函数中的位置
 * @param  type
 * @param  expectedTypes
 */
function getTypeIndex(type, expectedTypes) {
  if (isArray(expectedTypes)) {
    return expectedTypes.findIndex((t) => isSameType(t, type));
  } else if (isFunction(expectedTypes)) {
    return isSameType(type, expectedTypes) ? 0 : -1;
  }
  return -1;
}

/**
 * @description: 检测两个构造函数是否相同
 * @param t1 类型
 * @param t2 类型
 */
function isSameType(t1, t2) {
  return getType(t1) == getType(t2);
}

/**
 * @description: 获取构造函数名称，function Xxx (){}中的Xxx
 * @param ctor 类型
 */
function getType(ctor) {
  const match = ctor && ctor.toString().match(/^\s*function (\w+)/);
  return match ? match[1] : ctor === null ? "null" : "";
}
