import { parse as babelParse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import path from 'path';
import { FileEntry } from './repo-manager';

export interface ExtractedSymbol {
  name: string;
  kind: 'function' | 'method' | 'class' | 'interface' | 'type' | 'variable' | 'api' | 'db_model' | 'test';
  line: number;
  endLine: number;
  isExported: boolean;
  codeSnippet: string;
  docstring?: string;
  parentSymbol?: string;
  parameters?: string[];
  complexity?: number;
}

export interface ExtractedImport {
  source: string; // e.g. './paymentService' or 'express'
  resolvedPath?: string; // e.g. 'src/services/paymentService.ts'
  isRelative: boolean;
  importedSymbols: Array<{ name: string; localName: string; isDefault: boolean }>;
  line: number;
}

export interface ExtractedCall {
  calleeName: string; // e.g. 'validatePayment' or 'db.query'
  callerSymbolName?: string; // enclosing function/method
  line: number;
  snippet: string;
}

export interface ExtractedApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL' | 'GRAPHQL';
  path: string;
  handlerSymbolName?: string;
  line: number;
  framework: 'express' | 'nextjs' | 'fastify' | 'nestjs' | 'fastapi' | 'flask' | 'django' | 'custom';
  snippet: string;
}

export interface ExtractedDbOperation {
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'RAW' | 'MODEL_DEF';
  targetTableOrModel: string;
  orm?: 'prisma' | 'typeorm' | 'mongoose' | 'drizzle' | 'sql' | 'redis';
  line: number;
  snippet: string;
  callerSymbolName?: string;
}

export interface ExtractedEventOperation {
  type: 'publish' | 'subscribe';
  eventName: string;
  line: number;
  snippet: string;
}

export interface ExtractedFileAnalysis {
  file: FileEntry;
  symbols: ExtractedSymbol[];
  imports: ExtractedImport[];
  exports: string[];
  calls: ExtractedCall[];
  apis: ExtractedApiEndpoint[];
  dbOperations: ExtractedDbOperation[];
  events: ExtractedEventOperation[];
  isTestFile: boolean;
}

