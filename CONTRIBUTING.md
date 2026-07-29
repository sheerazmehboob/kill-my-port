# Contributing to Kill My Port

First off, thank you for considering contributing to Kill My Port! It's people like you that make this tool better for everyone.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. We expect all contributors to maintain a respectful, welcoming, and inclusive environment.

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/kill-my-port.git
   cd kill-my-port
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a new branch** for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

Kill My Port is an Electron application built with React and Vite.

To start the development server:
```bash
npm run dev
```

To run the application with admin privileges (required for testing some kill strategies on Linux/macOS):
```bash
npm run dev:admin
```

## Pull Request Process

1. **Ensure your code works** across multiple platforms (if applicable).
2. **Run the linter** to maintain code quality:
   ```bash
   npm run lint
   ```
3. **Update the README.md** with details of changes to the interface, new environment variables, or necessary new commands.
4. **Submit a Pull Request** against the `main` branch. Provide a clear and descriptive title and explain the changes you've made.

## How to Report Bugs

If you find a bug, please create an issue on GitHub with the following details:
* Your operating system and version.
* Steps to reproduce the bug.
* Expected behavior vs. actual behavior.
* Any relevant screenshots or error logs.

## Suggesting Enhancements

We are always looking for ways to improve! If you have an idea for a new feature:
* Open an issue labeled `enhancement`.
* Describe the feature, why it's needed, and how it should work.
* If you have a UI mock-up, please attach it!

Thank you for contributing!
