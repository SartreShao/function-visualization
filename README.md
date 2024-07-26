# Function Call Analyzer

This project is designed to analyze function calls within a JavaScript project and generate visual diagrams of the function call hierarchy using Mermaid.js.

**Note: Currently, this tool only supports .js and .vue files

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

   // Please replace with the project directory you need to analyze
  const directoryPath = "C:/Code/server/easylink.server";

  // Please replace with the folders in the project directory that need to be ignored 
  // this is important, otherwise the function relationship graph will include functions from folders like node_modules
  // even if the calculation won't crash your computer, the resulting diagram will be difficult for humans to view
  const ignoreFolders = ["node_modules", "dist", "public"];

  // Please replace with the name of the function you need to analyze
  // case insensitive, it doesn't even need to be the complete function name, just a part of the function name
  const filterText = "easyfile";


2. Run the script:

   npm start

3. The results will be generated in the following files:
   - `diagram-all-function.mmd`: A call graph of all user-defined functions in the specified folder.
   - `diagram-filter-function.mmd`: A call graph of functions related to the filter word in the specified folder.

4. Process files generated by the program can be ignored:
   - `result.json`: JSON file containing all function calls.
   - `diagram-id.mmd`: Mermaid diagram with function IDs.


## License

This project is licensed under the MIT License.
