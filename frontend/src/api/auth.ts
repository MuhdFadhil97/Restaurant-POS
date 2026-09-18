import { apiClient } from "./client";
import { AuthUser } from "@/store/authStore";

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/login", { identifier, password });
  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/auth/me");
  return data;
}
