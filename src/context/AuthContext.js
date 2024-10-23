// app/context/AuthContext.js
"use client";

import { createContext, useContext, useState, useEffect } from "react";
import client from "../lib/apolloClient";
import { gql } from "@apollo/client";
import { useRouter } from "next/navigation";

// Create the AuthContext
const AuthContext = createContext();

// Define the GraphQL mutations for login and signup
const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      name
      id
    }
  }
`;

const SIGNUP_MUTATION = gql`
  mutation Register($name: String!, $email: String!, $password: String!, $phoneNumber: String!) {
    register(name: $name, email: $email, password: $password, phoneNumber: $phoneNumber) {
      id
      email
      name
      phoneNumber
      token
    }
  }
`;

// AuthProvider component to wrap the app with authentication context
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const router = useRouter();

  // On app initialization, check if a token exists in localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setUser({ token });
    }
  }, []);

  // Handle login mutation
  const login = async (email, password) => {
    console.log("Login initiated with:", { email, password });
    try {
      const { data } = await client.mutate({
        mutation: LOGIN_MUTATION,
        variables: { email, password },
      });

      if (data.login && data.login.token) {
        const token = data.login.token;
        setUser({ token });
        localStorage.setItem("token", token); // Persist the token in localStorage
        router.push("/"); // Redirect after successful login
      } else {
        console.error("No token returned");
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  // Handle signup mutation
  const signup = async (name, email, password, phoneNumber) => {
    console.log("Signup initiated with:", { name, email, password, phoneNumber });
    try {
      const { data } = await client.mutate({
        mutation: SIGNUP_MUTATION,
        variables: { name, email, password, phoneNumber },
      });
  
      if (data.register && data.register.token) {
        const token = data.register.token;
        setUser({ token });
        localStorage.setItem("token", token); // Persist the token in localStorage
      } else {
        console.error("No token returned");
      }
    } catch (error) {
      console.error("Signup error:", error);
    }
  };

  // Handle logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem("token"); // Remove the token from localStorage
    router.push("/"); // Redirect to login page after logout
  };

  // The AuthContext provider that wraps the children components
  return <AuthContext.Provider value={{ user, login, signup, logout }}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useAuth = () => useContext(AuthContext);
