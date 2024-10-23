"use client";
import { useAuth } from "@/context/AuthContext";
import React, { useState } from "react";
import LoginPage from "../Login";
import SignupPage from "../SignUp";

export default function Home() {
  const { user ,logout } = useAuth();
  const [login, setLogin] = useState(true);
  return (
    <>
      {user ? (
        <div>
          You are logged in
          <h2 onClick={logout}>Logout</h2>
        </div>
      ) : (
        <div>
          {login ? (
            <div>
              <LoginPage />
              <h2 onClick={() => setLogin(false)}>Click Here To Signup </h2>
            </div>
          ) : (
            <div>
              <SignupPage />
              <h2 onClick={() => setLogin(true)}>Click Here To Login </h2>
            </div>
          )}
        </div>
      )}
    </>
  );
}
