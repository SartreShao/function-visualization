# Function Call Analyzer

This project is designed to analyze function calls within a JavaScript project and generate visual diagrams of the function call hierarchy using Mermaid.js.

## Features

- Extracts all defined functions from the project.
- Analyzes function calls within the project.
- Generates JSON files containing function call data.
- Creates visual diagrams using Mermaid.js.
- Filters diagrams based on specified criteria.

## Installation

1. Clone the repository:

   git clone https://github.com/yourusername/function-call-analyzer.git
   cd function-call-analyzer

2. Install dependencies:

   npm install

## Usage

1. Update the `main` function parameters in `index.js`:

   const directoryPath = "C:/Code/server/easylink.server";
   const ignoreFolders = ["node_modules", "dist", "public"];
   const filterText = "easyfile";

2. Run the script:

   node index.js

3. The results will be generated in the following files:
   - `result.json`: JSON file containing all function calls.
   - `diagram-id.mmd`: Mermaid diagram with function IDs.
   - `diagram-readable.mmd`: Readable Mermaid diagram.
   - `diagram-filter.mmd`: Filtered Mermaid diagram based on the specified filter text.

## License

This project is licensed under the MIT License.
