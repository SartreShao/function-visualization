const fs = require("fs");
const acorn = require("acorn");
const estraverse = require("estraverse");
const path = require("path");

// 系统级函数列表（可以根据需要扩展）
const systemFunctions = new Set([
  // 全局对象
  "globalThis", "window", "self", "global",

  // 值属性
  "Infinity", "NaN", "undefined",

  // 函数属性
  "eval", "isFinite", "isNaN", "parseFloat", "parseInt",
  "decodeURI", "decodeURIComponent", "encodeURI", "encodeURIComponent",

  // 基本对象
  "Object", "Function", "Boolean", "Symbol",

  // 错误对象
  "Error", "AggregateError", "EvalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError",

  // 数字和日期对象
  "Number", "BigInt", "Math", "Date",

  // 字符串
  "String", "RegExp",

  // 可索引的集合对象
  "Array", "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array", "Uint16Array",
  "Int32Array", "Uint32Array", "Float32Array", "Float64Array", "BigInt64Array", "BigUint64Array",

  // 使用键的集合对象
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
  "console", "fetch", "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "requestAnimationFrame", "cancelAnimationFrame", "queueMicrotask",
  "btoa", "atob", "performance",

  // DOM 相关
  "document", "history", "location", "navigator", "screen", "localStorage", "sessionStorage",

  // Web API
  "XMLHttpRequest", "Blob", "File", "FileReader", "URL", "URLSearchParams",
  "WebSocket", "Worker", "ServiceWorker", "Notification", "Crypto",

  // 事件
  "Event", "CustomEvent", "EventTarget",

  // 多媒体
  "Image", "Audio", "Video", "Canvas", "CanvasRenderingContext2D", "WebGL",

  // 其他常用 API
  "setTimeout", "setInterval", "clearTimeout", "clearInterval",
  "requestAnimationFrame", "cancelAnimationFrame",
  "fetch", "XMLHttpRequest",
  "localStorage", "sessionStorage",
  "console"
]);

