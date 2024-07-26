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

const resolveModulePath = (name, filePath, directoryPath) => {
  const moduleNameMatch = name.match(/^(\w+)\.(\w+)$/);
  if (moduleNameMatch) {
    const [, moduleName, functionName] = moduleNameMatch;
    const modulePath = path.join(
      directoryPath,
      "src",
      "model",
      `${moduleName.toLowerCase()}.js`
    );
    return { name: functionName, filePath: modulePath };
  }
  return { name, filePath };
};

const getFunctionId = (functionHashMap, name, filePath, directoryPath) => {
  const { name: resolvedName, filePath: resolvedFilePath } = resolveModulePath(
    name,
    filePath,
    directoryPath
  );
  const key = `${resolvedName}@${resolvedFilePath}`;
  if (!functionHashMap.has(key)) {
    functionHashMap.set(key, uuidv4());
  }
  return functionHashMap.get(key);
};

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

  const processFunction = func => {
    const { name, path: filePath } = func;
    const functionCalls = getAllFunctionCalls(directoryPath, filePath, name);
    const functionId = getFunctionId(
      functionHashMap,
      name,
      filePath,
      directoryPath
    );

    return {
      filePath,
      functionData: {
        functionName: name,
        functionId: functionId,
        calls: {
          system: functionCalls.system,
          userDefined: functionCalls.userDefined.map(call => ({
            ...call,
            id: getFunctionId(
              functionHashMap,
              call.name,
              call.path,
              directoryPath
            )
          })),
          npm: functionCalls.npm,
          other: functionCalls.other
        }
      }
    };
  };

  const processedFunctions = allFunctions.map(processFunction);

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
  console.log(`结果已写入到 ${outputPath}`);

  return result;
};

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
  console.log(`筛选结果已写入到 ${outputFilePath}`);

  return mermaidDiagram;
};

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
const filterText = "createEasyFile";

// 执行主函数
main(directoryPath, ignoreFolders, filterText);
