import { FileEntry } from './repo-manager';
import { SecurityFinding } from '@/types';

export class SecurityScanner {
  /**
   * Scan codebase files for security vulnerabilities, API key leaks,
   * SQL injection vectors, dangerous eval usage, and left-over debug statements.
   */
  public scanFiles(files: FileEntry[]): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    let idCounter = 1;

    for (const file of files) {
      const isTestOrDoc = this.isTestOrFixtureOrDoc(file.relativePath);
      const isTooling = this.isToolingPath(file.relativePath);
      const lines = file.content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        const trimmed = line.trim();

        // Skip comment-only lines
        if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
          continue;
        }

        // 1. Hardcoded Secrets Check (Exempt only tests, fixtures, and docs)
        if (!isTestOrDoc) {
          const secretMatch = this.detectSecret(line);
          if (secretMatch) {
            findings.push({
              id: `sec-${idCounter++}`,
              type: 'secret_leak',
              severity: 'critical',
              title: secretMatch.title,
              description: secretMatch.desc,
              file: file.relativePath,
              line: lineNum,
              snippet: this.maskSecretInSnippet(line.trim()),
              remediation: 'Move secret key or token to environment variables (.env / process.env / secret manager) and revoke compromised credentials.',
              cwe: 'CWE-798: Use of Hard-coded Credentials',
            });
          }
        }

