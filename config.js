// 定义系统级函数列表
const systemFunctions = new Set([
  // 全局对象
  "globalThis", "window", "self", "global",

  // 值属性
  "Infinity", "NaN", "undefined",

  // 函数属性
  "eval", "isFinite", "isNaN", "parseFloat", "parseInt",
  "decodeURI", "decodeURIComponent", "encodeURI", "encodeURIComponent",

  // 基础对象
  "Object", "Function", "Boolean", "Symbol",

  // 错误对象
  "Error", "AggregateError", "EvalError", "InternalError", "RangeError",
  "ReferenceError", "SyntaxError", "TypeError", "URIError",

  // 数字和日期对象
  "Number", "BigInt", "Math", "Date",

  // 文本处理
  "String", "RegExp",

  // 索引集合对象
  "Array", "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array",
  "Uint16Array", "Int32Array", "Uint32Array", "Float32Array", "Float64Array",
  "BigInt64Array", "BigUint64Array",

  // 键值集合对象
  "Map", "Set", "WeakMap", "WeakSet",

  // 结构化数据
  "ArrayBuffer", "SharedArrayBuffer", "Atomics", "DataView", "JSON",

  // 控制抽象对象
  "Promise", "Generator", "GeneratorFunction", "AsyncFunction",

  // 反射
  "Reflect", "Proxy",

  // 国际化
  "Intl",

  // WebAssembly
  "WebAssembly",

  // 其他
  "console", "setTimeout", "setInterval", "clearTimeout", "clearInterval"
]);

module.exports = {
  systemFunctions
};
