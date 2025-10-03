import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { Checkbox } from "./components/ui/checkbox";
import { Textarea } from "./components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./components/ui/alert-dialog";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { 
  Search, 
  Plus, 
  LogOut, 
  User, 
  CheckSquare, 
  Square, 
  Edit3, 
  Trash2,
  Filter,
  Calendar,
  Flag,
  Tag,
  SortAsc,
  SortDesc,
  Moon,
  Sun,
  Clock,
  AlertTriangle,
  Target,
  TrendingUp,
  BarChart3,
  Settings
} from "lucide-react";
import "./App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Theme Context
const ThemeContext = createContext();

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('taskflow-theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else {
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('taskflow-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (token) => {
    try {
      const response = await axios.get(`${API}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(userData);
      toast.success(`Welcome back, ${userData.name}!`);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
      return false;
    }
  };

  const signup = async (name, email, password) => {
    try {
      const response = await axios.post(`${API}/auth/signup`, { name, email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(userData);
      toast.success(`Welcome, ${userData.name}!`);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Signup failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50 to-slate-100 dark:from-slate-900 dark:via-emerald-900 dark:to-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/auth" />;
};

// Authentication Page with Background Image
const AuthPage = () => {
  const { login, signup, user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const success = isLogin 
      ? await login(formData.email, formData.password)
      : await signup(formData.name, formData.email, formData.password);

    if (!success) {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/backgroundimage.jpg')"
        }}
      />
      
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40"></div>
      
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-10 p-3 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all duration-200"
        data-testid="theme-toggle"
      >
        {isDarkMode ? (
          <Sun className="h-5 w-5 text-white" />
        ) : (
          <Moon className="h-5 w-5 text-white" />
        )}
      </button>
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 shadow-2xl border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold text-center text-slate-800 dark:text-white">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-center text-slate-600 dark:text-slate-300">
              {isLogin ? 'Sign in to your TaskFlow Pro account' : 'Join TaskFlow Pro to manage your tasks'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="auth-form">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700 dark:text-slate-200">Name</Label>
                  <Input
                    id="name"
                    data-testid="name-input"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="border-slate-200 dark:border-slate-600 focus:border-emerald-500 dark:focus:border-emerald-400"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-200">Email</Label>
                <Input
                  id="email"
                  data-testid="email-input"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="border-slate-200 dark:border-slate-600 focus:border-emerald-500 dark:focus:border-emerald-400"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-200">Password</Label>
                <Input
                  id="password"
                  data-testid="password-input"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  className="border-slate-200 dark:border-slate-600 focus:border-emerald-500 dark:focus:border-emerald-400"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3"
                disabled={isLoading}
                data-testid="auth-submit-button"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  isLogin ? 'Sign In' : 'Sign Up'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 text-sm font-medium"
                data-testid="toggle-auth-mode"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Priority Badge Component
const PriorityBadge = ({ priority }) => {
  const colors = {
    high: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
    low: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
  };

  const icons = {
    high: <Flag className="h-3 w-3" />,
    medium: <Flag className="h-3 w-3" />,
    low: <Flag className="h-3 w-3" />
  };

  return (
    <Badge className={`${colors[priority]} flex items-center space-x-1 text-xs font-medium border`}>
      {icons[priority]}
      <span className="capitalize">{priority}</span>
    </Badge>
  );
};

// Task Management Hook
const useTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompleted, setFilterCompleted] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterCompleted !== null) params.append('completed', filterCompleted);
      if (filterCategory) params.append('category', filterCategory);
      if (filterPriority) params.append('priority', filterPriority);
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);
      
      const response = await axios.get(`${API}/tasks?${params}`);
      setTasks(response.data);
    } catch (error) {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/tasks/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/tasks/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const createTask = async (taskData) => {
    try {
      const response = await axios.post(`${API}/tasks`, taskData);
      setTasks(prev => [response.data, ...prev]);
      fetchStats();
      toast.success('Task created successfully');
      return true;
    } catch (error) {
      toast.error('Failed to create task');
      return false;
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      const response = await axios.put(`${API}/tasks/${taskId}`, updates);
      setTasks(prev => prev.map(task => 
        task.id === taskId ? response.data : task
      ));
      fetchStats();
      toast.success('Task updated successfully');
      return true;
    } catch (error) {
      toast.error('Failed to update task');
      return false;
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`${API}/tasks/${taskId}`);
      setTasks(prev => prev.filter(task => task.id !== taskId));
      fetchStats();
      toast.success('Task deleted successfully');
      return true;
    } catch (error) {
      toast.error('Failed to delete task');
      return false;
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchStats();
    fetchCategories();
  }, [searchTerm, filterCompleted, filterCategory, filterPriority, sortBy, sortOrder]);

  return {
    tasks,
    stats,
    categories,
    loading,
    searchTerm,
    setSearchTerm,
    filterCompleted,
    setFilterCompleted,
    filterCategory,
    setFilterCategory,
    filterPriority,
    setFilterPriority,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    createTask,
    updateTask,
    deleteTask,
    refetch: fetchTasks
  };
};

// Enhanced Task Form Component
const TaskForm = ({ onSubmit, initialData = null, onCancel, categories = [] }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    due_date: initialData?.due_date || '',
    priority: initialData?.priority || 'medium',
    category: initialData?.category || 'General',
    completed: initialData?.completed || false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      due_date: formData.due_date ? formData.due_date : null
    };
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="task-form">
      <div className="space-y-2">
        <Label htmlFor="task-title">Title</Label>
        <Input
          id="task-title"
          data-testid="task-title-input"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Enter task title..."
          required
          className="border-slate-200 dark:border-slate-600 focus:border-emerald-500"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="task-description">Description</Label>
        <Textarea
          id="task-description"
          data-testid="task-description-input"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter task description..."
          rows={3}
          className="border-slate-200 dark:border-slate-600 focus:border-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="task-due-date">Due Date</Label>
          <Input
            id="task-due-date"
            data-testid="task-due-date-input"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
            className="border-slate-200 dark:border-slate-600 focus:border-emerald-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-priority">Priority</Label>
          <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
            <SelectTrigger data-testid="task-priority-select">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-category">Category</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
          <SelectTrigger data-testid="task-category-select">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {initialData && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="task-completed"
            data-testid="task-completed-checkbox"
            checked={formData.completed}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, completed: checked }))}
          />
          <Label htmlFor="task-completed">Mark as completed</Label>
        </div>
      )}
      
      <div className="flex space-x-2">
        <Button 
          type="submit" 
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          data-testid="task-form-submit"
        >
          {initialData ? 'Update Task' : 'Create Task'}
        </Button>
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            data-testid="task-form-cancel"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};

// Enhanced Task Item Component
const TaskItem = ({ task, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleToggleComplete = () => {
    onUpdate(task.id, { completed: !task.completed });
  };

  const handleEdit = (formData) => {
    onUpdate(task.id, formData);
    setIsEditing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = task.is_overdue && !task.completed;

  if (isEditing) {
    return (
      <Card className="p-6 dark:bg-slate-800 dark:border-slate-700">
        <TaskForm 
          initialData={task}
          onSubmit={handleEdit}
          onCancel={() => setIsEditing(false)}
          categories={['General', 'Work', 'Personal', 'Health', 'Learning', 'Shopping']}
        />
      </Card>
    );
  }

  return (
    <Card className={`p-4 hover:shadow-md transition-all duration-200 dark:bg-slate-800 dark:border-slate-700 ${
      isOverdue ? 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/20' : ''
    }`} data-testid={`task-item-${task.id}`}>
      <div className="flex items-start space-x-3">
        <button
          onClick={handleToggleComplete}
          className="mt-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          data-testid={`task-toggle-${task.id}`}
        >
          {task.completed ? (
            <CheckSquare className="h-5 w-5" />
          ) : (
            <Square className="h-5 w-5" />
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h3 className={`font-medium ${task.completed ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
              {task.title}
              {isOverdue && (
                <AlertTriangle className="inline ml-2 h-4 w-4 text-red-500" />
              )}
            </h3>
            <div className="flex space-x-2 ml-4">
              <button
                onClick={() => setIsEditing(true)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                data-testid={`task-edit-${task.id}`}
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="text-slate-400 hover:text-red-600"
                    data-testid={`task-delete-${task.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="dark:bg-slate-800">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Task</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this task? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(task.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          
          {task.description && (
            <p className={`text-sm mt-1 ${task.completed ? 'line-through text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
              {task.description}
            </p>
          )}
          
          <div className="flex items-center space-x-3 mt-3">
            <Badge variant={task.completed ? "secondary" : "default"} className="text-xs">
              {task.completed ? 'Completed' : 'Pending'}
            </Badge>
            
            <PriorityBadge priority={task.priority} />
            
            <Badge variant="outline" className="text-xs dark:border-slate-600">
              <Tag className="h-3 w-3 mr-1" />
              {task.category}
            </Badge>
            
            {task.due_date && (
              <Badge variant="outline" className={`text-xs ${isOverdue ? 'border-red-500 text-red-600' : 'dark:border-slate-600'}`}>
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(task.due_date)}
              </Badge>
            )}
            
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatDate(task.created_at)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Enhanced Dashboard Page
const Dashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const {
    tasks,
    stats,
    categories,
    loading,
    searchTerm,
    setSearchTerm,
    filterCompleted,
    setFilterCompleted,
    filterCategory,
    setFilterCategory,
    filterPriority,
    setFilterPriority,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    createTask,
    updateTask,
    deleteTask
  } = useTasks();
  
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateTask = async (formData) => {
    const success = await createTask(formData);
    if (success) {
      setShowCreateForm(false);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterCompleted(null);
    setFilterCategory('');
    setFilterPriority('');
    setSortBy('created_at');
    setSortOrder('desc');
  };

  const activeFiltersCount = [
    searchTerm,
    filterCategory,
    filterPriority,
    filterCompleted !== null ? 'status' : null
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-slate-100 dark:from-slate-900 dark:via-emerald-950 dark:to-slate-900" data-testid="dashboard">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md dark:bg-slate-900/80 shadow-sm border-b dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <CheckSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">TaskFlow Pro</h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">Advanced Task Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                data-testid="theme-toggle-header"
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                ) : (
                  <Moon className="h-5 w-5 text-slate-600" />
                )}
              </button>
              
              <div className="flex items-center space-x-2" data-testid="user-profile">
                <User className="h-5 w-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{user.name}</span>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={logout}
                data-testid="logout-button"
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 border-emerald-200 dark:border-emerald-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Total</p>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{stats.total || 0}</p>
              </div>
              <BarChart3 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Completed</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.completed || 0}</p>
              </div>
              <CheckSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-orange-200 dark:border-orange-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Pending</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.pending || 0}</p>
              </div>
              <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Overdue</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.overdue || 0}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">High Priority</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.high_priority || 0}</p>
              </div>
              <Flag className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </Card>
        </div>

        {/* Enhanced Controls */}
        <Card className="p-6 mb-6 dark:bg-slate-800 dark:border-slate-700">
          <div className="flex flex-col space-y-4">
            {/* Search and Create */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search tasks by title, description, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 dark:border-slate-600"
                  data-testid="search-input"
                />
              </div>
              
              <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap"
                    data-testid="create-task-button"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl dark:bg-slate-800">
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                  </DialogHeader>
                  <TaskForm 
                    onSubmit={handleCreateTask}
                    categories={categories}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              {/* Status Filter */}
              <Tabs value={filterCompleted?.toString() || 'all'} onValueChange={(value) => 
                setFilterCompleted(value === 'all' ? null : value === 'true')
              }>
                <TabsList data-testid="filter-tabs" className="dark:bg-slate-700">
                  <TabsTrigger value="all">All ({stats.total || 0})</TabsTrigger>
                  <TabsTrigger value="false">Pending ({stats.pending || 0})</TabsTrigger>
                  <TabsTrigger value="true">Completed ({stats.completed || 0})</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Category Filter */}
              <Select value={filterCategory || "all"} onValueChange={(value) => setFilterCategory(value === "all" ? "" : value)}>
                <SelectTrigger className="w-[140px] dark:border-slate-600" data-testid="category-filter">
                  <Tag className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select value={filterPriority || "all"} onValueChange={(value) => setFilterPriority(value === "all" ? "" : value)}>
                <SelectTrigger className="w-[130px] dark:border-slate-600" data-testid="priority-filter">
                  <Flag className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Options */}
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}>
                <SelectTrigger className="w-[160px] dark:border-slate-600" data-testid="sort-select">
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4 mr-2" /> : <SortDesc className="h-4 w-4 mr-2" />}
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at-desc">Newest First</SelectItem>
                  <SelectItem value="created_at-asc">Oldest First</SelectItem>
                  <SelectItem value="title-asc">Title A-Z</SelectItem>
                  <SelectItem value="title-desc">Title Z-A</SelectItem>
                  <SelectItem value="due_date-asc">Due Date (Soon)</SelectItem>
                  <SelectItem value="due_date-desc">Due Date (Late)</SelectItem>
                  <SelectItem value="priority-desc">High Priority</SelectItem>
                  <SelectItem value="priority-asc">Low Priority</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-slate-600 dark:text-slate-300"
                  data-testid="clear-filters"
                >
                  Clear Filters ({activeFiltersCount})
                </Button>
              )}
            </div>

            {/* Results Counter */}
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Showing {tasks.length} of {stats.total || 0} tasks
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
          </div>
        </Card>

        {/* Tasks List */}
        <div className="space-y-4" data-testid="tasks-list">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : tasks.length === 0 ? (
            <Card className="p-12 text-center dark:bg-slate-800 dark:border-slate-700">
              <Target className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No tasks found</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {searchTerm || filterCategory || filterPriority || filterCompleted !== null
                  ? 'Try adjusting your search or filter criteria' 
                  : 'Create your first task to get started with TaskFlow Pro'}
              </p>
              {!searchTerm && !filterCategory && !filterPriority && filterCompleted === null && (
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Task
                </Button>
              )}
            </Card>
          ) : (
            tasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onUpdate={updateTask}
                onDelete={deleteTask}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Toaster position="top-right" />
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </div>
  );
}

export default App;