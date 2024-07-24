const fs = require("fs");
const acorn = require("acorn");
const estraverse = require("estraverse");

function extractFunctionCalls(filePath, targetFunctionName) {
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
  const functionCalls = [];

  // 解析并遍历每个 <script> 标签中的 JavaScript 代码
  scriptContent.forEach(script => {
    const ast = acorn.parse(script, {
      ecmaVersion: "latest",
      sourceType: "module"
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
                if (innerNode.callee.type === "Identifier") {
                  // 普通函数调用
                  functionCalls.push(innerNode.callee.name);
                } else if (innerNode.callee.type === "MemberExpression") {
                  // 对象方法调用
                  if (
                    innerNode.callee.object.type === "Identifier" &&
                    innerNode.callee.property.type === "Identifier"
                  ) {
                    functionCalls.push(
                      `${innerNode.callee.object.name}.${innerNode.callee.property.name}`
                    );
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

// 示例使用
const jsFilePath = "C:\\Code\\web\\easylink.cc\\src\\model\\api.js";
const vueFilePath =
  "C:\\Code\\web\\easylink.cc\\src\\views\\home\\HomeView.vue";
const funcName1 = "fetchIsWebToMpRedirectEnable";
const funcName2 = "inputFileChanged";

console.log(
  "JS File Function Calls:",
  extractFunctionCalls(jsFilePath, funcName1)
);
console.log(
  "Vue File Function Calls:",
  extractFunctionCalls(vueFilePath, funcName2)
);
