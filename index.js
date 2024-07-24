const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const walk = require('acorn-walk');
const glob = require('glob');

// 配置项
const projectDir = 'C:\\Code\\web\\easylink.cc'; // 你的项目目录
const ignorePattern = /node_modules|dist/; // 忽略的文件夹正则表达式

// 存储函数调用关系
let functions = {};
let calls = [];

// 移除文件名中的 .js 后缀
function removeJsExtension(filename) {
    return filename.replace(/\.js$/, '');
}

// 遍历项目文件夹，读取所有 JavaScript 文件
function traverseDirectory(dir) {
    const files = glob.sync(`${dir}/**/*.js`, { ignore: `${dir}/**/node_modules/**` });

    console.log(`Found ${files.length} JavaScript files`);

    files.forEach(file => {
        if (!ignorePattern.test(file)) {
            parseFile(file);
        }
    });
}

// 解析 JavaScript 文件
function parseFile(file) {
    const content = fs.readFileSync(file, 'utf-8');
    const ast = acorn.parse(content, { ecmaVersion: 'latest', sourceType: 'module' });

    let currentFile = path.relative(projectDir, file).replace(/\\/g, '/');
    currentFile = removeJsExtension(currentFile);
    console.log(`Parsing file: ${currentFile}`);

    walk.ancestor(ast, {
        FunctionDeclaration(node) {
            const functionName = node.id.name;
            const fullFunctionName = `${currentFile}_${functionName}`.replace(/\//g, '_');
            functions[fullFunctionName] = true;
            console.log(`Found function declaration: ${fullFunctionName}`);
        },
        FunctionExpression(node, state, ancestors) {
            const parent = ancestors[ancestors.length - 2];
            if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
                const functionName = parent.id.name;
                const fullFunctionName = `${currentFile}_${functionName}`.replace(/\//g, '_');
                functions[fullFunctionName] = true;
                console.log(`Found function expression: ${fullFunctionName}`);
            }
        },
        ArrowFunctionExpression(node, state, ancestors) {
            const parent = ancestors[ancestors.length - 2];
            if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
                const functionName = parent.id.name;
                const fullFunctionName = `${currentFile}_${functionName}`.replace(/\//g, '_');
                functions[fullFunctionName] = true;
                console.log(`Found arrow function expression: ${fullFunctionName}`);
            }
        },
        CallExpression(node, state, ancestors) {
            const parentFunction = ancestors.find(ancestor => ancestor.type === 'FunctionDeclaration' || ancestor.type === 'FunctionExpression' || ancestor.type === 'ArrowFunctionExpression');
            if (parentFunction) {
                let parentFunctionName = 'anonymous';
                if (parentFunction.type === 'FunctionDeclaration') {
                    parentFunctionName = parentFunction.id.name;
                } else if (parentFunction.type === 'FunctionExpression' || parentFunction.type === 'ArrowFunctionExpression') {
                    const grandParent = ancestors[ancestors.indexOf(parentFunction) - 1];
                    if (grandParent && grandParent.type === 'VariableDeclarator' && grandParent.id.type === 'Identifier') {
                        parentFunctionName = grandParent.id.name;
                    }
                }
                const fullParentFunctionName = `${currentFile}_${parentFunctionName}`.replace(/\//g, '_');

                if (node.callee.type === 'Identifier') {
                    const functionName = node.callee.name;
                    const fullFunctionName = `${currentFile}_${functionName}`.replace(/\//g, '_');
                    calls.push({ from: fullParentFunctionName, to: fullFunctionName });
                    console.log(`Found function call: ${fullParentFunctionName} --> ${fullFunctionName}`);
                }
            }
        }
    });
}

// 生成 Mermaid 图
function generateMermaid() {
    let mermaid = 'graph TB\n'; // 使用 TB（Top to Bottom）生成纵向图

    const subgraphs = {};

    calls.forEach(call => {
        const fromFile = call.from.split('_')[0];
        const toFile = call.to.split('_')[0];

        if (!subgraphs[fromFile]) subgraphs[fromFile] = [];
        if (!subgraphs[toFile]) subgraphs[toFile] = [];

        subgraphs[fromFile].push(call);
        subgraphs[toFile].push(call);
    });

    Object.keys(subgraphs).forEach(file => {
        mermaid += `  subgraph ${file}\n`;
        const uniqueCalls = new Set(subgraphs[file].map(call => `${call.from} --> ${call.to}`));
        uniqueCalls.forEach(call => {
            mermaid += `    ${call}\n`;
        });
        mermaid += '  end\n';
    });

    return mermaid;
}

// 主函数
function main() {
    traverseDirectory(projectDir);
    const mermaidGraph = generateMermaid();
    console.log(mermaidGraph);
}

main();
