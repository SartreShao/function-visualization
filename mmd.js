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

/**
 * 根据 diagram-id.mmd 和 result.json 生成 diagram-readable.mmd
 * @param {string} idDiagramPath - diagram-id.mmd 文件路径
 * @param {string} jsonFilePath - result.json 文件路径
 * @param {string} directoryPath - 要去除的公共路径
 */
function generateReadableDiagram(idDiagramPath, jsonFilePath, directoryPath) {
  try {
    const idDiagramContent = fs.readFileSync(idDiagramPath, "utf-8");
    const jsonContent = fs.readFileSync(jsonFilePath, "utf-8");
    const data = JSON.parse(jsonContent);
    const lines = idDiagramContent.split("\n");
    const readableLines = ["graph TD"];

    const idToReadableMap = {};

    // 构建 ID 到 Readable 名称的映射
    Object.keys(data).forEach(filePath => {
      const relativeFilePath = path
        .relative(directoryPath, filePath)
        .replace(/\\/g, "_");
      data[filePath].forEach(func => {
        const id = func.functionId;
        const readableName = `${relativeFilePath}_${func.functionName}`;
        idToReadableMap[id] = readableName;
        func.calls.userDefined.forEach(call => {
          const callId = call.id;
          const callRelativePath = path
            .relative(directoryPath, call.path)
            .replace(/\\/g, "_");
          const callReadableName = `${callRelativePath}_${call.name}`;
          idToReadableMap[callId] = callReadableName;
        });
      });
    });

    // 根据映射生成可读的图表描述
    lines.slice(1).forEach(line => {
      // 跳过第一行
      if (line.startsWith("  ")) {
        const [fromId, toId] = line.trim().split(" --> ");
        const fromReadable = idToReadableMap[fromId] || fromId;
        const toReadable = idToReadableMap[toId] || toId;
        readableLines.push(`  ${fromReadable} --> ${toReadable}`);
      }
    });

    return readableLines.join("\n");
  } catch (error) {
    console.error(
      `Failed to read or parse file: ${idDiagramPath} or ${jsonFilePath}`,
      error
    );
    return "";
  }
}

// 示例使用
const jsonFilePath = path.join(__dirname, "result.json");
const directoryPath = "C:/Code/web/easylink.cc"; // 公共路径
const idDiagram = generateMermaidDiagramFromJson(jsonFilePath);

// 将生成的 Mermaid 图表描述写入 diagram-id.mmd 文件
const outputFilePathId = path.join(__dirname, "diagram-id.mmd");
fs.writeFileSync(outputFilePathId, idDiagram, "utf-8");
console.log(`Mermaid ID diagram has been written to ${outputFilePathId}`);

// 生成 diagram-readable.mmd
const readableDiagram = generateReadableDiagram(
  outputFilePathId,
  jsonFilePath,
  directoryPath
);
const outputFilePathReadable = path.join(__dirname, "diagram-readable.mmd");
fs.writeFileSync(outputFilePathReadable, readableDiagram, "utf-8");
console.log(
  `Mermaid readable diagram has been written to ${outputFilePathReadable}`
);

// 导出函数（如果需要在其他模块中使用）
module.exports = {
  generateMermaidDiagramFromJson,
  generateReadableDiagram
};
