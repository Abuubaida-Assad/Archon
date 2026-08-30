import path from 'path';
import { FileEntry } from './repo-manager';
import { ExtractedSymbol, ExtractedImport, ExtractedCall, ExtractedApiEndpoint, ExtractedDbOperation, ExtractedFileAnalysis } from './js-ts-parser';

export class PythonParser {
  /**
   * Parse Python file extracting imports, functions, classes, decorators, routes, DB models
   */
  public parseFile(file: FileEntry, allFilePaths: string[] = []): ExtractedFileAnalysis {
    const isTestFile = this.detectIsTestFile(file.relativePath);
    const symbols: ExtractedSymbol[] = [];
    const imports: ExtractedImport[] = [];
    const exports: string[] = [];
    const calls: ExtractedCall[] = [];
    const apis: ExtractedApiEndpoint[] = [];
    const dbOperations: ExtractedDbOperation[] = [];

    const lines = file.content.split('\n');
    let currentClass: string | undefined = undefined;

    for (let i = 0; i < lines.length; i++) {
      const lineStr = lines[i];
      const trimmed = lineStr.trim();
      const lineNum = i + 1;

      if (!trimmed || trimmed.startsWith('#')) continue;

      // 1. Imports
      // from module import a, b as c
      const fromImportMatch = trimmed.match(/^from\s+([.\w]+)\s+import\s+(.+)$/);
      if (fromImportMatch) {
        const source = fromImportMatch[1];
        const symbolsStr = fromImportMatch[2];
        const isRelative = source.startsWith('.');
        const importedSymbols = symbolsStr.split(',').map((s) => {
          const parts = s.trim().split(/\s+as\s+/);
          return { name: parts[0].trim(), localName: parts[1]?.trim() || parts[0].trim(), isDefault: false };
        });

        const resolved = isRelative ? resolvePythonRelativeImport(file.relativePath, source, allFilePaths) : undefined;

        imports.push({
          source,
          resolvedPath: resolved,
          isRelative,
          importedSymbols,
          line: lineNum,
        });
        continue;
      }

      // import module
      const importMatch = trimmed.match(/^import\s+([.\w]+)(?:\s+as\s+(\w+))?$/);
      if (importMatch) {
        const source = importMatch[1];
        imports.push({
          source,
          isRelative: false,
          importedSymbols: [{ name: importMatch[2] || source, localName: importMatch[2] || source, isDefault: true }],
          line: lineNum,
        });
        continue;
      }

      // 2. Classes
      const classMatch = trimmed.match(/^class\s+(\w+)(?:\(([^)]*)\))?:/);
      if (classMatch) {
        const className = classMatch[1];
        const baseClasses = classMatch[2] ? classMatch[2].split(',').map((b) => b.trim()) : [];
        currentClass = className;

        const isModel =
          baseClasses.some((b) => b.includes('Model') || b.includes('Base') || b.includes('Schema') || b.includes('Entity')) ||
          className.endsWith('Model') ||
          className.endsWith('Schema');

        const snippet = lines.slice(i, Math.min(lines.length, i + 15)).join('\n');

        symbols.push({
          name: className,
          kind: isModel ? 'db_model' : 'class',
          line: lineNum,
          endLine: Math.min(lines.length, lineNum + 20),
          isExported: true,
          codeSnippet: snippet,
          complexity: 2,
        });
        exports.push(className);
        continue;
      }

      // 3. Decorator Route Detection (FastAPI / Flask)
      if (trimmed.startsWith('@')) {
        const routeMatch = trimmed.match(/@(?:app|router|api)\.(get|post|put|delete|patch|route)\s*\(\s*['"]([^'"]+)['"]/i);
        if (routeMatch) {
          const method = routeMatch[1].toUpperCase() === 'ROUTE' ? 'GET' : (routeMatch[1].toUpperCase() as any);
          const pathStr = routeMatch[2];

          // Check next non-decorator line for function name
          for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
            const nextTrimmed = lines[j].trim();
            const fnDefMatch = nextTrimmed.match(/(?:async\s+)?def\s+(\w+)/);
            if (fnDefMatch) {
              apis.push({
                method,
                path: pathStr,
                handlerSymbolName: fnDefMatch[1],
                line: lineNum,
                framework: 'fastapi',
                snippet: `${trimmed}\n${nextTrimmed}`,
              });
              break;
            }
          }
        }
      }

      // 4. Function / Method definitions
      const defMatch = lineStr.match(/^(\s*)(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\):/);
      if (defMatch) {
        const indent = defMatch[1].length;
        const fnName = defMatch[2];
        const isMethod = indent > 0 && currentClass;
        const fullName = isMethod ? `${currentClass}.${fnName}` : fnName;

        const isExported = !fnName.startsWith('_');
        const snippet = lines.slice(i, Math.min(lines.length, i + 15)).join('\n');

        symbols.push({
          name: fullName,
          kind: isTestFile || fnName.startsWith('test_') ? 'test' : isMethod ? 'method' : 'function',
          line: lineNum,
          endLine: Math.min(lines.length, lineNum + 15),
          isExported,
          parentSymbol: isMethod ? currentClass : undefined,
          codeSnippet: snippet,
          complexity: 2,
        });

        if (isExported && !isMethod) {
          exports.push(fnName);
        }
        continue;
      }

      // 5. Database calls
      if (trimmed.includes('session.query') || trimmed.includes('.objects.filter') || trimmed.includes('.objects.get') || trimmed.includes('.objects.create')) {
        const target = trimmed.match(/(?:query|filter|get|create)\s*\(\s*(\w+)/);
        const model = target ? target[1] : 'database';
        dbOperations.push({
          operation: trimmed.includes('create') ? 'INSERT' : 'SELECT',
          targetTableOrModel: model,
          orm: 'sql',
          line: lineNum,
          snippet: trimmed,
        });
      }

      // 6. Function calls (heuristic)
      const callMatch = trimmed.match(/(\w+)\s*\(/);
      if (callMatch && !['if', 'for', 'while', 'def', 'class', 'with', 'print', 'len', 'range', 'int', 'str'].includes(callMatch[1])) {
        calls.push({
          calleeName: callMatch[1],
          line: lineNum,
          snippet: trimmed,
        });
      }
    }

    return {
      file,
      symbols,
      imports,
      exports,
      calls,
      apis,
      dbOperations,
      events: [],
      isTestFile,
    };
  }

  private detectIsTestFile(relPath: string): boolean {
    const lower = relPath.toLowerCase();
    return (
      lower.includes('test_') ||
      lower.includes('_test.py') ||
      lower.includes('/tests/') ||
      lower.includes('/test/')
    );
  }
}

function resolvePythonRelativeImport(currentFilePath: string, importSource: string, allFilePaths: string[]): string | undefined {
  const currentDir = path.dirname(currentFilePath);
  const normalized = path.normalize(path.join(currentDir, importSource.replace(/\./g, '/'))).replace(/\\/g, '/');

  const candidates = [normalized + '.py', path.join(normalized, '__init__.py').replace(/\\/g, '/')];
  for (const c of candidates) {
    if (allFilePaths.includes(c)) return c;
  }
  return undefined;
}

export const defaultPythonParser = new PythonParser();