export class JsTsParser {
  /**
   * Parse a single JS/TS file and extract symbols, calls, APIs, DB operations
   */
  public parseFile(file: FileEntry, allFilePaths: string[] = []): ExtractedFileAnalysis {
    const isTestFile = this.detectIsTestFile(file.relativePath);
    const symbols: ExtractedSymbol[] = [];
    const imports: ExtractedImport[] = [];
    const exports: string[] = [];
    const calls: ExtractedCall[] = [];
    const apis: ExtractedApiEndpoint[] = [];
    const dbOperations: ExtractedDbOperation[] = [];
    const events: ExtractedEventOperation[] = [];

    const lines = file.content.split('\n');

    let ast: any;
    try {
      ast = babelParse(file.content, {
        sourceType: 'unambiguous',
        plugins: [
          'typescript',
          'jsx',
          ['decorators', { decoratorsBeforeExport: true }],
          'classProperties',
          'classPrivateProperties',
          'classPrivateMethods',
          'asyncGenerators',
          'dynamicImport',
          'exportDefaultFrom',
          'exportNamespaceFrom',
          'nullishCoalescingOperator',
          'optionalChaining',
          'topLevelAwait',
        ],
        errorRecovery: true,
      });
    } catch (parseErr) {
      // Fallback regex extraction if babel parse completely fails on malformed file
      return this.fallbackRegexExtraction(file, allFilePaths, isTestFile);
    }

    // Traverse AST
    try {
      const getSnippet = (startLine: number, endLine: number) => {
        const slice = lines.slice(Math.max(0, startLine - 1), Math.min(lines.length, endLine));
        return slice.join('\n').trim();
      };

      const getEnclosingSymbol = (pathNode: any): string | undefined => {
        let current = pathNode.parentPath;
        while (current) {
          if (current.isFunctionDeclaration() && current.node.id) {
            return current.node.id.name;
          }
          if (current.isClassMethod() && t.isIdentifier(current.node.key)) {
            const className = current.parentPath?.parentPath?.node?.id?.name || '';
            return className ? `${className}.${current.node.key.name}` : current.node.key.name;
          }
          if (current.isVariableDeclarator() && t.isIdentifier(current.node.id)) {
            if (t.isArrowFunctionExpression(current.node.init) || t.isFunctionExpression(current.node.init)) {
              return current.node.id.name;
            }
          }
          current = current.parentPath;
        }
        return undefined;
      };

      // Check Next.js App Router API Route conventions (e.g. app/api/.../route.ts)
      if (file.relativePath.includes('/api/') || file.relativePath.includes('api/')) {
        const routeMatch = file.relativePath.match(/app\/(?:api\/)?(.*?)\/route\.(?:ts|js)/);
        if (routeMatch) {
          const apiPath = `/api/${routeMatch[1].replace(/\[([^\]]+)\]/g, ':$1')}`;
          ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].forEach((httpMethod) => {
            if (file.content.includes(`export async function ${httpMethod}`) || file.content.includes(`export function ${httpMethod}`)) {
              apis.push({
                method: httpMethod as any,
                path: apiPath,
                handlerSymbolName: httpMethod,
                line: 1,
                framework: 'nextjs',
                snippet: `export function ${httpMethod}(req) [${apiPath}]`,
              });
            }
          });
        }
      }

      traverse(ast, {
        // Imports
        ImportDeclaration(pathNode) {
          const source = pathNode.node.source.value;
          const isRelative = source.startsWith('.');
          const importedSymbols: ExtractedImport['importedSymbols'] = [];

          for (const spec of pathNode.node.specifiers) {
            if (t.isImportDefaultSpecifier(spec)) {
              importedSymbols.push({ name: 'default', localName: spec.local.name, isDefault: true });
            } else if (t.isImportSpecifier(spec)) {
              const importedName = t.isIdentifier(spec.imported) ? spec.imported.name : (spec.imported as any).value;
              importedSymbols.push({ name: importedName, localName: spec.local.name, isDefault: false });
            } else if (t.isImportNamespaceSpecifier(spec)) {
              importedSymbols.push({ name: '*', localName: spec.local.name, isDefault: false });
            }
          }

          const resolved = isRelative ? resolveRelativeImport(file.relativePath, source, allFilePaths) : undefined;

          imports.push({
            source,
            resolvedPath: resolved,
            isRelative,
            importedSymbols,
            line: pathNode.node.loc?.start.line || 1,
          });
        },

        // Call Expressions (CommonJS require, function calls, API route registrations, DB queries)
        CallExpression(pathNode) {
          const line = pathNode.node.loc?.start.line || 1;
          const endLine = pathNode.node.loc?.end.line || line;
          const snippet = getSnippet(line, endLine);
          const caller = getEnclosingSymbol(pathNode);

          // Handle require()
          if (t.isIdentifier(pathNode.node.callee) && pathNode.node.callee.name === 'require') {
            const arg = pathNode.node.arguments[0];
            if (arg && t.isStringLiteral(arg)) {
              const source = arg.value;
              const isRelative = source.startsWith('.');
              const resolved = isRelative ? resolveRelativeImport(file.relativePath, source, allFilePaths) : undefined;
              imports.push({
                source,
                resolvedPath: resolved,
                isRelative,
                importedSymbols: [{ name: '*', localName: '*', isDefault: false }],
                line,
              });
            }
            return;
          }

          // Callee Name Extraction
          let calleeName = '';
          if (t.isIdentifier(pathNode.node.callee)) {
            calleeName = pathNode.node.callee.name;
          } else if (t.isMemberExpression(pathNode.node.callee)) {
            calleeName = getMemberExpressionName(pathNode.node.callee);
          }

          if (calleeName) {
            calls.push({
              calleeName,
              callerSymbolName: caller,
              line,
              snippet: snippet.slice(0, 150),
            });
          }

          // Detect Express / Fastify / Router API registrations: app.get('/users', handler), router.post('/orders', ...)
          if (t.isMemberExpression(pathNode.node.callee)) {
            const methodIdentifier = pathNode.node.callee.property;
            if (t.isIdentifier(methodIdentifier)) {
              const methodUpper = methodIdentifier.name.toUpperCase();
              if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL', 'USE'].includes(methodUpper)) {
                const firstArg = pathNode.node.arguments[0];
                if (firstArg && t.isStringLiteral(firstArg)) {
                  apis.push({
                    method: methodUpper === 'USE' ? 'ALL' : (methodUpper as any),
                    path: firstArg.value,
                    handlerSymbolName: caller,
                    line,
                    framework: 'express',
                    snippet: snippet.slice(0, 150),
                  });
                }
              }
            }
          }

          // Detect Database Operations (Prisma, Mongoose, TypeORM, Drizzle, SQL)
          detectDbCall(calleeName, snippet, line, caller, dbOperations);

          // Detect Event Emissions (eventEmitter.emit, publish)
          if (calleeName.endsWith('.emit') || calleeName.endsWith('.publish')) {
            const firstArg = pathNode.node.arguments[0];
            if (firstArg && t.isStringLiteral(firstArg)) {
              events.push({
                type: 'publish',
                eventName: firstArg.value,
                line,
                snippet: snippet.slice(0, 150),
              });
            }
          } else if (calleeName.endsWith('.on') || calleeName.endsWith('.subscribe')) {
            const firstArg = pathNode.node.arguments[0];
            if (firstArg && t.isStringLiteral(firstArg)) {
              events.push({
                type: 'subscribe',
                eventName: firstArg.value,
                line,
                snippet: snippet.slice(0, 150),
              });
            }
          }
        },

        // Function Declarations
        FunctionDeclaration(pathNode) {
          if (pathNode.node.id) {
            const line = pathNode.node.loc?.start.line || 1;
            const endLine = pathNode.node.loc?.end.line || line;
            const isExported = pathNode.parentPath.isExportNamedDeclaration() || pathNode.parentPath.isExportDefaultDeclaration();
            symbols.push({
              name: pathNode.node.id.name,
              kind: isTestFile ? 'test' : 'function',
              line,
              endLine,
              isExported,
              codeSnippet: getSnippet(line, Math.min(line + 15, endLine)),
              parameters: pathNode.node.params.map((p) => (t.isIdentifier(p) ? p.name : 'param')),
              complexity: calculateCyclomaticComplexity(pathNode),
            });
            if (isExported) exports.push(pathNode.node.id.name);
          }
        },

        // Class Declarations
        ClassDeclaration(pathNode) {
          if (pathNode.node.id) {
            const line = pathNode.node.loc?.start.line || 1;
            const endLine = pathNode.node.loc?.end.line || line;
            const className = pathNode.node.id.name;
            const isExported = pathNode.parentPath.isExportNamedDeclaration() || pathNode.parentPath.isExportDefaultDeclaration();

            // Detect ORM / Entity decorators or naming
            const isModel = className.endsWith('Model') || className.endsWith('Entity') || className.endsWith('Schema');

            symbols.push({
              name: className,
              kind: isModel ? 'db_model' : 'class',
              line,
              endLine,
              isExported,
              codeSnippet: getSnippet(line, Math.min(line + 15, endLine)),
              complexity: calculateCyclomaticComplexity(pathNode),
            });
            if (isExported) exports.push(className);
          }
        },

        // Class Methods
        ClassMethod(pathNode) {
          if (t.isIdentifier(pathNode.node.key)) {
            const line = pathNode.node.loc?.start.line || 1;
            const endLine = pathNode.node.loc?.end.line || line;
            const parentClass = pathNode.parentPath?.parentPath?.node;
            const className = (parentClass && t.isClassDeclaration(parentClass) && parentClass.id?.name) ? parentClass.id.name : '';
            const methodName = pathNode.node.key.name;
            const fullName = className ? `${className}.${methodName}` : methodName;

            symbols.push({
              name: fullName,
              kind: 'method',
              line,
              endLine,
              isExported: false,
              parentSymbol: className,
              codeSnippet: getSnippet(line, Math.min(line + 15, endLine)),
              parameters: pathNode.node.params.map((p) => (t.isIdentifier(p) ? p.name : 'param')),
              complexity: calculateCyclomaticComplexity(pathNode),
            });
          }
        },

        // Arrow Functions or Function Expressions assigned to variables
        VariableDeclaration(pathNode) {
          const isExported = pathNode.parentPath.isExportNamedDeclaration();
          for (const decl of pathNode.node.declarations) {
            if (t.isIdentifier(decl.id) && decl.init) {
              const name = decl.id.name;
              const line = decl.loc?.start.line || pathNode.node.loc?.start.line || 1;
              const endLine = decl.loc?.end.line || pathNode.node.loc?.end.line || line;

              if (t.isArrowFunctionExpression(decl.init) || t.isFunctionExpression(decl.init)) {
                symbols.push({
                  name,
                  kind: isTestFile ? 'test' : 'function',
                  line,
                  endLine,
                  isExported,
                  codeSnippet: getSnippet(line, Math.min(line + 15, endLine)),
                  complexity: calculateCyclomaticComplexity(pathNode),
                });
                if (isExported) exports.push(name);
              }
            }
          }
        },

        // TypeScript Interfaces and Type Aliases
        TSInterfaceDeclaration(pathNode) {
          const name = pathNode.node.id.name;
          const line = pathNode.node.loc?.start.line || 1;
          const endLine = pathNode.node.loc?.end.line || line;
          const isExported = pathNode.parentPath.isExportNamedDeclaration();
          symbols.push({
            name,
            kind: 'interface',
            line,
            endLine,
            isExported,
            codeSnippet: getSnippet(line, Math.min(line + 10, endLine)),
          });
          if (isExported) exports.push(name);
        },

        TSTypeAliasDeclaration(pathNode) {
          const name = pathNode.node.id.name;
          const line = pathNode.node.loc?.start.line || 1;
          const endLine = pathNode.node.loc?.end.line || line;
          const isExported = pathNode.parentPath.isExportNamedDeclaration();
          symbols.push({
            name,
            kind: 'type',
            line,
            endLine,
            isExported,
            codeSnippet: getSnippet(line, Math.min(line + 10, endLine)),
          });
          if (isExported) exports.push(name);
        },
      });
    } catch (err) {
      console.warn(`[JsTsParser] Traversal warning in ${file.relativePath}:`, err);
    }

    return {
      file,
      symbols,
      imports,
      exports,
      calls,
      apis,
      dbOperations,
      events,
      isTestFile,
    };
  }

  private detectIsTestFile(relPath: string): boolean {
    const lower = relPath.toLowerCase();
    return (
      lower.includes('.test.') ||
      lower.includes('.spec.') ||
      lower.includes('__tests__') ||
      lower.includes('/tests/') ||
      lower.includes('/test/') ||
      lower.endsWith('_test.ts') ||
      lower.endsWith('_test.js')
    );
  }

  private fallbackRegexExtraction(file: FileEntry, allFilePaths: string[], isTestFile: boolean): ExtractedFileAnalysis {
    const symbols: ExtractedSymbol[] = [];
    const imports: ExtractedImport[] = [];
    const exports: string[] = [];
    const calls: ExtractedCall[] = [];
    const apis: ExtractedApiEndpoint[] = [];
    const dbOperations: ExtractedDbOperation[] = [];
    const events: ExtractedEventOperation[] = [];

    const lines = file.content.split('\n');

    lines.forEach((lineStr, idx) => {
      const lineNum = idx + 1;

      // Imports regex: import ... from '...'
      const importMatch = lineStr.match(/import\s+(?:\{([^}]+)\}|(\w+)|\*\s+as\s+(\w+))\s+from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        const source = importMatch[4];
        const isRelative = source.startsWith('.');
        const resolved = isRelative ? resolveRelativeImport(file.relativePath, source, allFilePaths) : undefined;
        imports.push({
          source,
          resolvedPath: resolved,
          isRelative,
          importedSymbols: [{ name: importMatch[1] || importMatch[2] || importMatch[3] || '*', localName: '*', isDefault: !!importMatch[2] }],
          line: lineNum,
        });
      }

      // Function regex
      const fnMatch = lineStr.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
      if (fnMatch) {
        symbols.push({
          name: fnMatch[1],
          kind: isTestFile ? 'test' : 'function',
          line: lineNum,
          endLine: lineNum + 10,
          isExported: lineStr.includes('export'),
          codeSnippet: lineStr.trim(),
        });
      }

      // Class regex
      const classMatch = lineStr.match(/(?:export\s+)?class\s+(\w+)/);
      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          kind: 'class',
          line: lineNum,
          endLine: lineNum + 20,
          isExported: lineStr.includes('export'),
          codeSnippet: lineStr.trim(),
        });
      }
    });

    return {
      file,
      symbols,
      imports,
      exports,
      calls,
      apis,
      dbOperations,
      events,
      isTestFile,
    };
  }
}

