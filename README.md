# Project Overview:
Modern cloud environments consist of various interconnected applications and services, making it challenging to understand and manage their relationships effectively. While traditional monitoring tools offer basic insights, there is a growing need for intelligent visualization systems that automatically discover and present complex application dependencies in an actionable format.

This project aims to develop a containerized solution that identifies, maps, and visualizes the dependencies between cloud resources in a selected cloud environment. The system will facilitate better cloud resource management, enhance observability, and support DevOps teams in optimizing deployment strategies.

# Project Requirements:

The project will be developed from scratch, focusing on:

Dependency Discovery – Building a solution to identify and visualize links between cloud resources.
Containerized Deployment – Ensuring the solution is fully containerized and runs within the target cloud environment.
#Expected Deliverables:

At a minimum, the project will deliver:

* A design blueprint of the solution.
* A working prototype demonstrating real-time cloud resource dependencies.
* A DevOps pipeline supporting automated build, testing, release, and deployment.
# Additional Feature (Optional):
Explainability in Dependency Mapping – Providing insights into how and why cloud resources are interlinked.

# Dockerfile
docker build -t cloudvisualizer .
docker run -p 5173:5173 cloudvisualizer
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```

