import React, { useState } from "react";
import { MessageCircle, X, Send, Mail, Phone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SupportChatProps {
  setActiveTab: (tab: string) => void;
}

export const SupportChat = ({ setActiveTab }: SupportChatProps) => {
  const [isOpen, setIsOpen] = useState(false);


  return (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 right-0 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-brand-primary p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xl font-black tracking-tight">Support Center</h4>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Online & Ready to Help</p>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="p-4 space-y-3">
              <button
                onClick={() => {
                  setActiveTab("support");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all group text-left"
              >
                <div className="w-10 h-10 bg-brand-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                  <Send size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-brand-primary">Submit a Ticket</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">24h Response Time</p>
                </div>
              </button>

              <a 
                href="mailto:DiplomaticXpressInfo@gmail.com"
                className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all group"
              >
                <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Mail size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-brand-primary">Email Support</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Official Inquiry</p>
                </div>
              </a>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
                Available 24/7 for your logistics needs
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-95 ${
          isOpen ? "bg-white text-brand-primary rotate-90" : "bg-brand-secondary text-white"
        }`}
      >
        {isOpen ? <X size={32} /> : <MessageCircle size={32} />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full animate-pulse"></span>
        )}
      </button>
    </div>
  );
};