function getAllFunctionCalls(projectRoot, filePath, targetFunctionName) {
  // 读取文件内容
  const code = fs.readFileSync(filePath, "utf8");

  let scriptContent = [];

  if (filePath.endsWith(".vue")) {
    // 提取 <script> 标签中的内容
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(code)) !== null) {
      scriptContent.push(match[1]);
    }
  } else if (filePath.endsWith(".js")) {
    // 直接处理 .js 文件内容
    scriptContent.push(code);
  } else {
    throw new Error(
      "Unsupported file type. Only .js and .vue files are supported."
    );
  }

  // 用于存储函数调用的数组
  const functionCalls = {
    system: [],
    userDefined: [],
    npm: [],
    other: []
  };

  const importedModules = new Map();
  const userDefinedFunctions = new Map();
  const userDefinedObjects = new Set();

  // 解析并遍历每个 <script> 标签中的 JavaScript 代码
  scriptContent.forEach(script => {
    const ast = acorn.parse(script, {
      ecmaVersion: "latest",
      sourceType: "module"
    });

    // 收集 import 和 require 引入的模块和解构的函数
    estraverse.traverse(ast, {
      enter(node) {
        if (node.type === "ImportDeclaration") {
          const sourceValue = node.source.value;
          let resolvedPath;
          if (sourceValue.startsWith("@/")) {
            // 处理 @ 符号，替换为 src 目录
            resolvedPath = path.resolve(
              projectRoot,
              "src",
              sourceValue.slice(2)
            );
          } else if (sourceValue.startsWith(".") || sourceValue.startsWith("/")) {
            // 处理相对路径（包括 ../ 和 ./）和绝对路径
            resolvedPath = path.resolve(path.dirname(filePath), sourceValue);
          } else {
            // 处理 npm 包
            resolvedPath = null;
          }

          if (resolvedPath) {
            importedModules.set(path.basename(sourceValue), resolvedPath);
            node.specifiers.forEach(specifier => {
              if (
                specifier.type === "ImportSpecifier" ||
                specifier.type === "ImportDefaultSpecifier"
              ) {
                userDefinedFunctions.set(specifier.local.name, resolvedPath);
              } else if (specifier.type === "ImportNamespaceSpecifier") {
                userDefinedObjects.add(specifier.local.name);
              }
            });
          } else {
            importedModules.set(sourceValue, null);
          }
        } else if (
          node.type === "VariableDeclarator" &&
          node.init &&
          node.init.type === "CallExpression" &&
          node.init.callee.name === "require"
        ) {
          const sourceValue = node.init.arguments[0].value;
          let resolvedPath;
          if (sourceValue.startsWith("@/")) {
            // 处理 @ 符号，替换为 src 目录
            resolvedPath = path.resolve(
              projectRoot,
              "src",
              sourceValue.slice(2)
            );
          } else if (sourceValue.startsWith(".") || sourceValue.startsWith("/")) {
            // 处理相对路径（包括 ../ 和 ./）和绝对路径
            resolvedPath = path.resolve(path.dirname(filePath), sourceValue);
          } else {
            // 处理 npm 包
            resolvedPath = null;
          }

          if (resolvedPath) {
            importedModules.set(path.basename(sourceValue), resolvedPath);
            userDefinedObjects.add(node.id.name);
          } else {
            importedModules.set(sourceValue, null);
          }
        } else if (node.type === "FunctionDeclaration" && node.id) {
          userDefinedFunctions.set(node.id.name, filePath);
        } else if (
          node.type === "VariableDeclarator" &&
          node.init &&
          node.init.type === "ArrowFunctionExpression"
        ) {
          userDefinedFunctions.set(node.id.name, filePath);
        } else if (
          node.type === "VariableDeclarator" &&
          node.init &&
          node.init.type === "ObjectExpression"
        ) {
          userDefinedObjects.add(node.id.name);
        }
      }
    });

    // 遍历 AST 查找目标函数并提取函数调用
    estraverse.traverse(ast, {
      enter(node) {
        // 查找箭头函数表达式和普通函数声明
        if (
          (node.type === "VariableDeclarator" &&
            node.id.name === targetFunctionName &&
            node.init &&
            node.init.type === "ArrowFunctionExpression") ||
          (node.type === "FunctionDeclaration" &&
            node.id &&
            node.id.name === targetFunctionName)
        ) {
          const functionBody = node.init ? node.init.body : node.body;

          // 遍历函数体内的所有节点
          estraverse.traverse(functionBody, {
            enter(innerNode) {
              // 查找函数调用表达式
              if (innerNode.type === "CallExpression") {
                let functionName;
                if (innerNode.callee.type === "Identifier") {
                  // 普通函数调用
                  functionName = innerNode.callee.name;
                } else if (innerNode.callee.type === "MemberExpression") {
                  // 对象方法调用
                  if (
                    innerNode.callee.object.type === "Identifier" &&
                    innerNode.callee.property.type === "Identifier"
                  ) {
                    functionName = `${innerNode.callee.object.name}.${innerNode.callee.property.name}`;
                  }
                }

                if (functionName) {
                  const [objectName, methodName] = functionName.split(".");
                  if (systemFunctions.has(objectName)) {
                    functionCalls.system.push(functionName);
                  } else if (userDefinedFunctions.has(objectName)) {
                    functionCalls.userDefined.push({
                      name: functionName,
                      path: userDefinedFunctions.get(objectName)
                    });
                  } else if (userDefinedObjects.has(objectName)) {
                    functionCalls.userDefined.push({
                      name: functionName,
                      path: filePath
                    });
                  } else if (importedModules.has(objectName)) {
                    const modulePath = importedModules.get(objectName);
                    if (modulePath) {
                      const subFunctionCalls = getAllFunctionCalls(
                        projectRoot,
                        modulePath,
                        methodName
                      );
                      functionCalls.userDefined.push({
                        name: functionName,
                        path: modulePath,
                        calls: subFunctionCalls
                      });
                    } else {
                      functionCalls.npm.push(functionName);
                    }
                  } else {
                    functionCalls.other.push(functionName);
                  }
                }
              }
            }
          });
        }
      }
    });
  });

  return functionCalls;
}

// 导出函数
module.exports = { getAllFunctionCalls };