import React, { useState, useEffect } from "react";
import { MessageSquare, CheckCircle2, Mail, Send, X, Image, Clock, ChevronRight, Plus, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Ticket } from "../types";

export const SupportPortal = () => {
  const [email, setEmail] = useState(() => localStorage.getItem("cs_email") || "");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const selectedTicketRef = React.useRef<Ticket | null>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newSubject, setNewSubject] = useState("General Inquiry");
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedTicketRef.current = selectedTicket;
  }, [selectedTicket]);

  useEffect(() => {
    if (email) {
      localStorage.setItem("cs_email", email);
      fetchTickets(email);
    }
  }, [email]);

  const fetchTickets = async (userEmail: string) => {
    try {
      const res = await fetch(`/api/tickets?email=${userEmail}`);
      const data = await res.json();
      setTickets(data);
    } catch {}
  };

  const fetchReplies = async (ticketId: number) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/replies`);
      const data = await res.json();
      setReplies(data);
    } catch {}
  };

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "TICKET_REPLY") {
          if (selectedTicketRef.current && Number(selectedTicketRef.current.id) === Number(message.data.ticket_id)) {
            setReplies(prev => {
              if (prev.some(r => r.id === message.data.id)) return prev;
              return [...prev, message.data];
            });
          }
          if (email) fetchTickets(email);
        }
      } catch {}
    };
    return () => { if (ws.readyState === WebSocket.OPEN) ws.close(); };
  }, [email]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [replies]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !newMessage.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_email: email, subject: newSubject, message: newMessage.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewMessage("");
        setShowNewTicket(false);
        await fetchTickets(email);
        const newRes = await fetch(`/api/tickets?email=${email}`);
        const newTickets = await newRes.json();
        const created = newTickets.find((t: Ticket) => t.id === data.id);
        if (created) {
          setSelectedTicket(created);
          fetchReplies(created.id);
        }
      }
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || (!newMessage.trim() && !replyImage)) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("sender_username", email);
      if (newMessage.trim()) formData.append("message", newMessage.trim());
      if (replyImage) formData.append("image", replyImage);
      const res = await fetch(`/api/tickets/${selectedTicket.id}/replies`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setNewMessage("");
        setReplyImage(null);
        fetchReplies(selectedTicket.id);
      }
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "open": return "bg-emerald-100 text-emerald-700";
      case "resolved": return "bg-slate-100 text-slate-500";
      default: return "bg-blue-100 text-blue-700";
    }
  };

  if (!email) {
    return (
      <div className="py-12 md:py-20 max-w-lg mx-auto px-4 md:px-6">
        <div className="card space-y-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-brand-secondary/10 rounded-2xl flex items-center justify-center mx-auto">
              <MessageSquare size={32} className="text-brand-secondary" />
            </div>
            <h2 className="text-3xl font-black text-brand-primary tracking-tight">Support Center</h2>
            <p className="text-slate-500">Enter your email to start chatting with our support team.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) setEmail(email.trim()); }} className="space-y-4">
            <input
              required
              type="email"
              className="input text-center"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className="btn-primary w-full py-4">Start Chat</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 md:py-20 max-w-4xl mx-auto px-4 md:px-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-primary tracking-tight">Support Center</h2>
          <p className="text-slate-500 text-sm mt-1">Chatting as <span className="font-bold text-brand-secondary">{email}</span></p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setEmail(""); localStorage.removeItem("cs_email"); }} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors">Change Email</button>
          <button onClick={() => setShowNewTicket(true)} className="btn-primary py-2 px-5 text-xs flex items-center gap-2">
            <Plus size={14} />
            New Ticket
          </button>
        </div>
      </div>

      {showNewTicket && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card space-y-5">
          <h3 className="text-lg font-black text-brand-primary">New Support Ticket</h3>
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Inquiry Type</label>
              <select className="input" value={newSubject} onChange={(e) => setNewSubject(e.target.value)}>
                <option>General Inquiry</option>
                <option>Tracking Issue</option>
                <option>Damaged Goods</option>
                <option>Billing Question</option>
                <option>Technical Support</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Message</label>
              <textarea
                required
                className="input min-h-[80px]"
                placeholder="How can we help you?"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowNewTicket(false); setNewMessage(""); }} className="btn-outline flex-1 py-3">Cancel</button>
              <button type="submit" disabled={sending || !newMessage.trim()} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                {sending ? <Clock className="animate-spin" size={16} /> : <Send size={16} />}
                Send
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`space-y-3 ${selectedTicket ? "hidden lg:block" : ""}`}>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-1">Your Tickets</h3>
          {tickets.length > 0 ? tickets.map((t) => (
            <div
              key={t.id}
              onClick={() => { setSelectedTicket(t); setReplyImage(null); setNewMessage(""); fetchReplies(t.id); }}
              className={`p-4 rounded-2xl border cursor-pointer transition-all group ${
                selectedTicket?.id === t.id
                  ? "bg-brand-secondary/5 border-brand-secondary/20 shadow-md"
                  : "bg-slate-50 border-slate-100 hover:border-brand-secondary/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(t.status)}`}>
                  {t.status}
                </span>
                <span className="text-[10px] text-slate-400">{new Date(t.created_at).toLocaleDateString()}</span>
              </div>
              <h4 className="font-bold text-brand-primary text-sm truncate">{t.subject}</h4>
              <p className="text-xs text-slate-400 mt-1 truncate">{t.message}</p>
            </div>
          )) : (
            <div className="text-center py-8 text-slate-400">
              <MessageSquare size={24} className="mx-auto mb-2 text-slate-200" />
              <p className="text-xs font-bold">No tickets yet</p>
            </div>
          )}
        </div>

        <div className={`lg:col-span-2 ${!selectedTicket ? "hidden lg:block" : ""}`}>
          {selectedTicket ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-lg flex flex-col h-[500px]">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => setSelectedTicket(null)} className="lg:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-all shrink-0">
                    <ArrowLeft size={16} className="text-slate-500" />
                  </button>
                  <h3 className="font-bold text-brand-primary truncate">{selectedTicket.subject}</h3>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </span>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                <div className="max-w-[80%] p-3 rounded-2xl bg-slate-50 border border-slate-100 mr-auto">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Your Message</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{selectedTicket.message}</p>
                </div>

                {replies.map((r) => (
                  <div key={r.id} className={`max-w-[80%] p-3 rounded-2xl ${
                    r.sender_username === "Admin"
                      ? "bg-brand-primary/5 border border-brand-primary/10 mr-auto"
                      : "bg-brand-secondary/10 border border-brand-secondary/10 ml-auto"
                  }`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-secondary">{r.sender_username === "Admin" ? "Support" : "You"}</span>
                      <span className="text-[10px] text-slate-400">{new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    {r.message && <p className="text-sm text-slate-700">{r.message}</p>}
                    {r.image_url && (
                      <img
                        src={r.image_url}
                        alt="Attached"
                        className="mt-2 rounded-xl border border-slate-200 max-w-full max-h-48 object-contain"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                  </div>
                ))}

                {replies.length === 0 && (
                  <div className="text-center py-8">
                    <Clock size={20} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-xs text-slate-400 font-bold">Waiting for a response...</p>
                  </div>
                )}
              </div>

              {selectedTicket.status !== "Resolved" ? (
                <div className="p-3 border-t border-slate-100 shrink-0">
                  {replyImage && (
                    <div className="flex items-center gap-3 p-2 mb-2 bg-slate-50 rounded-xl border border-slate-100">
                      <Image size={14} className="text-brand-secondary shrink-0" />
                      <span className="text-xs font-bold text-slate-500 truncate flex-1">{replyImage.name}</span>
                      <button type="button" onClick={() => setReplyImage(null)} className="text-red-400 hover:text-red-600 text-xs font-bold">X</button>
                    </div>
                  )}
                  <form onSubmit={handleSendReply} className="flex gap-2 items-center">
                    <label className="shrink-0 p-2.5 rounded-xl bg-slate-100 text-slate-400 hover:bg-brand-secondary/10 hover:text-brand-secondary cursor-pointer transition-all">
                      <Image size={18} />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => setReplyImage(e.target.files?.[0] || null)} />
                    </label>
                    <input
                      className="input flex-1 py-2.5 text-sm"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={sending || (!newMessage.trim() && !replyImage)}
                      className="btn-primary px-4 py-2.5 flex items-center gap-2 disabled:opacity-50 shrink-0"
                    >
                      {sending ? <Clock className="animate-spin" size={16} /> : <Send size={16} />}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="p-4 border-t border-slate-100 text-center shrink-0">
                  <p className="text-xs text-slate-400 font-bold">This ticket has been resolved.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center h-[500px]">
              <div className="text-center">
                <MessageSquare size={40} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 font-bold">Select a ticket or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
