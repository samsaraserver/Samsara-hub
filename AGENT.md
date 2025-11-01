# Agent Guidelines
This file specifies how this app must be developed, features, coding standards and requirements.


# General about
This is a bun based app that is written in html. It runs on a Android app that has been converted into a Andoid server. Website url is (https://samsaraserver.space)
This app whill run when the server starts up and and allows the user to intervace and control the linux server without the need to write cli commands.
IT has a package manager with community packages also included. the ability to run commands restart stop start and make the server do other actions. it has monitoring for the system aswlell with temps uptime services and more and will be run as a root user. the app has already been designed as an svg found in #WebUi.svg

All features need to be implmented as the main landing page. The pages of doucmentation communit foumrs will be seperate websites. The settings will be a popup ui that the user can edit.





# General lanagauge
This app is a


## Code Quality
Use Camel Case
Structrure app out simply and use propper folder naminging
Apply Assumpting tagging format when writing code
write clean readabel maintable code
follow typescript best practices with strict tyep checking
use mondern es modules syntax
leverafe Buns fnative features over external dependancies qhen possible
no any typesin typescirpt
use a pmain public file with server.ts as the main run file.

handle erros with try catch
always use async/await never raw promises
 never commit any secrets avoid n+1 queries
 use const by default let when needed
 use 4space  indentation
 use {  on th e same line as the funciton







## Code Quality
- NO code comments in production files
- NO emojis in codebase
- Clean, readable structure
- Consistent naming conventions
- NO EDITING THE #AGENT.md FILE
- When asked to solve COMPLETION_DRIVE or ASSUMPTION TAGGING you may never solve the example given

## Prohibited in ALL Code
- Emojis in code or UI elements
- Code comments (except assumption tagging)

## Required Assumption Tagging Format

```code
// #COMPLETION_DRIVE: [assumption description]
// #SUGGEST_VERIFY: [validation method]
```

#### Assumption Tagging

When writing code, ALWAYS add tagged comments for ANY assumption:

```code
// #COMPLETION_DRIVE: [what you're assuming]
// #SUGGEST_VERIFY: [how to fix/validate it]
```

  Example:
  ```code
  // #COMPLETION_DRIVE: Assuming state update completes before navigation
  // #SUGGEST_VERIFY: Use callback or await state update confirmation
  setUserData(newData);
  navigateToProfile(userData.id);
  ```
++++++++++++++++++++++++++++





# Agent Guidelines

This file specifies how this app must be developed, including features, coding standards, and requirements.

## Project Overview

This is a Bun-based application written in HTML that runs on an Android server (converted Android app). This will be on local host. the project website URL is https://samsaraserver.space

The app will run when the server starts up and allows the user to interface and control the Linux server without needing to write CLI commands. It runs as a root user.

## General About

This is a Bun-based app that is written in HTML. It runs on an Android app that has been converted into an Android server.
This app will run when the server starts up and allows the user to interface and control the Linux server without the need to write CLI commands.
It has a package manager with community packages also included, the ability to run commands (restart, stop, start) and make the server do other actions. It has monitoring for the system as well with temperatures, uptime, services, and more and will be run as a root user. The app has already been designed as an SVG found in #WebUI.svg
All features need to be implemented as the main landing page. The pages of documentation and community forums will be separate websites. The settings will be a popup UI that the user can edit.

### Features

- Package manager with community packages included
- Ability to run commands (restart, stop, start) and control server actions
- System monitoring including temperatures, uptime, services, and more
- Main landing page implementing all core features
- Separate websites for documentation and community forums
- Settings popup UI for user configuration
- Design reference available in #WebUI.svg

### Technical Stack

- Runtime: Bun
- Frontend: HTML
- Platform: Android server
- Server: Linux
- Main entry: server.ts in public folder

### Required Startup Files

The project MUST include both platform-specific startup scripts:

- `start.sh` - For Termux and Alpine Linux and general linux platforms
- `start.bat` - For Windows platforms

These scripts are used to run the application. Use other Bun commands for additional operations.

## Coding Standards

All code written for this project MUST follow these standards.

### Naming Conventions

- Use camelCase for variables and functions
- Use PascalCase for classes and types
- Use consistent naming throughout the codebase
- Use proper folder naming conventions

### TypeScript Requirements

- Follow TypeScript best practices with strict type checking
- NO any types in TypeScript
- Use modern ES modules syntax
- Leverage Bun's native features over external dependencies when possible
- Type safety enforcement required

### Code Formatting

- Use 4-space indentation
- Use `{` on the same line as the function
- Use `const` by default, `let` when needed
- Write clean, readable, maintainable code
- Clean, readable structure required

### File Structure

- Structure app simply and logically
- Use main public file with server.ts as the entry point
- No dead code or unused imports

### Async & Error Handling

- Always use async/await, never raw promises
- Handle errors with try-catch blocks
- Proper error handling required

### Security & Performance

- Never commit any secrets
- Avoid N+1 queries

### Prohibited in ALL Code

- NO code comments in production files (except assumption tagging)
- NO emojis in codebase or UI elements
- NO editing the #AGENT.md file

### Required: Assumption Tagging

When writing code, ALWAYS add tagged comments for ANY assumption:

```code
// #COMPLETION_DRIVE: [assumption description]
// #SUGGEST_VERIFY: [validation method]
```

**Example:**

```code
// #COMPLETION_DRIVE: Assuming state update completes before navigation
// #SUGGEST_VERIFY: Use callback or await state update confirmation
setUserData(newData);
navigateToProfile(userData.id);
```

**Important:** When asked to solve COMPLETION_DRIVE or ASSUMPTION TAGGING, you may never solve the example given above.
