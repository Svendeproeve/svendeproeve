"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { authApi, SignupData, SigninData } from "@/lib/api";

interface User {
  id: string;
  email: string;
  full_name?: string;
  is_superuser?: boolean;
  created_at: string;
}

export function useAuth() {
  const router = useRouter();

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token");
  };

  const validateUser = async (): Promise<User | null> => {
    const token = getToken();
    if (!token) return null;

    try {
      const user = await authApi.getMe(token);
      localStorage.setItem("auth_user", JSON.stringify(user));
      return user;
    } catch (error) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      return null;
    }
  };

  const {
    data: user,
    mutate,
    isLoading,
  } = useSWR<User | null>("auth_user", validateUser, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    shouldRetryOnError: false,
  });

  const signup = async (data: SignupData) => {
    try {
      const response = await authApi.signup(data);

      localStorage.setItem("auth_token", response.access_token);
      localStorage.setItem("auth_user", JSON.stringify(response.user));

      await mutate(response.user, false);

      return response;
    } catch (error) {
      throw error;
    }
  };

  const signin = async (data: SigninData) => {
    try {
      const response = await authApi.signin(data);

      localStorage.setItem("auth_token", response.access_token);
      localStorage.setItem("auth_user", JSON.stringify(response.user));

      await mutate(response.user, false);

      return response;
    } catch (error) {
      throw error;
    }
  };

  const signout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");

    mutate(null, false);

    router.push("/login");
  };

  return {
    user,
    token: getToken(),
    isLoading,
    isAuthenticated: !!user,
    signup,
    signin,
    signout,
  };
}
