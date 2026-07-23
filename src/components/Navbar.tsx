import React, { useEffect } from "react";
import { Menu, X } from "lucide-react";
import { motion } from "motion/react";
import { Logo } from "./Logo";
import { LanguageSelector, MAJOR_LANGUAGES } from "./LanguageSelector";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: { username: string; role: string } | null;
}

export const Navbar = ({ activeTab, setActiveTab, user }: NavbarProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const navItems = [
    { id: "home", label: "Home" },
    { id: "tracking", label: "Track Shipment" },
    { id: "flights", label: "Flights" },
    { id: "news", label: "News" },
    { id: "reviews", label: "Reviews" },
    { id: "support", label: "Support" },
  ];

  if (user?.role === "admin") {
    navItems.push({ id: "dashboard", label: "Admin" });
  } else {
    navItems.push({ id: "dashboard", label: user ? "My Account" : "Login" });
  }

  useEffect(() => {
    const addGoogleTranslate = () => {
      if (document.getElementById("google-translate-script")) return;

      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.type = "text/javascript";
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);

      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          { 
            pageLanguage: "en", 
            includedLanguages: MAJOR_LANGUAGES.map(l => l.code).join(","),
            autoDisplay: false
          },
          "google_translate_element"
        );
      };
    };

    addGoogleTranslate();
  }, []);

  return (
    <>
      {/* Top Utility Bar */}
      <div className="fixed top-0 left-0 w-full bg-slate-900 z-[60] h-10 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest overflow-hidden">
          <span className="truncate">Global Diplomatic Network</span>
          <span className="hidden sm:inline w-1.5 h-1.5 bg-brand-secondary rounded-full animate-pulse"></span>
          <span className="hidden sm:inline">24/7 Secure Logistics</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSelector />
          <div id="google_translate_element"></div>
        </div>
      </div>

      <nav className="fixed top-10 left-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="cursor-pointer shrink-0" onClick={() => setActiveTab("home")}>
            <Logo />
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-link ${activeTab === item.id ? "nav-link-active" : ""}`}
              >
                {item.label}
              </button>
            ))}
            <button 
              onClick={() => setActiveTab("support")}
              className="btn-primary"
            >
              Support
            </button>
          </div>

          {/* Mobile Toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <button 
              onClick={() => setActiveTab("support")}
              className="btn-primary py-2 px-3 text-[10px] sm:text-xs"
            >
              Support
            </button>
            <button className="text-brand-primary p-1" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden bg-white border-b border-slate-100 p-6 space-y-4 shadow-xl"
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className="block w-full text-left text-lg font-semibold text-slate-600 hover:text-brand-secondary"
              >
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </nav>
    </>
  );
};
