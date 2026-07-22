import React, { useState } from "react";
import { MessageCircle, X, Send, Mail, Phone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SupportChatProps {
  setActiveTab: (tab: string) => void;
}

export const SupportChat = ({ setActiveTab }: SupportChatProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const whatsappNumber = "+12369523031";
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;

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
              <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-2xl border border-emerald-100 transition-all group"
              >
                <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-brand-primary">Chat on WhatsApp</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Instant Response</p>
                </div>
              </a>

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
