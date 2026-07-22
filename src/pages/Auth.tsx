import React, { useState } from "react";
import { motion } from "motion/react";
import { Lock, User as UserIcon, ArrowRight, Truck, Globe } from "lucide-react";
import { User } from "../types";

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth = ({ onLogin }: AuthProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, role: 'user' }),
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (res.ok) {
          // Auto-login for both login and signup
          onLogin(data);
        } else {
          setError(data.error || "An error occurred");
        }
      } else {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        setError(`Server error: Received unexpected response format. Status: ${res.status}`);
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(`Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] pt-32 pb-20 md:py-48 flex items-start md:items-center justify-center px-4 md:px-6 bg-slate-50/50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card w-full max-w-md space-y-8 p-8 md:p-10 shadow-2xl shadow-brand-primary/5 border-slate-100"
      >
        <div className="text-center space-y-4">
          <div className="bg-linear-to-br from-brand-secondary to-rose-400 p-5 rounded-2xl inline-block mb-4 shadow-xl shadow-brand-secondary/20">
            <Truck className="text-white" size={36} />
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-brand-primary tracking-tight">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              {isLogin ? "Access your Diplomatic Xpress account" : "Join our global logistics network"}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Email Address</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-3 border-r border-slate-200 pr-3">
                  <Globe className="text-slate-400 group-focus-within:text-brand-secondary transition-colors" size={20} />
                </div>
                <input
                  required
                  type="email"
                  className="input pl-16"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{isLogin ? "Username or Email" : "Username"}</label>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-3 border-r border-slate-200 pr-3">
                <UserIcon className="text-slate-400 group-focus-within:text-brand-secondary transition-colors" size={20} />
              </div>
              <input
                required
                className="input pl-16"
                placeholder={isLogin ? "username or email" : "username"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Password</label>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-3 border-r border-slate-200 pr-3">
                <Lock className="text-slate-400 group-focus-within:text-brand-secondary transition-colors" size={20} />
              </div>
              <input
                required
                type="password"
                className="input pl-16"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isLogin ? "Login" : "Sign Up"}
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-bold text-brand-secondary hover:underline"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
