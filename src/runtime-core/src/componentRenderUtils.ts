/*
 * @Author: Zhouqi
 * @Date: 2022-04-05 20:00:07
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-16 10:39:43
 */

import { ShapeFlags } from "../../shared/src";
import { cloneVNode, normalizeVNode } from "./vnode";

/**
 * @author: Zhouqi
 * @description: 生成组件的vnode
 * @param instance 组件实例
 */
export function renderComponentRoot(instance) {
  const { attrs, render, proxy, vnode, inheritAttrs } = instance;
  let fallthroughAttrs;
  let result;

  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    // 处理有状态组件
    result = normalizeVNode(render.call(proxy, proxy));
    fallthroughAttrs = attrs;
  }

  // attrs存在且可以继承attrs属性的情况下
  if (fallthroughAttrs && inheritAttrs !== false) {
    const attrsKeys = Object.keys(fallthroughAttrs);
    const { shapeFlag } = result;
    if (
      attrsKeys.length &&
      shapeFlag & (ShapeFlags.ELEMENT | ShapeFlags.COMPONENT)
    ) {
      result = cloneVNode(result, fallthroughAttrs);
    }
  }
  
  return result;
}

/**
 * @author: Zhouqi
 * @description: 是否需要更新组件
 * @param n1 旧的虚拟节点
 * @param n2 新的虚拟节点
 */
export function shouldUpdateComponent(n1, n2) {
  const { props: prevProps, children: prevChildren } = n1;
  const { props: nextProps, children: nextChildren } = n2;

  if (prevChildren || nextChildren) {
    if (!nextChildren || !(nextChildren as any).$stable) {
      return true;
    }
  }

  if (prevProps === nextProps) {
    return false;
  }
  if (!prevProps) {
    return !!nextProps;
  }
  if (!nextProps) {
    return true;
  }

  return hasPropsChanged(prevProps, nextProps);
}

/**
 * @author: Zhouqi
 * @description: 比较新旧props是否变化
 * @param prevProps
 * @param nextProps
 */
function hasPropsChanged(prevProps, nextProps) {
  if (Object.keys(prevProps) !== Object.keys(prevProps)) {
    return false;
  }
  for (const key in nextProps) {
    if (nextProps[key] !== prevProps[key]) {
      return true;
    }
  }
  return false;
}
