const fs = require("fs");
const acorn = require("acorn");
const estraverse = require("estraverse");
const path = require("path");
const { systemFunctions } = require("./config"); // 假设我们将系统函数列表移到了配置文件中

const readFileContent = filePath => fs.readFileSync(filePath, "utf8");

const extractScriptContent = code => {
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  return Array.from(code.matchAll(scriptRegex), match => match[1]);
};

const parseFileContent = filePath => {
  const code = readFileContent(filePath);
  return filePath.endsWith(".vue") ? extractScriptContent(code) : [code];
};

const parseAST = script => acorn.parse(script, {
  ecmaVersion: "latest",
  sourceType: "module"
});

const resolveModulePath = (sourceValue, projectRoot, filePath) => {
  if (sourceValue.startsWith("@/")) {
    return path.resolve(projectRoot, "src", sourceValue.slice(2));
  } else if (sourceValue.startsWith(".") || sourceValue.startsWith("/")) {
    return path.resolve(path.dirname(filePath), sourceValue);
  }
  return null;
};

const collectImportsAndDeclarations = (ast, projectRoot, filePath) => {
  const importedModules = new Map();
  const userDefinedFunctions = new Map();
  const userDefinedObjects = new Set();

  estraverse.traverse(ast, {
    enter(node) {
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
      } else if (node.type === "VariableDeclarator" && node.init && 
                 node.init.type === "CallExpression" && node.init.callee.name === "require") {
        const resolvedPath = resolveModulePath(node.init.arguments[0].value, projectRoot, filePath);
        if (resolvedPath) {
          importedModules.set(path.basename(node.init.arguments[0].value), resolvedPath);
          userDefinedObjects.add(node.id.name);
        } else {
          importedModules.set(node.init.arguments[0].value, null);
        }
      } else if (node.type === "FunctionDeclaration" && node.id) {
        userDefinedFunctions.set(node.id.name, filePath);
      } else if (node.type === "VariableDeclarator" && node.init && 
                 node.init.type === "ArrowFunctionExpression") {
        userDefinedFunctions.set(node.id.name, filePath);
      } else if (node.type === "VariableDeclarator" && node.init && 
                 node.init.type === "ObjectExpression") {
        userDefinedObjects.add(node.id.name);
      }
    }
  });

  return { importedModules, userDefinedFunctions, userDefinedObjects };
};

const analyzeFunctionCalls = (ast, targetFunctionName, context, projectRoot, filePath) => {
  const functionCalls = { system: [], userDefined: [], npm: [], other: [] };

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
      if ((node.type === "VariableDeclarator" && node.id.name === targetFunctionName && 
           node.init && node.init.type === "ArrowFunctionExpression") || 
          (node.type === "FunctionDeclaration" && node.id && node.id.name === targetFunctionName)) {
        const functionBody = node.init ? node.init.body : node.body;

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

module.exports = { getAllFunctionCalls };