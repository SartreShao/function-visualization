const path = require("path");
const { getJsFiles } = require("./fileUtils");
const { parseJsFile, extractFunctionsAndCalls } = require("./parser");
const { generateMermaidGraph } = require("./graphGenerator");

function main(rootDir) {
  const jsFiles = getJsFiles(rootDir);
  const allFunctions = {};
  const allCalls = {};

  jsFiles.forEach(jsFile => {
    console.log(`Parsing ${jsFile}...`);
    const parsedJs = parseJsFile(jsFile);
    if (!parsedJs) return;

    const { functions, calls } = extractFunctionsAndCalls(parsedJs, jsFile);
    Object.assign(allFunctions, functions);
    Object.assign(allCalls, calls);
  });

  if (
    Object.keys(allFunctions).length === 0 &&
    Object.keys(allCalls).length === 0
  ) {
    console.log("No functions or calls extracted.");
    return "graph TD\n    NoData[No data available]";
  }

  const mermaidGraph = generateMermaidGraph(allFunctions, allCalls);
  console.log(mermaidGraph);
}

// 将项目路径替换为你的实际路径
const projectRootDir = "C:/Code/web/easylink.cc";
main(projectRootDir);
