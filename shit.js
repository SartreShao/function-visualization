const fs = require("fs");
const acorn = require("acorn");
const estraverse = require("estraverse");

// 读取文件内容
const filePath = "C:\\Code\\web\\easylink.cc\\src\\model\\session.js";
// 目标函数名
const targetFunctionName = "generateSessionId";

const code = fs.readFileSync(filePath, "utf8");

// 解析 JavaScript 代码为 AST
const ast = acorn.parse(code, { ecmaVersion: "latest", sourceType: "module" });

// 用于存储函数调用的数组
const functionCalls = [];

// 遍历 AST 查找目标函数并提取函数调用
estraverse.traverse(ast, {
  enter(node) {
    // 查找箭头函数表达式
    if (
      node.type === "VariableDeclarator" &&
      node.id.name === targetFunctionName
    ) {
      const arrowFunction = node.init;
      if (arrowFunction && arrowFunction.type === "ArrowFunctionExpression") {
        // 遍历箭头函数体内的所有节点
        estraverse.traverse(arrowFunction.body, {
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
  }
});

// 打印结果
console.log(functionCalls);
