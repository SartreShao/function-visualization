const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const estraverse = require('estraverse');

// 读取文件内容
const filePath = "C:\\Code\\web\\easylink.cc\\src\\views\\home\\HomeView.vue";
// 目标函数名
const targetFunctionName = "inputFileChanged";

const code = fs.readFileSync(filePath, 'utf8');

// 提取 <script> 标签中的内容
const scriptContent = [];
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let match;
while ((match = scriptRegex.exec(code)) !== null) {
    scriptContent.push(match[1]);
}


// 用于存储函数调用的数组
const functionCalls = [];

// 解析并遍历每个 <script> 标签中的 JavaScript 代码
scriptContent.forEach(script => {
    const ast = acorn.parse(script, { ecmaVersion: 'latest', sourceType: 'module' });

    // 遍历 AST 查找目标函数并提取函数调用
    estraverse.traverse(ast, {
        enter(node) {
            // 查找箭头函数表达式和普通函数声明
            if ((node.type === 'VariableDeclarator' && node.id.name === targetFunctionName && node.init && node.init.type === 'ArrowFunctionExpression') ||
                (node.type === 'FunctionDeclaration' && node.id && node.id.name === targetFunctionName)) {
                
                const functionBody = node.init ? node.init.body : node.body;
                
                // 遍历函数体内的所有节点
                estraverse.traverse(functionBody, {
                    enter(innerNode) {
                        // 查找函数调用表达式
                        if (innerNode.type === 'CallExpression') {
                            if (innerNode.callee.type === 'Identifier') {
                                // 普通函数调用
                                functionCalls.push(innerNode.callee.name);
                            } else if (innerNode.callee.type === 'MemberExpression') {
                                // 对象方法调用
                                if (innerNode.callee.object.type === 'Identifier' && innerNode.callee.property.type === 'Identifier') {
                                    functionCalls.push(`${innerNode.callee.object.name}.${innerNode.callee.property.name}`);
                                }
                            }
                        }
                    }
                });
            }
        }
    });
});

// 打印结果
console.log(functionCalls);