function getMemberExpressionName(node: any): string {
  if (t.isIdentifier(node)) return node.name;
  if (t.isThisExpression(node)) return 'this';
  if (t.isMemberExpression(node)) {
    const obj = getMemberExpressionName(node.object);
    const prop = t.isIdentifier(node.property) ? node.property.name : '';
    return obj ? `${obj}.${prop}` : prop;
  }
  return '';
}

function resolveRelativeImport(currentFilePath: string, importSource: string, allFilePaths: string[]): string | undefined {
  const currentDir = path.dirname(currentFilePath);
  const normalizedCandidate = path.normalize(path.join(currentDir, importSource)).replace(/\\/g, '/');

  const possibleExtensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

  for (const ext of possibleExtensions) {
    const fullCandidate = normalizedCandidate + ext;
    if (allFilePaths.includes(fullCandidate)) {
      return fullCandidate;
    }
  }

  // Find prefix match
  const matched = allFilePaths.find((p) => p.startsWith(normalizedCandidate));
  return matched;
}

function detectDbCall(
  calleeName: string,
  snippet: string,
  line: number,
  caller: string | undefined,
  dbOperations: ExtractedDbOperation[]
) {
  // Prisma: prisma.user.findMany, prisma.order.create, etc.
  const prismaMatch = calleeName.match(/prisma\.(\w+)\.(findMany|findUnique|findFirst|create|update|delete|upsert|queryRaw)/i);
  if (prismaMatch) {
    const table = prismaMatch[1];
    const op = prismaMatch[2].toLowerCase().includes('create') || prismaMatch[2].toLowerCase().includes('update') || prismaMatch[2].toLowerCase().includes('delete')
      ? 'INSERT'
      : 'SELECT';
    dbOperations.push({
      operation: op as any,
      targetTableOrModel: table,
      orm: 'prisma',
      line,
      snippet,
      callerSymbolName: caller,
    });
    return;
  }

  // TypeORM / Mongoose: User.findOne, Order.create, repo.save
  if (calleeName.endsWith('.find') || calleeName.endsWith('.findOne') || calleeName.endsWith('.findById') || calleeName.endsWith('.select')) {
    const target = calleeName.split('.')[0];
    dbOperations.push({
      operation: 'SELECT',
      targetTableOrModel: target,
      orm: 'mongoose',
      line,
      snippet,
      callerSymbolName: caller,
    });
  } else if (calleeName.endsWith('.create') || calleeName.endsWith('.save') || calleeName.endsWith('.insert') || calleeName.endsWith('.update') || calleeName.endsWith('.delete')) {
    const target = calleeName.split('.')[0];
    dbOperations.push({
      operation: 'UPDATE',
      targetTableOrModel: target,
      orm: 'mongoose',
      line,
      snippet,
      callerSymbolName: caller,
    });
  } else if (calleeName.includes('query') || snippet.includes('SELECT ') || snippet.includes('INSERT INTO ') || snippet.includes('UPDATE ')) {
    // SQL query detection
    const sqlMatch = snippet.match(/(?:FROM|INTO|UPDATE)\s+([`"']?[\w_]+[`"']?)/i);
    const table = sqlMatch ? sqlMatch[1].replace(/[`"']/g, '') : 'database';
    dbOperations.push({
      operation: snippet.includes('SELECT') ? 'SELECT' : 'UPDATE',
      targetTableOrModel: table,
      orm: 'sql',
      line,
      snippet,
      callerSymbolName: caller,
    });
  }
}

function calculateCyclomaticComplexity(pathNode: any): number {
  let complexity = 1;
  pathNode.traverse({
    IfStatement() { complexity++; },
    ForStatement() { complexity++; },
    ForInStatement() { complexity++; },
    ForOfStatement() { complexity++; },
    WhileStatement() { complexity++; },
    DoWhileStatement() { complexity++; },
    SwitchCase(p: any) { if (p.node.test) complexity++; },
    ConditionalExpression() { complexity++; },
    LogicalExpression(p: any) {
      if (p.node.operator === '&&' || p.node.operator === '||' || p.node.operator === '??') {
        complexity++;
      }
    },
    CatchClause() { complexity++; },
  });
  return complexity;
}

export const defaultJsTsParser = new JsTsParser();
