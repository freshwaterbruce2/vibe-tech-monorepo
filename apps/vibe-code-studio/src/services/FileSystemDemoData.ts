export const DEMO_FILES = new Map<string, string>([
  [
    'demo://workspace/index.js',
    `// Demo JavaScript file for testing AI features

class TodoApp {
  constructor() {
    this.todos = [];
    this.nextId = 1;
  }

  addTodo(text) {
    const todo = {
      id: this.nextId++,
      text,
      completed: false,
      createdAt: new Date()
    };
    this.todos.push(todo);
    return todo;
  }

  toggleTodo(id) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
    }
    return todo;
  }

  deleteTodo(id) {
    const index = this.todos.findIndex(t => t.id === id);
    if (index !== -1) {
      return this.todos.splice(index, 1)[0];
    }
    return null;
  }

  getTodos() {
    return this.todos;
  }
}

// Persistence: save/load todos from localStorage
  save() {
    localStorage.setItem('todos', JSON.stringify(this.todos));
    localStorage.setItem('nextId', String(this.nextId));
  }

  load() {
    try {
      const saved = localStorage.getItem('todos');
      if (saved) {
        this.todos = JSON.parse(saved);
        this.nextId = parseInt(localStorage.getItem('nextId') || '1', 10);
      }
    } catch (e) {
      logger.error('Failed to load todos:', e);
    }
  }

  // Filter todos by completion status: 'all' | 'active' | 'completed'
  filterByStatus(status) {
    if (status === 'active') return this.todos.filter(t => !t.completed);
    if (status === 'completed') return this.todos.filter(t => t.completed);
    return this.todos;
  }

  // Search todos by text (case-insensitive)
  search(query) {
    if (!query || !query.trim()) return this.todos;
    const lower = query.toLowerCase();
    return this.todos.filter(t => t.text.toLowerCase().includes(lower));
  }
}

module.exports = TodoApp;`
  ],
  [
    'demo://workspace/README.md',
    `# Demo Workspace

This is a demo workspace for testing the Vibe Code Studio with Cursor IDE features.

## Features to Test

1. **Multi-Model AI Support**
   - Use the Model Selector in the title bar
   - Switch between OpenAI, Anthropic, and DeepSeek models

2. **Agent Mode (Ctrl+Shift+A)**
   - Launch autonomous coding agent
   - Describe complex tasks and watch them execute

3. **Terminal Integration**
   - Click Terminal button in status bar
   - Run commands in integrated terminal

## Quick Start

1. Open a file from the sidebar
2. Try AI-powered code completion
3. Use Agent Mode for complex tasks
4. Open the integrated terminal`
  ],
  [
    'demo://workspace/styles.css',
    `/* Demo CSS file for testing styling features */

.todo-app {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Arial', sans-serif;
}

.todo-header {
  text-align: center;
  margin-bottom: 30px;
}

.todo-header h1 {
  color: #333;
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.todo-input {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.todo-input input {
  flex: 1;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
}

.todo-input input:focus {
  outline: none;
  border-color: #4CAF50;
}

.todo-input button {
  padding: 12px 24px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
}

.todo-input button:hover {
  background: #45a049;
}

.todo-list {
  list-style: none;
  padding: 0;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: #f9f9f9;
  border-radius: 8px;
  border-left: 4px solid #4CAF50;
}

.todo-item.completed {
  opacity: 0.6;
  text-decoration: line-through;
  border-left-color: #ccc;
}

.todo-item input[type="checkbox"] {
  margin-right: 12px;
  transform: scale(1.2);
}

.todo-item span {
  flex: 1;
  font-size: 16px;
}

.todo-item button {
  background: #ff4444;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.todo-item button:hover {
  background: #cc0000;
}`
  ],
  [
    'demo://workspace/utils.js',
    `// Utility functions for the Todo App

/**
 * Format a date to a readable string
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Generate a unique ID
 * @returns {string} Unique identifier
 */
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Debounce function to limit the rate of function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Filter todos based on completion status
 * @param {Array} todos - Array of todo items
 * @param {string} filter - Filter type: 'all', 'active', 'completed'
 * @returns {Array} Filtered todos
 */
function filterTodos(todos, filter) {
  switch (filter) {
    case 'active':
      return todos.filter(todo => !todo.completed);
    case 'completed':
      return todos.filter(todo => todo.completed);
    default:
      return todos;
  }
}

/**
 * Search todos by text content
 * @param {Array} todos - Array of todo items
 * @param {string} searchTerm - Search term
 * @returns {Array} Matching todos
 */
function searchTodos(todos, searchTerm) {
  if (!searchTerm.trim()) {
    return todos;
  }

  const term = searchTerm.toLowerCase();
  return todos.filter(todo =>
    todo.text.toLowerCase().includes(term)
  );
}

module.exports = {
  formatDate,
  generateId,
  debounce,
  filterTodos,
  searchTodos
};`
  ]
]);
