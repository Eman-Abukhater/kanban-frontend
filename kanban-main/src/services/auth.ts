import http from "@/lib/http";

const TOKEN_KEY = "token";
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// If you have a normal email/password login route:
export async function login(email: string, password: string) {
  const { data } = await http.post("/auth/login", { email, password });
  if (data?.token) setToken(data.token);
  return data;
}

// Your existing authuser flow (returns token or user info depending on backend)
export async function authUserByIds(fkpoid: number | null, userid: number | null) {
  const { data } = await http.get(`/ProjKanbanBoards/authuser`, {
    params: { fkpoid, userid },
  });
  if (data?.token) setToken(data.token);
  return data;
}
