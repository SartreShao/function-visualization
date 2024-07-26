const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { getAllDefinedFunctions } = require("./functionDefinitions");
const { getAllFunctionCalls } = require("./functionCalls");
const {
  generateMermaidDiagramFromJson,
  generateReadableDiagram
} = require("./mmd");
const {
  parseMermaidDiagram,
  extractCallChain,
  generateMermaidDiagram
} = require("./filterDiagram");

// 常量定义
const ALL_FUNC_CALLS_JSON_FILENAME = "result.json";
const DIAGRAM_ID_FILENAME = "diagram-id.mmd";
const DIAGRAM_READABLE_FILENAME = "diagram-readable.mmd";
const DIAGRAM_FILTER_FILENAME = "diagram-filter.mmd";

/**
 * 解析模块路径和函数名
 * @param {string} name - 函数名
 * @param {string} filePath - 文件路径
 * @returns {{name: string, filePath: string}} - 解析后的模块路径和函数名
 */
const resolveModulePath = (name, filePath) => {
  const moduleNameMatch = name.match(/^(\w+)\.(\w+)$/);
  if (moduleNameMatch) {
    const [, moduleName, functionName] = moduleNameMatch;
    const moduleDir = path.dirname(filePath);
    const modulePath = path.join(moduleDir, `${moduleName.toLowerCase()}.js`);
    return { name: functionName, filePath: modulePath };
  }
  return { name, filePath };
};

/**
 * 获取或生成函数的唯一ID
 * @param {Map} functionHashMap - 存储函数ID的Map
 * @param {string} name - 函数名
 * @param {string} filePath - 文件路径
 * @returns {string} - 函数的唯一ID
 */
const getFunctionId = (functionHashMap, name, filePath) => {
  const { name: resolvedName, filePath: resolvedFilePath } = resolveModulePath(
    name,
    filePath
  );
  const key = `${resolvedName}@${resolvedFilePath}`;
  if (!functionHashMap.has(key)) {
    functionHashMap.set(key, uuidv4());
  }
  return functionHashMap.get(key);
};

/**
 * 生成所有函数调用的JSON文件
 * @param {string} directoryPath - 项目路径
 * @param {string[]} ignoreFolders - 需要忽略的文件夹
 * @param {string} allFuncCallsJsonFileName - 输出JSON文件名
 * @returns {Object} - 生成的JSON对象
 */
const generateAllFuncCallsJson = async (
  directoryPath,
  ignoreFolders,
  allFuncCallsJsonFileName
) => {
  const allFunctions = await getAllDefinedFunctions(
    directoryPath,
    ignoreFolders
  );
  const functionHashMap = new Map();

  const processFunction = async func => {
    const { name, path: filePath } = func;
    const functionCalls = await getAllFunctionCalls(
      directoryPath,
      filePath,
      name
    );
    const functionId = getFunctionId(functionHashMap, name, filePath);

    return {
      filePath,
      functionData: {
        functionName: name,
        functionId: functionId,
        calls: {
          system: functionCalls.system,
          userDefined: functionCalls.userDefined.map(call => ({
            ...call,
            id: getFunctionId(functionHashMap, call.name, call.path)
          })),
          npm: functionCalls.npm,
          other: functionCalls.other
        }
      }
    };
  };

  const processedFunctions = await Promise.all(
    allFunctions.map(processFunction)
  );

  const result = processedFunctions.reduce(
    (acc, { filePath, functionData }) => {
      if (!acc[filePath]) {
        acc[filePath] = [];
      }
      acc[filePath].push(functionData);
      return acc;
    },
    {}
  );

  const outputPath = path.join(__dirname, allFuncCallsJsonFileName);
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`Results have been written to ${outputPath}`);

  return result;
};

/**
 * 生成Mermaid图表
 * @param {string} jsonFilePath - JSON文件路径
 * @param {string} directoryPath - 项目根路径
 * @returns {{idDiagram: string, readableDiagram: string}} - 生成的图表
 */
const generateDiagrams = async (jsonFilePath, directoryPath) => {
  const idDiagram = generateMermaidDiagramFromJson(jsonFilePath);
  const outputFilePathId = path.join(__dirname, DIAGRAM_ID_FILENAME);
  await fs.writeFile(outputFilePathId, idDiagram, "utf-8");
  console.log(`Mermaid ID diagram has been written to ${outputFilePathId}`);

  const readableDiagram = generateReadableDiagram(
    outputFilePathId,
    jsonFilePath,
    directoryPath
  );
  const outputFilePathReadable = path.join(
    __dirname,
    DIAGRAM_READABLE_FILENAME
  );
  await fs.writeFile(outputFilePathReadable, readableDiagram, "utf-8");
  console.log(
    `Mermaid readable diagram has been written to ${outputFilePathReadable}`
  );

  return { idDiagram, readableDiagram };
};

/**
 * 生成过滤后的Mermaid图表
 * @param {string} diagramFilePath - 图表文件路径
 * @param {string} filterText - 过滤文本
 * @returns {string|null} - 生成的过滤后的图表
 */
const generateFilteredDiagram = async (diagramFilePath, filterText) => {
  const edges = parseMermaidDiagram(diagramFilePath);
  if (edges.length === 0) {
    console.error("No edges found in the diagram file.");
    return null;
  }

  const callChain = extractCallChain(edges, filterText);
  if (callChain.length === 0) {
    console.warn(
      `No functions matching the filter text "${filterText}" were found.`
    );
  }

  const mermaidDiagram = generateMermaidDiagram(edges, callChain);
  const outputFilePath = path.join(__dirname, DIAGRAM_FILTER_FILENAME);
  await fs.writeFile(outputFilePath, mermaidDiagram, "utf-8");
  console.log(`Filtered results have been written to ${outputFilePath}`);

  return mermaidDiagram;
};

/**
 * 主函数
 * @param {string} directoryPath - 项目路径
 * @param {string[]} ignoreFolders - 需要忽略的文件夹
 * @param {string} filterText - 过滤文本
 */
const main = async (directoryPath, ignoreFolders, filterText) => {
  try {
    await generateAllFuncCallsJson(
      directoryPath,
      ignoreFolders,
      ALL_FUNC_CALLS_JSON_FILENAME
    );
    const jsonFilePath = path.join(__dirname, ALL_FUNC_CALLS_JSON_FILENAME);
    await generateDiagrams(jsonFilePath, directoryPath);
    const diagramFilePath = path.join(__dirname, DIAGRAM_READABLE_FILENAME);
    await generateFilteredDiagram(diagramFilePath, filterText);
  } catch (error) {
    console.error("Error:", error.message);
  }
};

// 示例使用
const directoryPath = "C:/Code/web/easylink.cc";
const ignoreFolders = ["node_modules", "dist"];
const filterText = "easyfile";

// 执行主函数
main(directoryPath, ignoreFolders, filterText);
