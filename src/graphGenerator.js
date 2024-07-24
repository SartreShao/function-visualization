function sanitizeNodeName(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

function generateMermaidGraph(functions, calls) {
  const lines = ["graph TD"];

  for (const caller in calls) {
    calls[caller].forEach(callee => {
      const sanitizedCaller = sanitizeNodeName(caller);
      const sanitizedCallee = sanitizeNodeName(functions[callee] || callee);
      lines.push(`    ${sanitizedCaller} --> ${sanitizedCallee}`);
    });
  }

  return lines.join("\n");
}

module.exports = {
  generateMermaidGraph
};
