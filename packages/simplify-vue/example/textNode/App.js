/*
 * @Author: Zhouqi
 * @Date: 2022-03-26 21:17:12
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-13 20:28:51
 */
import {
    h,
    ref,
    createTextVNode
} from "../../dist/simplify-vue.esm.js";

export default {
    name: "App",
    setup() {
        const flag = ref(true);
        window.flag = flag;
        return {
            flag
        }
    },
    render() {
        return this.flag ? h("div", null, [h('div'), createTextVNode(2)]) : h("div", null, [h('div'), createTextVNode(3)]);
    }
};