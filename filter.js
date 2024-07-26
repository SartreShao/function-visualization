const fs = require("fs");
const path = require("path");

/**
 * 递归查找调用链中的子节点
 * @param {Object} result - 函数调用结果对象
 * @param {string} functionName - 函数名
 * @param {Set<string>} visited - 已访问的函数集合
 * @param {string} filePath - 文件路径
 * @returns {Array} - 调用链数组
 */
function findCallChain(result, functionName, visited, filePath) {
  const callChain = [];
  for (const [currentFilePath, functions] of Object.entries(result)) {
    for (const func of functions) {
      if (
        func.functionName.toLowerCase() === functionName.toLowerCase() &&
        !visited.has(func.functionId)
      ) {
        visited.add(func.functionId);
        func.filePath = currentFilePath;
        callChain.push(func);
        const userDefinedCalls = func.calls.userDefined;
        for (const call of userDefinedCalls) {
          callChain.push(
            ...findCallChain(result, call.name, visited, currentFilePath)
          );
        }
      }
    }
  }
  return callChain;
}

/**
 * 递归查找调用链中的父节点
 * @param {Object} result - 函数调用结果对象
 * @param {string} functionName - 函数名
 * @param {Set<string>} visited - 已访问的函数集合
 * @returns {Array} - 调用链数组
 */
function findParentCallChain(result, functionName, visited) {
  const callChain = [];
  for (const [currentFilePath, functions] of Object.entries(result)) {
    for (const func of functions) {
      if (!visited.has(func.functionId)) {
        const userDefinedCalls = func.calls.userDefined;
        for (const call of userDefinedCalls) {
          if (call.name.toLowerCase() === functionName.toLowerCase()) {
            visited.add(func.functionId);
            func.filePath = currentFilePath;
            callChain.push(func);
            callChain.push(
              ...findParentCallChain(result, func.functionName, visited)
            );
          }
        }
      }
    }
  }
  return callChain;
}

/**
 * 筛选函数调用链
 * @param {Object} result - 函数调用结果对象
 * @param {string} filterText - 筛选文本
 * @returns {Object} - 筛选后的结果对象
 */
function filter(result, filterText) {
  const filteredResult = {};
  const visited = new Set();

  // 查找子节点调用链
  for (const [filePath, functions] of Object.entries(result)) {
    for (const func of functions) {
      if (func.functionName.toLowerCase().includes(filterText.toLowerCase())) {
        const callChain = findCallChain(
          result,
          func.functionName,
          visited,
          filePath
        );
        callChain.forEach(chainFunc => {
          if (!filteredResult[chainFunc.filePath]) {
            filteredResult[chainFunc.filePath] = [];
          }
          filteredResult[chainFunc.filePath].push(chainFunc);
        });
      }
    }
  }

  // 查找父节点调用链
  for (const [filePath, functions] of Object.entries(result)) {
    for (const func of functions) {
      if (func.functionName.toLowerCase().includes(filterText.toLowerCase())) {
        const parentCallChain = findParentCallChain(
          result,
          func.functionName,
          visited
        );
        parentCallChain.forEach(chainFunc => {
          if (!filteredResult[chainFunc.filePath]) {
            filteredResult[chainFunc.filePath] = [];
          }
          filteredResult[chainFunc.filePath].push(chainFunc);
        });
      }
    }
  }

  return filteredResult;
}

/**
 * 生成格式化名称
 * @param {string} filePath - 文件路径
 * @param {string} functionName - 函数名
 * @param {string} directoryPath - 项目根路径
 * @returns {string} - 格式化名称
 */
function formatName(filePath, functionName, directoryPath) {
  const relativePath = path.relative(directoryPath, filePath);
  const formattedPath = relativePath.replace(/\\/g, "_").replace(/\//g, "_");
  return `${formattedPath}_${functionName}`;
}

/**
 * 生成 Mermaid 图表描述
 * @param {Object} filteredResult - 筛选后的结果对象
 * @param {string} directoryPath - 项目根路径
 * @returns {string} - Mermaid 图表描述
 */
function generateMermaidDiagram(filteredResult, directoryPath) {
  const lines = ["graph TD"];

  for (const [filePath, functions] of Object.entries(filteredResult)) {
    for (const func of functions) {
      const { functionName, calls } = func;
      const formattedFunctionName = formatName(
        filePath,
        functionName,
        directoryPath
      );

      calls.userDefined.forEach(call => {
        const formattedCallName = formatName(
          call.path,
          call.name,
          directoryPath
        );
        lines.push(`  ${formattedFunctionName} --> ${formattedCallName}`);
      });
    }
  }

  return lines.join("\n");
}

// 示例使用
const result = JSON.parse(fs.readFileSync("result.json", "utf-8"));
const filterText = "createEasyFile"; // 替换为你的筛选文本
const directoryPath = "C:/Code/web/easylink.cc"; // 替换为你的项目路径

const filteredResult = filter(result, filterText);

// 将筛选结果写入 filterResult.json 文件
fs.writeFileSync(
  "filterResult.json",
  JSON.stringify(filteredResult, null, 2),
  "utf-8"
);
console.log("筛选结果已写入到 filterResult.json");

// 生成 Mermaid 图表并写入 filterDiagram.mmd 文件
const mermaidDiagram = generateMermaidDiagram(filteredResult, directoryPath);
fs.writeFileSync("filterDiagram.mmd", mermaidDiagram, "utf-8");
console.log("Mermaid 图表已写入到 filterDiagram.mmd");

// 导出函数
module.exports = { filter, generateMermaidDiagram };
