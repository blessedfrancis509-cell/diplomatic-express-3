import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";
import { AdminDashboard } from "./pages/Admin";
import { TrackingPortal } from "./pages/Tracking";
import { SupportPortal } from "./pages/Support";
import { Reviews } from "./pages/Reviews";
import { SplashScreen } from "./components/SplashScreen";
import { SupportChat } from "./components/SupportChat";
import { Auth } from "./pages/Auth";
import { ClientDashboard } from "./pages/ClientDashboard";
import { Flights } from "./pages/Flights";
import { News } from "./pages/News";

import { User } from "./types";

import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("logistics_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("logistics_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("logistics_user");
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  if (showSplash) return <SplashScreen />;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-brand-bg flex flex-col">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
        
        <main className="flex-1 pt-24 md:pt-28">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {activeTab === "home" && <Home onSupportClick={() => setActiveTab("support")} />}
              {activeTab === "tracking" && <TrackingPortal user={user} setActiveTab={setActiveTab} />}
              {activeTab === "support" && <SupportPortal />}
              {activeTab === "flights" && <Flights user={user} setActiveTab={setActiveTab} />}
              {activeTab === "reviews" && <Reviews />}
              {activeTab === "news" && <News />}
              {(activeTab === "dashboard" || activeTab === "auth") && (
                user ? (
                  user.role === 'admin' ? (
                    <AdminDashboard user={user} onLogout={() => setUser(null)} />
                  ) : (
                    <ClientDashboard user={user} onLogout={() => setUser(null)} setActiveTab={setActiveTab} />
                  )
                ) : (
                  <Auth onLogin={(u) => { setUser(u); setActiveTab("dashboard"); }} />
                )
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <Footer />

        <SupportChat setActiveTab={setActiveTab} />
      </div>
    </ErrorBoundary>
  );
}
