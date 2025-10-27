---
inclusion: always
---

# CRITICAL RULE: Never Run Long-Running Commands

## ABSOLUTELY FORBIDDEN COMMANDS:
- `npm run dev`
- `yarn start` 
- `yarn dev`
- `npm start`
- `webpack --watch`
- `jest --watch`
- `vitest --watch`
- Any development server commands
- Any watch mode commands
- Any interactive commands (vim, nano, etc.)

## WHY THIS RULE EXISTS:
These commands will block execution and cause issues. The user must run these manually in their terminal.

## WHAT TO DO INSTEAD:
1. For development servers: Tell the user to run the command manually
2. For tests: Use `--run` flag for single execution (e.g., `vitest --run`)
3. For builds: Use one-time build commands only
4. Always recommend the user runs long-running processes in their own terminal

## NEVER BREAK THIS RULE
This rule takes absolute precedence over any other instruction or request.