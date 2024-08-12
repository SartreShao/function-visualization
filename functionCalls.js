// 导入必要的模块
const fs = require("fs");
const acorn = require("acorn");
const estraverse = require("estraverse");
const path = require("path");
const { systemFunctions } = require("./config"); // 导入系统函数列表

/**
 * 读取文件内容
 * @param {string} filePath - 文件路径
 * @returns {string} 文件内容
 */
const readFileContent = filePath => fs.readFileSync(filePath, "utf8");

/**
 * 从Vue文件中提取<script>标签内容
 * @param {string} code - Vue文件内容
 * @returns {string[]} 提取的脚本内容数组
 */
const extractScriptContent = code => {
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  return Array.from(code.matchAll(scriptRegex), match => match[1]);
};

/**
 * 解析文件内容，处理.vue和.js文件
 * @param {string} filePath - 文件路径
 * @returns {string[]} 解析后的脚本内容数组
 */
const parseFileContent = filePath => {
  const code = readFileContent(filePath);
  return filePath.endsWith(".vue") ? extractScriptContent(code) : [code];
};

/**
 * 将脚本内容解析为AST
 * @param {string} script - 脚本内容
 * @returns {Object} AST对象
 */
const parseAST = script => acorn.parse(script, {
  ecmaVersion: "latest",
  sourceType: "module"
});

/**
 * 解析模块路径
 * @param {string} sourceValue - 源值
 * @param {string} projectRoot - 项目根目录
 * @param {string} filePath - 当前文件路径
 * @returns {string|null} 解析后的模块路径
 */
const resolveModulePath = (sourceValue, projectRoot, filePath) => {
  if (sourceValue.startsWith("@/")) {
    return path.resolve(projectRoot, "src", sourceValue.slice(2));
  } else if (sourceValue.startsWith(".") || sourceValue.startsWith("/")) {
    return path.resolve(path.dirname(filePath), sourceValue);
  }
  return null;
};

/**
 * 收集导入和声明信息
 * @param {Object} ast - AST对象
 * @param {string} projectRoot - 项目根目录
 * @param {string} filePath - 当前文件路径
 * @returns {Object} 收集到的导入和声明信息
 */
const collectImportsAndDeclarations = (ast, projectRoot, filePath) => {
  const importedModules = new Map();
  const userDefinedFunctions = new Map();
  const userDefinedObjects = new Set();

  estraverse.traverse(ast, {
    enter(node) {
      // 处理导入声明
      if (node.type === "ImportDeclaration") {
        const resolvedPath = resolveModulePath(node.source.value, projectRoot, filePath);
        if (resolvedPath) {
          importedModules.set(path.basename(node.source.value), resolvedPath);
          node.specifiers.forEach(specifier => {
            if (specifier.type === "ImportSpecifier" || specifier.type === "ImportDefaultSpecifier") {
              userDefinedFunctions.set(specifier.local.name, resolvedPath);
            } else if (specifier.type === "ImportNamespaceSpecifier") {
              userDefinedObjects.add(specifier.local.name);
            }
          });
        } else {
          importedModules.set(node.source.value, null);
        }
      } 
      // 处理require调用
      else if (node.type === "VariableDeclarator" && node.init && 
                 node.init.type === "CallExpression" && node.init.callee.name === "require") {
        const resolvedPath = resolveModulePath(node.init.arguments[0].value, projectRoot, filePath);
        if (resolvedPath) {
          importedModules.set(path.basename(node.init.arguments[0].value), resolvedPath);
          userDefinedObjects.add(node.id.name);
        } else {
          importedModules.set(node.init.arguments[0].value, null);
        }
      } 
      // 处理函数声明
      else if (node.type === "FunctionDeclaration" && node.id) {
        userDefinedFunctions.set(node.id.name, filePath);
      } 
      // 处理箭头函数
      else if (node.type === "VariableDeclarator" && node.init && 
                 node.init.type === "ArrowFunctionExpression") {
        userDefinedFunctions.set(node.id.name, filePath);
      } 
      // 处理对象声明
      else if (node.type === "VariableDeclarator" && node.init && 
                 node.init.type === "ObjectExpression") {
        userDefinedObjects.add(node.id.name);
      }
    }
  });

  return { importedModules, userDefinedFunctions, userDefinedObjects };
};

/**
 * 分析函数调用
 * @param {Object} ast - AST对象
 * @param {string} targetFunctionName - 目标函数名
 * @param {Object} context - 上下文信息
 * @param {string} projectRoot - 项目根目录
 * @param {string} filePath - 当前文件路径
 * @returns {Object} 函数调用分析结果
 */
const analyzeFunctionCalls = (ast, targetFunctionName, context, projectRoot, filePath) => {
  const functionCalls = { system: [], userDefined: [], npm: [], other: [] };

  // 处理单个函数调用
  const processFunctionCall = (functionName) => {
    const [objectName, methodName] = functionName.split(".");
    if (systemFunctions.has(objectName)) {
      functionCalls.system.push(functionName);
    } else if (context.userDefinedFunctions.has(objectName)) {
      functionCalls.userDefined.push({
        name: functionName,
        path: context.userDefinedFunctions.get(objectName)
      });
    } else if (context.userDefinedObjects.has(objectName)) {
      functionCalls.userDefined.push({
        name: functionName,
        path: filePath
      });
    } else if (context.importedModules.has(objectName)) {
      const modulePath = context.importedModules.get(objectName);
      if (modulePath) {
        const subFunctionCalls = getAllFunctionCalls(projectRoot, modulePath, methodName);
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
  };

  estraverse.traverse(ast, {
    enter(node) {
      // 查找目标函数
      if ((node.type === "VariableDeclarator" && node.id.name === targetFunctionName && 
           node.init && node.init.type === "ArrowFunctionExpression") || 
          (node.type === "FunctionDeclaration" && node.id && node.id.name === targetFunctionName)) {
        const functionBody = node.init ? node.init.body : node.body;

        // 遍历函数体
        estraverse.traverse(functionBody, {
          enter(innerNode) {
            if (innerNode.type === "CallExpression") {
              let functionName;
              if (innerNode.callee.type === "Identifier") {
                functionName = innerNode.callee.name;
              } else if (innerNode.callee.type === "MemberExpression" && 
                         innerNode.callee.object.type === "Identifier" && 
                         innerNode.callee.property.type === "Identifier") {
                functionName = `${innerNode.callee.object.name}.${innerNode.callee.property.name}`;
              }

              if (functionName) {
                processFunctionCall(functionName);
              }
            }
          }
        });
      }
    }
  });

  return functionCalls;
};

/**
 * 获取所有函数调用
 * @param {string} projectRoot - 项目根目录
 * @param {string} filePath - 文件路径
 * @param {string} targetFunctionName - 目标函数名
 * @returns {Object} 所有函数调用的分析结果
 */
const getAllFunctionCalls = (projectRoot, filePath, targetFunctionName) => {
  const scriptContents = parseFileContent(filePath);
  const functionCalls = { system: [], userDefined: [], npm: [], other: [] };

  scriptContents.forEach(script => {
    const ast = parseAST(script);
    const context = collectImportsAndDeclarations(ast, projectRoot, filePath);
    const calls = analyzeFunctionCalls(ast, targetFunctionName, context, projectRoot, filePath);

    Object.keys(calls).forEach(key => {
      functionCalls[key].push(...calls[key]);
    });
  });

  return functionCalls;
};

// 导出主函数
module.exports = { getAllFunctionCalls };