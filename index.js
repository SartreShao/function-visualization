const fs = require("fs-extra");
const path = require("path");
const acorn = require("acorn");
const { parse } = require("@vue/compiler-sfc");

const directoryPath = "C:/Code/web/easylink.cc"; // 替换为你的项目路径
const ignoreFolders = ["node_modules", "dist"]; // 忽略的文件夹

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
function extractFunctions(fileContent, filePath) {
  let ast;
  try {
    if (filePath.endsWith(".vue")) {
      const { descriptor } = parse(fileContent);
      let scriptContent = '';
      if (descriptor.script) {
        scriptContent = descriptor.script.content;
      } else if (descriptor.scriptSetup) {
        scriptContent = descriptor.scriptSetup.content;
      } else {
        console.warn(`No <script> or <script setup> content found in ${filePath}`);
        return [];
      }
      console.log(`Parsing script content of ${filePath}`);
      ast = acorn.parse(scriptContent, {
        ecmaVersion: 2020,
        sourceType: "module",
      });
    } else {
      ast = acorn.parse(fileContent, {
        ecmaVersion: 2020,
        sourceType: "module",
      });
    }
  } catch (error) {
    console.error(`Error parsing ${filePath}: ${error.message}`);
    return [];
  }

  const functions = [];
  walkAST(ast, (node) => {
    if (node.type === "FunctionDeclaration") {
      const functionName = node.id && node.id.name;
      if (functionName) {
        const relativeFilePath = path.relative(directoryPath, filePath).replace(/[\/\\]/g, "_");
        functions.push(`${relativeFilePath}_${functionName}`);
      }
    } else if (
      node.type === "VariableDeclarator" &&
      node.init &&
      (node.init.type === "FunctionExpression" ||
        node.init.type === "ArrowFunctionExpression")
    ) {
      const functionName = node.id && node.id.name;
      if (functionName) {
        const relativeFilePath = path.relative(directoryPath, filePath).replace(/[\/\\]/g, "_");
        functions.push(`${relativeFilePath}_${functionName}`);
      }
    }
  });

  return functions;
}

// 遍历 AST
function walkAST(node, callback) {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (let key in node) {
    if (node[key] && typeof node[key] === "object") {
      walkAST(node[key], callback);
    }
  }
}

// 主函数
async function main() {
  const files = await readDirectory(directoryPath);
  const allFunctions = [];

  for (let file of files) {
    const content = await fs.readFile(file, "utf-8");
    const functions = extractFunctions(content, file);
    allFunctions.push(...functions);
  }

  console.log("用户定义的函数:");
  console.log(allFunctions);
}

main().catch(console.error);
