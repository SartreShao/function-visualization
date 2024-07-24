const fs = require("fs-extra");
const path = require("path");
const acorn = require("acorn");
const { parse } = require("@vue/compiler-sfc");
const walk = require("acorn-walk");

/**
 * 读取指定文件夹中的所有 .js 和 .vue 文件中的函数定义
 * @param {string} directoryPath - 项目的路径
 * @param {Array<string>} ignoreFolders - 忽略的文件夹
 * @return {Promise<Array<{name: string, path: string}>>} - 返回所有函数定义的数组
 */
async function getAllDefinedFunctions(directoryPath, ignoreFolders = []) {
  // 读取目录中的所有文件
  async function readDirectory(dir) {
    let files = await fs.readdir(dir);
    let allFiles = [];
    for (let file of files) {
      let filePath = path.join(dir, file);
      let stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        if (!ignoreFolders.includes(file)) {
          allFiles = allFiles.concat(await readDirectory(filePath));
        }
      } else if (file.endsWith(".js") || file.endsWith(".vue")) {
        allFiles.push(filePath);
      }
    }
    return allFiles;
  }

  // 提取文件中的函数定义
  function getAllDefinedFunctionsFromFile(fileContent, filePath) {
    let ast;
    try {
      if (filePath.endsWith(".vue")) {
        const { descriptor } = parse(fileContent);
        let scriptContent = "";
        if (descriptor.script) {
          scriptContent = descriptor.script.content;
        } else if (descriptor.scriptSetup) {
          scriptContent = descriptor.scriptSetup.content;
        } else {
          console.warn(
            `No <script> or <script setup> content found in ${filePath}`
          );
          return [];
        }
        ast = acorn.parse(scriptContent, {
          ecmaVersion: 2020,
          sourceType: "module"
        });
      } else {
        ast = acorn.parse(fileContent, {
          ecmaVersion: 2020,
          sourceType: "module"
        });
      }
    } catch (error) {
      console.error(`Error parsing ${filePath}: ${error.message}`);
      return [];
    }

    const functions = [];
    walk.simple(ast, {
      FunctionDeclaration(node) {
        const functionName = node.id && node.id.name;
        if (functionName) {
          functions.push({ name: functionName, path: filePath });
        }
      },
      VariableDeclarator(node) {
        if (
          node.init &&
          (node.init.type === "FunctionExpression" ||
            node.init.type === "ArrowFunctionExpression")
        ) {
          const functionName = node.id && node.id.name;
          if (functionName) {
            functions.push({ name: functionName, path: filePath });
          }
        }
      }
    });

    return functions;
  }

  const files = await readDirectory(directoryPath);
  const allFunctions = [];

  for (let file of files) {
    const content = await fs.readFile(file, "utf-8");
    const functions = getAllDefinedFunctionsFromFile(content, file);
    allFunctions.push(...functions);
  }

  return allFunctions;
}

// 示例使用
const directoryPath = "C:/Code/web/easylink.cc"; // 替换为你的项目路径
const ignoreFolders = ["node_modules", "dist"]; // 忽略的文件夹

getAllDefinedFunctions(directoryPath, ignoreFolders)
  .then(functions => {
    console.log("所有函数定义:");
    console.log(functions);
  })
  .catch(console.error);

module.exports = { getAllDefinedFunctions };
