const fs = require("fs-extra");
const path = require("path");
const acorn = require("acorn");
const { parse } = require("@vue/compiler-sfc");
const walk = require("acorn-walk");

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

// 提取文件中的函数定义和函数调用
function extractFunctionsAndCalls(fileContent, filePath) {
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
        return { functions: [], calls: [] };
      }
      console.log(`Parsing script content of ${filePath}`);
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
    return { functions: [], calls: [] };
  }

  const functions = [];
  const calls = [];
  walk.simple(ast, {
    FunctionDeclaration(node) {
      const functionName = node.id && node.id.name;
      if (functionName) {
        const relativeFilePath = path
          .relative(directoryPath, filePath)
          .replace(/[\/\\]/g, "_");
        functions.push(`${relativeFilePath}.${functionName}`);
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
          const relativeFilePath = path
            .relative(directoryPath, filePath)
            .replace(/[\/\\]/g, "_");
          functions.push(`${relativeFilePath}.${functionName}`);
        }
      }
    },
    CallExpression(node) {
      if (node.callee.type === "Identifier") {
        calls.push(node.callee.name);
      } else if (
        node.callee.type === "MemberExpression" &&
        node.callee.property.type === "Identifier"
      ) {
        calls.push(node.callee.property.name);
      }
    }
  });

  return { functions, calls };
}

// 主函数
async function main() {
  const files = await readDirectory(directoryPath);
  const allFunctions = [];
  const functionCalls = {};

  for (let file of files) {
    const content = await fs.readFile(file, "utf-8");
    const { functions, calls } = extractFunctionsAndCalls(content, file);
    allFunctions.push(...functions);
    functions.forEach(fn => {
      functionCalls[fn] = calls;
    });
  }

  // 过滤出用户自定义的函数调用
  const userDefinedFunctions = new Set(allFunctions);
  const result = {};
  for (const fn in functionCalls) {
    result[fn] = functionCalls[fn].filter(call => {
      return Array.from(userDefinedFunctions).some(userFn =>
        userFn.endsWith(`.${call}`)
      );
    });
  }

  console.log("用户定义的函数调用关系:");
  console.log(result);
}

main().catch(console.error);
