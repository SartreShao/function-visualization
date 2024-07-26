const fs = require("fs");
const path = require("path");

/**
 * 从 result.json 读取数据并生成 Mermaid 图表描述
 * @param {string} jsonFilePath - result.json 文件路径
 * @returns {string} - Mermaid 图表描述
 */
function generateMermaidDiagramFromJson(jsonFilePath) {
  try {
    const content = fs.readFileSync(jsonFilePath, "utf-8");
    const data = JSON.parse(content);
    const lines = ["graph TD"];
    const edgeSet = new Set();

    Object.keys(data).forEach(filePath => {
      data[filePath].forEach(func => {
        const from = func.functionId;
        func.calls.userDefined.forEach(call => {
          const to = call.id;
          const edge = `  ${from} --> ${to}`;
          if (!edgeSet.has(edge)) {
            edgeSet.add(edge);
            lines.push(edge);
          }
        });
      });
    });

    return lines.join("\n");
  } catch (error) {
    console.error(`Failed to read or parse file: ${jsonFilePath}`, error);
    return "";
  }
}

// 示例使用
const jsonFilePath = path.join(__dirname, "result.json");
const mermaidDiagram = generateMermaidDiagramFromJson(jsonFilePath);

// 将生成的 Mermaid 图表描述写入 diagram.mmd 文件
const outputFilePath = path.join(__dirname, "diagram.mmd");
fs.writeFileSync(outputFilePath, mermaidDiagram, "utf-8");
console.log(`Mermaid diagram has been written to ${outputFilePath}`);

// 导出函数（如果需要在其他模块中使用）
module.exports = {
  generateMermaidDiagramFromJson
};
