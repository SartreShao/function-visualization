const fs = require('fs');
const acorn = require('acorn');
const walk = require('acorn-walk');

function parseJsFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return acorn.parse(content, { sourceType: 'module', ecmaVersion: 'latest' });
    } catch (e) {
        console.error(`Error parsing ${filePath}: ${e.message}`);
        return null;
    }
}

function extractFunctionsAndCalls(parsedJs, filePath) {
    const functions = {};
    const calls = {};
    const fileKey = filePath.replace(/[\/\\]/g, '_');

    walk.simple(parsedJs, {
        FunctionDeclaration(node) {
            const funcName = node.id.name;
            const fullFuncName = `${fileKey}_${funcName}`;
            functions[funcName] = fullFuncName;
        },
        CallExpression(node) {
            if (node.callee.type === 'Identifier') {
                const caller = fileKey;
                const callee = node.callee.name;
                if (!calls[caller]) {
                    calls[caller] = new Set();
                }
                calls[caller].add(callee);
            }
        }
    });

    // Convert sets to arrays
    for (const caller in calls) {
        calls[caller] = Array.from(calls[caller]);
    }

    return { functions, calls };
}

module.exports = {
    parseJsFile,
    extractFunctionsAndCalls
};
