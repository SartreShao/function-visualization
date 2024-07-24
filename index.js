const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { getAllDefinedFunctions } = require("./functionDefinitions");
const { getAllFunctionCalls } = require("./functionCalls");

// 用于存储函数的哈希映射
const functionHashMap = new Map();

/**
 * 获取模块路径和函数名
 * @param {string} name - 函数名
 * @param {string} filePath - 文件路径
 * @param {string} directoryPath - 项目根路径
 * @returns {{name: string, filePath: string}} - 模块路径和函数名
 */
function resolveModulePath(name, filePath, directoryPath) {
  // 检查函数名是否包含模块名称
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
}

/**
 * 获取函数的唯一 ID，如果不存在则生成并存储
 * @param {string} name - 函数名
 * @param {string} filePath - 文件路径
 * @param {string} directoryPath - 项目根路径
 * @returns {string} - 函数的唯一 ID
 */
function getFunctionId(name, filePath, directoryPath) {
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
}

/**
 * 主函数，获取并打印指定文件夹中每个文件定义的函数的函数调用
 * @param {string} directoryPath - 项目的路径
 * @param {Array<string>} ignoreFolders - 忽略的文件夹
 */
async function main(directoryPath, ignoreFolders = []) {
  try {
    // 获取所有定义的函数
    const allFunctions = await getAllDefinedFunctions(
      directoryPath,
      ignoreFolders
    );

    // 用于存储最终结果的对象
    const result = {};

    // 遍历每个文件中的函数定义，获取并存储函数调用
    for (const func of allFunctions) {
      const { name, path: filePath } = func;
      const functionCalls = getAllFunctionCalls(filePath, name);

      // 获取或生成函数的唯一 ID
      const functionId = getFunctionId(name, filePath, directoryPath);

      // 将结果存储到 result 对象中
      if (!result[filePath]) {
        result[filePath] = [];
      }
      result[filePath].push({
        functionName: name,
        functionId: functionId,
        calls: {
          system: functionCalls.system,
          userDefined: functionCalls.userDefined.map(call => ({
            ...call,
            id: getFunctionId(call.name, call.path, directoryPath)
          })),
          npm: functionCalls.npm,
          other: functionCalls.other
        }
      });
    }

    // 将最终的 JSON 结果写入文件
    const outputPath = path.join(__dirname, "result.json");
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`结果已写入到 ${outputPath}`);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// 示例使用
const directoryPath = "C:/Code/web/easylink.cc"; // 替换为你的项目路径
const ignoreFolders = ["node_modules", "dist"]; // 忽略的文件夹

main(directoryPath, ignoreFolders);
