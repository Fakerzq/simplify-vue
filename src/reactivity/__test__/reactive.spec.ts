/*
 * @Author: Zhouqi
 * @Date: 2022-03-20 20:46:00
 * @LastEditors: Zhouqi
 * @LastEditTime: 2022-04-11 20:01:33
 */
import { effect } from "../src/effect";
import { reactive } from "../src/reactive";

describe("reactive", () => {
  it("happy path", () => {
    const org = { foo: 1 };
    const obOrg: any = reactive(org);
    expect(obOrg).not.toBe(org);
    expect(obOrg.foo).toBe(1);
  });

  it("test rawValue", () => {
    let i = 0;
    const pObj: any = reactive({
      num: 1,
    });

    const rObj: any = reactive({ num1: 1 });
    effect(() => {
      i++;
      rObj.num1;
    });

    rObj.num1 = pObj;
    expect(i).toBe(2);
    rObj.num1 = pObj;
    expect(i).toBe(2);
  });

  it("test proxy has ", () => {
    let i = 0;
    const obj: any = reactive({
      num: 1,
    });
    effect(() => {
      i++;
      "num" in obj;
    });
    obj.num++;
    expect(i).toBe(2);
  });

  it("test proxy ownkeys ", () => {
    let i = 0;
    const obj: any = reactive({
      num: 1,
    });
    effect(() => {
      i++;
      for (const key in obj) {
      }
    });

    obj.num1 = 0;

    expect(i).toBe(2);
    obj.num = 2;
    expect(i).toBe(2);
  });

  it("test proxy deleteProperty ", () => {
    let i = 0;
    const obj: any = reactive({
      num: 1,
      num1: 0,
    });
    effect(() => {
      i++;
      for (const key in obj) {
      }
    });

    obj.num1 = 1;
    expect(i).toBe(1);

    delete obj.num;
    expect(i).toBe(2);
  });

  it("test prototype chain", () => {
    const obj = { name: "zs" };
    const obj1 = { name1: "ls" };
    const child: any = reactive(obj);
    const parent = reactive(obj1);
    Object.setPrototypeOf(child, parent);
    let i = 0;
    effect(() => {
      i++;
      // 
      child.name1;
    });

    child.name1 = "ww";
    expect(i).toBe(2);
  });
});
