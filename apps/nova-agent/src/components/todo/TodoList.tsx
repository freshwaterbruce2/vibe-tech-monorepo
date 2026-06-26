import { AnimatePresence, motion } from 'framer-motion';
import { ListTodo } from 'lucide-react';
import { useEffect, useState } from 'react';
import { load } from '@tauri-apps/plugin-store';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import TodoForm from './TodoForm';
import TodoItem from './TodoItem';
import type { Todo, TodoPriority } from './types';

const STORE_NAME = 'vibetech-todos.json';
const STORE_KEY = 'todos';

const TodoList = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const categories = ['general', 'work', 'personal', 'shopping'];

  // Load todos from Tauri store on mount
  useEffect(() => {
    let cancelled = false;
    const loadTodos = async () => {
      try {
        const store = await load(STORE_NAME, { autoSave: false, defaults: {} });
        const storedTodos = await store.get<Todo[]>(STORE_KEY);
        if (!cancelled && storedTodos) {
          setTodos(storedTodos);
        }
      } catch (error) {
        console.error('Error loading todos:', error);
        toast({
          title: 'Error loading tasks',
          description: String(error),
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    void loadTodos();
    return () => {
      cancelled = true;
    };
  }, []);

  // Save todos to Tauri store whenever they change
  useEffect(() => {
    if (isLoading) return;
    const saveTodos = async () => {
      try {
        const store = await load(STORE_NAME, { autoSave: false, defaults: {} });
        await store.set(STORE_KEY, todos);
        await store.save();
      } catch (error) {
        console.error('Error saving todos:', error);
        toast({
          title: 'Error saving tasks',
          description: String(error),
          variant: 'destructive',
        });
      }
    };
    void saveTodos();
  }, [todos, isLoading]);

  const handleCreateTodo = (newTodo: {
    text: string;
    dueDate?: Date;
    category: string;
    priority: TodoPriority;
  }) => {
    const todo: Todo = {
      ...newTodo,
      completed: false,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTodos([todo, ...todos]);

    toast({
      title: 'Task Added',
      description: 'Your task has been added successfully',
    });
  };

  const handleToggleComplete = (id: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              completed: !todo.completed,
              updated_at: new Date().toISOString(),
            }
          : todo,
      ),
    );
  };

  const handleDelete = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));

    toast({
      title: 'Task Deleted',
      description: 'The task has been removed',
    });
  };

  const handleEdit = (id: string, updates: Partial<Todo>) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, ...updates, updated_at: new Date().toISOString() } : todo,
      ),
    );

    toast({
      title: 'Task Updated',
      description: 'Your task has been updated successfully',
    });
  };

  // Calculate stats
  const completedCount = todos.filter((todo) => todo.completed).length;
  const totalCount = todos.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <Card className="border-2 shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ListTodo className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl font-bold">My Tasks</CardTitle>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Completion Rate</p>
              <p className="text-2xl font-bold text-primary">{completionRate}%</p>
            </div>
          </div>
          <CardDescription>
            Keep track of your daily tasks and boost your productivity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <TodoForm onSubmit={handleCreateTodo} categories={categories} />

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center py-12">
              <ListTodo className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">
                No tasks yet. Add your first task above!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {todos.map((todo) => (
                  <motion.div
                    key={todo.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TodoItem
                      todo={todo}
                      onToggleComplete={handleToggleComplete}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          {totalCount > 0 && (
            <p>
              {completedCount} of {totalCount} tasks completed
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default TodoList;
