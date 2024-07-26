const fs = require("fs");
const path = require("path");

/**
 * 解析 Mermaid 图表文件
 * @param {string} filePath - 文件路径
 * @returns {Array} - 函数调用关系数组
 */
function parseMermaidDiagram(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    console.log("File content read successfully.");
    const lines = content.split("\n").map(line => line.trim());
    console.log(`Total lines: ${lines.length}`);
    const edges = lines
      .filter(line => line.includes(" --> "))
      .map(line => {
        const [from, to] = line.split(" --> ");
        return { from, to };
      });
    console.log(`Parsed edges: ${edges.length}`);
    return edges;
  } catch (error) {
    console.error(`Failed to read or parse file: ${filePath}`, error);
    return [];
  }
}

/**
 * 查找函数的所有子函数
 * @param {Array} edges - 函数调用关系数组
 * @param {string} functionName - 函数名
 * @param {Set<string>} visited - 已访问的函数集合
 * @returns {Array} - 子函数数组
 */
function findChildren(edges, functionName, visited) {
  const children = [];
  for (const edge of edges) {
    if (edge.from === functionName && !visited.has(edge.to)) {
      visited.add(edge.to);
      children.push(edge.to);
      console.log(
        `Through function: ${edge.from} found child function: ${edge.to}`
      );
      children.push(...findChildren(edges, edge.to, visited));
    }
  }
  return children;
}

/**
 * 查找函数的所有父函数
 * @param {Array} edges - 函数调用关系数组
 * @param {string} functionName - 函数名
 * @param {Set<string>} visited - 已访问的函数集合
 * @returns {Array} - 父函数数组
 */
function findParents(edges, functionName, visited) {
  const parents = [];
  for (const edge of edges) {
    if (edge.to === functionName && !visited.has(edge.from)) {
      visited.add(edge.from);
      parents.push(edge.from);
      console.log(
        `Through function: ${edge.to} found parent function: ${edge.from}`
      );
      parents.push(...findParents(edges, edge.from, visited));
    }
  }
  return parents;
}

/**
 * 根据筛选文本提取调用链
 * @param {Array} edges - 函数调用关系数组
 * @param {string} filterText - 筛选文本
 * @returns {Array} - 提取的调用链
 */
function extractCallChain(edges, filterText) {
  const visited = new Set();
  const callChain = [];
  const filterRegex = new RegExp(filterText, "i"); // 忽略大小写匹配

  for (const edge of edges) {
    if (filterRegex.test(edge.from) || filterRegex.test(edge.to)) {
      if (!visited.has(edge.from)) {
        visited.add(edge.from);
        callChain.push(edge.from);
        callChain.push(...findChildren(edges, edge.from, visited));
        callChain.push(...findParents(edges, edge.from, visited));
      }
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        callChain.push(edge.to);
        callChain.push(...findChildren(edges, edge.to, visited));
        callChain.push(...findParents(edges, edge.to, visited));
      }
    }
  }

  return [...new Set(callChain)]; // 去重
}

/**
 * 生成新的 Mermaid 图表描述
 * @param {Array} edges - 函数调用关系数组
 * @param {Array} callChain - 提取的调用链
 * @returns {string} - Mermaid 图表描述
 */
function generateMermaidDiagram(edges, callChain) {
  const lines = ["graph TD"];
  for (const edge of edges) {
    if (callChain.includes(edge.from) && callChain.includes(edge.to)) {
      lines.push(`  ${edge.from} --> ${edge.to}`);
    }
  }
  return lines.join("\n");
}

// 示例使用
const diagramFilePath = path.join(__dirname, "diagram-readable.mmd");
const edges = parseMermaidDiagram(diagramFilePath);

if (edges.length === 0) {
  console.error("No edges found in the diagram file.");
  process.exit(1);
}

const filterText = "createEasyFile"; // 替换为你的筛选文本
const callChain = extractCallChain(edges, filterText);

if (callChain.length === 0) {
  console.warn(`No functions matching the filter text "${filterText}" were found.`);
}

const mermaidDiagram = generateMermaidDiagram(edges, callChain);

// 将筛选结果写入 filterDiagram.mmd 文件
const outputFilePath = path.join(__dirname, "filterDiagram.mmd");
fs.writeFileSync(outputFilePath, mermaidDiagram, "utf-8");
console.log(`筛选结果已写入到 ${outputFilePath}`);

// 导出函数（如果需要在其他模块中使用）
module.exports = {
  parseMermaidDiagram,
  extractCallChain,
  generateMermaidDiagram
};
