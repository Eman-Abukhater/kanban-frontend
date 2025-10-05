// kanban-main/src/services/auth.ts
import axios from "axios";

const API = "https://kanban-backend-final.onrender.com/api";
const TOKEN_KEY = "token";

export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function login(email: string, password: string) {
  // ✅ correct endpoint: /api/auth/login (NOT /ProjKanbanBoards/auth/login)
  const res = await axios.post(`${API}/auth/login`, { email, password });
  const token = res?.data?.data?.token ?? res?.data?.token ?? null;
  if (token) setToken(token);
  return res.data;
}
