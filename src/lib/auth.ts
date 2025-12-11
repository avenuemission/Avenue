// ============================================
// SIMPLE AUTH SYSTEM
// Uses localStorage for session management
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
}

interface StoredUser {
  id: string;
  email: string;
  password: string;
  name: string;
}

const AUTH_STORAGE_KEY = "avenue_auth_session";
const USERS_STORAGE_KEY = "avenue_users";

// Default users (seeded on first load)
const DEFAULT_USERS: StoredUser[] = [
  {
    id: "1",
    email: "info@avenuemission.com",
    password: "avenue",
    name: "Avenue Admin",
  },
];

// Initialize users in localStorage if not present
const initializeUsers = (): void => {
  if (typeof window === "undefined") return;
  
  const existingUsers = localStorage.getItem(USERS_STORAGE_KEY);
  if (!existingUsers) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
  }
};

// Get all users
const getUsers = (): StoredUser[] => {
  if (typeof window === "undefined") return DEFAULT_USERS;
  
  initializeUsers();
  const users = localStorage.getItem(USERS_STORAGE_KEY);
  return users ? JSON.parse(users) : DEFAULT_USERS;
};

// Login function
export const login = (email: string, password: string): User | null => {
  const users = getUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (user) {
    const sessionUser: User = {
      id: user.id,
      email: user.email,
      name: user.name,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
    }
    return sessionUser;
  }

  return null;
};

// Signup function
export const signup = (email: string, password: string, name: string): User | null => {
  const users = getUsers();
  
  // Check if email already exists
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return null;
  }

  const newUser: StoredUser = {
    id: Date.now().toString(),
    email,
    password,
    name,
  };

  users.push(newUser);
  if (typeof window !== "undefined") {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  // Auto-login after signup
  return login(email, password);
};

// Logout function
export const logout = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") return null;
  
  const session = localStorage.getItem(AUTH_STORAGE_KEY);
  return session ? JSON.parse(session) : null;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};