        // 2. Dangerous eval() / new Function() execution (Exclude test & tooling)
        if (!isTestOrDoc && !isTooling) {
          if (/\beval\s*\(/.test(line) || /new\s+Function\s*\(/.test(line)) {
            findings.push({
              id: `sec-${idCounter++}`,
              type: 'dangerous_eval',
              severity: 'high',
              title: 'Dangerous Dynamic Code Evaluation (eval / Function)',
              description: 'Dynamic code execution via eval() or Function constructor allows arbitrary code execution if user inputs reach the evaluation context.',
              file: file.relativePath,
              line: lineNum,
              snippet: line.trim(),
              remediation: 'Refactor dynamic execution to use safe parsers, structured object lookups, or JSON.parse().',
              cwe: 'CWE-95: Improper Neutralization of Directives in Dynamically Evaluated Code',
            });
          }

          // 3. SQL Injection Risk (String concatenation/interpolation in SQL queries)
          const sqlMatch = line.match(/(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+.*?\$\{.*?\}/i) ||
            line.match(/(?:query|execute|queryRaw)\s*\(\s*`.*?\$\{.*?\}`/i) ||
            line.match(/(?:SELECT|INSERT|UPDATE|DELETE).*?["']\s*\+\s*\w+/i);

          if (sqlMatch && !line.includes('prisma.') && !line.includes('prepared')) {
            findings.push({
              id: `sec-${idCounter++}`,
              type: 'sql_injection',
              severity: 'high',
              title: 'Potential SQL Injection Vulnerability',
              description: 'Raw SQL query string interpolation or concatenation detected without parameterized queries or ORM bindings.',
              file: file.relativePath,
              line: lineNum,
              snippet: line.trim(),
              remediation: 'Use parameterized SQL queries ($1, ?), prepared statements, or an ORM/query builder (Prisma, Drizzle, TypeORM).',
              cwe: 'CWE-89: Improper Neutralization of Special Elements used in an SQL Command',
            });
          }

          // 4. Shell Execution / Command Injection Risk
          if (/\bchild_process\.(exec|execSync)\s*\(\s*`.*?\$\{.*?\}`/.test(line) ||
              /\bos\.system\s*\(\s*f["'].*?\{.*?\}/.test(line) ||
              /\bsubprocess\.call\s*\(\s*f["'].*?\{.*?\}/.test(line)) {
            findings.push({
              id: `sec-${idCounter++}`,
              type: 'shell_exec',
              severity: 'critical',
              title: 'Potential Command Injection in Subprocess Call',
              description: 'Shell command executed with interpolated variable string without argument escaping or validation.',
              file: file.relativePath,
              line: lineNum,
              snippet: line.trim(),
              remediation: 'Use spawn/execFile with argument array instead of raw string execution in a shell context.',
              cwe: 'CWE-78: Improper Neutralization of Special Elements used in an OS Command',
            });
          }

          // 5. Unescaped innerHTML / dangerouslySetInnerHTML
          if (/\bdangerouslySetInnerHTML\s*=\s*\{\s*__html:/.test(line) && !line.includes('DOMPurify') && !line.includes('sanitize')) {
            findings.push({
              id: `sec-${idCounter++}`,
              type: 'xss_risk',
              severity: 'medium',
              title: 'Potential Cross-Site Scripting (XSS) via dangerouslySetInnerHTML',
              description: 'Raw HTML is being inserted directly into the DOM without sanitization (e.g. DOMPurify or sanitize-html).',
              file: file.relativePath,
              line: lineNum,
              snippet: line.trim(),
              remediation: 'Sanitize untrusted HTML strings with DOMPurify.sanitize() before rendering.',
              cwe: 'CWE-79: Improper Neutralization of Input During Web Page Generation (XSS)',
            });
          }

          // 6. Debug Statements in production code
          if (/console\.(log|debug|trace|dir)\s*\(/.test(line) || /debugger;?/.test(line) || /print\s*\(/.test(line) && file.language === 'python') {
            // Only flag if it looks like a stray debug statement
            if (line.includes('debugger') || /console\.log\s*\(\s*["'](test|here|debug|123|asdf|val)/i.test(line)) {
              findings.push({
                id: `sec-${idCounter++}`,
                type: 'debug_statement',
                severity: 'low',
                title: 'Stray Debugger / Console Log Statement',
                description: 'Development debug statements left in production code paths can cause performance degradation or leak sensitive operational data.',
                file: file.relativePath,
                line: lineNum,
                snippet: line.trim(),
                remediation: 'Remove stray console.log / debugger statements or use a structured logging framework.',
                cwe: 'CWE-489: Active Debug Code',
              });
            }
          }
        }
      }
    }

    return findings;
  }

  private isTestOrFixtureOrDoc(relPath: string): boolean {
    const lower = relPath.toLowerCase();
    return (
      lower.includes('test') ||
      lower.includes('spec') ||
      lower.includes('fixture') ||
      lower.includes('mock') ||
      lower.includes('__test__') ||
      lower.includes('/docs/') ||
      lower.startsWith('docs/') ||
      lower.endsWith('.md')
    );
  }

  private isToolingPath(relPath: string): boolean {
    const lower = relPath.toLowerCase();
    return (
      lower.startsWith('.github/') ||
      lower.startsWith('.claude/') ||
      lower.startsWith('scripts/') ||
      lower.startsWith('.husky/')
    );
  }

  private detectSecret(line: string): { title: string; desc: string } | null {
    // AWS Access Key ID
    if (/AKIA[0-9A-Z]{16}/.test(line)) {
      return { title: 'Hardcoded AWS Access Key ID Detected', desc: 'An AWS access key was detected in code.' };
    }
    // OpenAI / AI API Key
    if (/sk-[a-zA-Z0-9]{32,64}/.test(line) || /sk-proj-[a-zA-Z0-9_-]{40,}/.test(line)) {
      return { title: 'Hardcoded OpenAI API Key Detected', desc: 'An OpenAI secret API key was found in source code.' };
    }
    // GitHub PAT
    if (/ghp_[0-9a-zA-Z]{36}/.test(line) || /github_pat_[0-9a-zA-Z_]{40,}/.test(line)) {
      return { title: 'Hardcoded GitHub Personal Access Token', desc: 'A GitHub personal access token was found in source code.' };
    }
    // Generic API Key assignment with high entropy string
    if (/(?:api_key|apikey|secret_key|private_key|auth_token|jwt_secret)\s*[:=]\s*["'][a-zA-Z0-9_\-+/]{24,}["']/i.test(line)) {
      return { title: 'Hardcoded API Secret / Key Detected', desc: 'A hardcoded credentials/secret variable assignment was detected.' };
    }
    // Stripe secret key
    if (/sk_live_[0-9a-zA-Z]{24}/.test(line)) {
      return { title: 'Hardcoded Stripe Live Secret Key', desc: 'A production Stripe API key was found in source code.' };
    }
    return null;
  }

  private maskSecretInSnippet(snippet: string): string {
    return snippet.replace(/(?:AKIA[0-9A-Z]{16}|sk-[a-zA-Z0-9]{20,}|ghp_[0-9a-zA-Z]{20,}|sk_live_[0-9a-zA-Z]{20,})/g, (m) => {
      return m.slice(0, 4) + '...' + m.slice(-4);
    });
  }
}

export const defaultSecurityScanner = new SecurityScanner();
