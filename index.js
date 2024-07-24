const fs = require("fs");
const path = require("path");
const { getAllDefinedFunctions } = require("./functionDefinitions");
const { getAllFunctionCalls } = require("./functionCalls");

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

      // 将结果存储到 result 对象中
      if (!result[filePath]) {
        result[filePath] = [];
      }
      result[filePath].push({
        functionName: name,
        calls: functionCalls
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
