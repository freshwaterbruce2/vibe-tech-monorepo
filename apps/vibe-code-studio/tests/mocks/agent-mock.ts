import { Page, Route } from '@playwright/test';

export async function setupAgentMock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as any).env = {
      ...((window as any).env || {}),
      VITE_MOONSHOT_API_KEY: 'mock-moonshot-key-123',
      VITE_DEEPSEEK_API_KEY: 'mock-deepseek-key-123',
    };
    (window as any).electron = {
      shell: {
        execute: async (command: string, cwd?: string) => {
          if (command.includes('git status')) {
            return { success: true, stdout: 'On branch main\nnothing to commit, working tree clean', stderr: '', code: 0 };
          }
          if (command.includes('nonexistent-package-xyz-123')) {
            return { success: false, stdout: '', stderr: 'npm ERR! 404 Not Found: nonexistent-package-xyz-123', code: 1 };
          }
          return { success: true, stdout: 'Mock execution successful', stderr: '', code: 0 };
        }
      }
    };
  });

  await page.route(/chat\/completions/, async (route: Route) => {
    try {
      console.log('[INTERCEPTED URL]:', route.request().url());
      const postData = route.request().postData();
      if (!postData) {
        await route.continue();
        return;
      }

      const data = JSON.parse(postData);
      const messages = data.messages || [];
      const fullContent = messages.map((m: any) => m.content || '').join('\n');
      const lowerContent = fullContent.toLowerCase();
      console.log('[MOCK REQUEST CONTENT]:', lowerContent);

      // Add a generous delay for simulated requests containing package.json to ensure E2E status tracking works reliably
      if (lowerContent.includes('package.json')) {
        const delay = (lowerContent.includes('output format (json)') || lowerContent.includes('available actions:')) ? 2000 : 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      let responseText = '';

      // 1. ReAct Thought Phase
      if (lowerContent.includes('"reasoning"') && lowerContent.includes('"expectedoutcome"')) {
        responseText = JSON.stringify({
          reasoning: 'Executing step in demo mode',
          approach: 'Run mock action',
          alternatives: ['None'],
          confidence: 90,
          risks: [],
          expectedOutcome: 'Step completed successfully'
        });
      }
      // 2. ReAct Observation Phase
      else if (lowerContent.includes('"actualoutcome"') && lowerContent.includes('"unexpectedevents"')) {
        responseText = JSON.stringify({
          actualOutcome: 'Step executed successfully in demo mode',
          success: true,
          differences: [],
          learnings: [],
          unexpectedEvents: []
        });
      }
      // 3. ReAct Reflection Phase
      else if (lowerContent.includes('"whatworked"') && lowerContent.includes('"knowledgegained"')) {
        responseText = JSON.stringify({
          whatWorked: ['Demo execution completed'],
          whatFailed: [],
          rootCause: null,
          shouldRetry: false,
          suggestedChanges: [],
          knowledgeGained: 'ReAct loop completed'
        });
      }
      // 4. Task Planning Phase
      else if (lowerContent.includes('output format (json)') || lowerContent.includes('available actions:')) {
        // Determine request type
        const userRequestMatch = fullContent.match(/user request:\s*([^\n]+)/i);
        const matchTarget = userRequestMatch ? userRequestMatch[1].toLowerCase() : lowerContent;
        let steps = [];
        if (matchTarget.includes('package.json')) {
          steps = [
            {
              order: 1,
              title: 'Read package.json',
              description: 'Read the contents of package.json',
              action: {
                type: 'read_file',
                params: {
                  filePath: 'package.json'
                }
              },
              requiresApproval: false,
              maxRetries: 3
            }
          ];
        } else if (matchTarget.includes('vite.config.ts')) {
          steps = [
            {
              order: 1,
              title: 'Read vite.config.ts',
              description: 'Read the contents of vite.config.ts',
              action: {
                type: 'read_file',
                params: {
                  filePath: 'vite.config.ts'
                }
              },
              requiresApproval: false,
              maxRetries: 3
            }
          ];
        } else if (matchTarget.includes('app.tsx') && matchTarget.includes('editor.tsx')) {
          steps = [
            {
              order: 1,
              title: 'Analyze index.js',
              description: 'Analyze index.js content',
              action: {
                type: 'analyze_code',
                params: {
                  filePath: 'index.js'
                }
              },
              requiresApproval: false,
              maxRetries: 3
            },
            {
              order: 2,
              title: 'Analyze utils.js',
              description: 'Analyze utils.js content',
              action: {
                type: 'analyze_code',
                params: {
                  filePath: 'utils.js'
                }
              },
              requiresApproval: false,
              maxRetries: 3
            }
          ];
        } else if (matchTarget.includes('app.tsx')) {
          steps = [
            {
              order: 1,
              title: 'Read index.js',
              description: 'Read index.js content',
              action: {
                type: 'read_file',
                params: {
                  filePath: 'index.js'
                }
              },
              requiresApproval: false,
              maxRetries: 3
            }
          ];
        } else if (matchTarget.includes('button.tsx')) {
          steps = [
            {
              order: 1,
              title: 'Write Button.tsx (write_file)',
              description: 'Create a simple React button component',
              action: {
                type: 'write_file',
                params: {
                  filePath: 'src/components/Button.tsx',
                  content: 'import React from \'react\';\nexport const Button = () => <button>Click me</button>;\n'
                }
              },
              requiresApproval: false,
              maxRetries: 3
            }
          ];
        } else if (matchTarget.includes('git status')) {
          steps = [
            {
              order: 1,
              title: 'Git Status (execute_command)',
              description: 'Run git status command',
              action: {
                type: 'run_command',
                params: {
                  command: 'git status'
                }
              },
              requiresApproval: false,
              maxRetries: 3
            }
          ];
        } else if (matchTarget.includes('loginform.tsx')) {
          steps = [
            {
              order: 1,
              title: 'Write LoginForm.tsx (write_file)',
              description: 'Create a simple Login Form component',
              action: {
                type: 'write_file',
                params: {
                  filePath: 'src/components/LoginForm.tsx',
                  content: 'import React from \'react\';\nexport const LoginForm = () => <form><input type="text"/></form>;\n'
                }
              },
              requiresApproval: false,
              maxRetries: 3
            },
            {
              order: 2,
              title: 'Write LoginForm.test.tsx',
              description: 'Create a unit test for LoginForm',
              action: {
                type: 'write_file',
                params: {
                  filePath: 'src/components/LoginForm.test.tsx',
                  content: 'import { render } from \'@testing-library/react\';\n// login form test\n'
                }
              },
              requiresApproval: false,
              maxRetries: 3
            }
          ];
        } else if (matchTarget.includes('nonexistent-package-xyz-123')) {
          steps = [
            {
              order: 1,
              title: 'Run failing command',
              description: 'Execute npm install on nonexistent package',
              action: {
                type: 'run_command',
                params: {
                  command: 'npm install nonexistent-package-xyz-123'
                }
              },
              requiresApproval: false,
              maxRetries: 1
            }
          ];
        } else if (matchTarget.includes('delete the test-file.txt')) {
          steps = [
            {
              order: 1,
              title: 'Delete test file',
              description: 'Delete a test file',
              action: {
                type: 'delete_file',
                params: {
                  filePath: 'test-file.txt'
                }
              },
              requiresApproval: true,
              maxRetries: 3
            }
          ];
        } else {
          // Generic files list analysis
          steps = [
            {
              order: 1,
              title: 'Read index.js',
              description: 'Read index.js',
              action: {
                type: 'read_file',
                params: {
                  filePath: 'index.js'
                }
              },
              requiresApproval: false,
              maxRetries: 3
            }
          ];
        }

        responseText = JSON.stringify({
          title: 'Demo Task',
          description: matchTarget.includes('git status')
            ? 'On branch main\nnothing to commit, working tree clean'
            : 'Executing task in mock mode',
          reasoning: 'Planned sequence of actions',
          steps,
          warnings: []
        }, null, 2);
      }
      // 5. Default: just return synthesis report or explanation
      else {
        responseText = `### AI Synthesis Report (AUTO-GENERATED)
All requested operations have been analyzed and completed successfully in mock mode.

- **Files Processed**: Verified
- **Logs**: Success ✅
- **Structure**: Normal`;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: JSON.stringify({
          id: 'chatcmpl-mock-' + Date.now(),
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'deepseek-chat',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: responseText
              },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150
          }
        })
      });

    } catch (error) {
      console.error('Error in mock route:', error);
      await route.continue();
    }
  });
}
