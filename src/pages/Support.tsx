import React, { useState, useEffect } from "react";
import { MessageSquare, CheckCircle2, Mail, Send, X, Camera, Image, Clock, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Ticket } from "../types";

export const SupportPortal = () => {
  const [ticket, setTicket] = useState({ customer_email: "", subject: "General Inquiry", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const selectedTicketRef = React.useRef<Ticket | null>(null);

  useEffect(() => {
    selectedTicketRef.current = selectedTicket;
  }, [selectedTicket]);
  const [replies, setReplies] = useState<any[]>([]);
  const [newReply, setNewReply] = useState("");
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const fetchTickets = async (email: string) => {
    const res = await fetch(`/api/tickets?email=${email}`);
    const data = await res.json();
    setTickets(data);
  };

  const fetchReplies = async (ticketId: number) => {
    const res = await fetch(`/api/tickets/${ticketId}/replies`);
    const data = await res.json();
    setReplies(data);
  };

  useEffect(() => {
    if (ticket.customer_email) {
      fetchTickets(ticket.customer_email);
    }

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
          if (ticket.customer_email) {
            fetchTickets(ticket.customer_email);
          }
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [ticket.customer_email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket.customer_email || !ticket.message) return;
    setSending(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticket),
      });
      if (res.ok) {
        setSubmitted(true);
        fetchTickets(ticket.customer_email);
        setTicket({ ...ticket, message: "" });
        setTimeout(() => setSubmitted(false), 5000);
      }
    } finally {
      setSending(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || (!newReply && !replyImage)) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("sender_username", ticket.customer_email || "Customer");
      if (newReply) formData.append("message", newReply);
      if (replyImage) formData.append("image", replyImage);
      const res = await fetch(`/api/tickets/${selectedTicket.id}/replies`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setNewReply("");
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
      case "pending": return "bg-amber-100 text-amber-700";
      default: return "bg-blue-100 text-blue-700";
    }
  };

  return (
    <div className="py-12 md:py-20 max-w-4xl mx-auto px-4 md:px-6 space-y-8 md:space-y-12">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-brand-secondary/10 rounded-2xl flex items-center justify-center mx-auto">
          <MessageSquare size={32} className="text-brand-secondary" />
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-brand-primary tracking-tight">Support Center</h2>
        <p className="text-base md:text-lg text-slate-500">Submit a ticket and our team will get back to you promptly.</p>
      </div>

      <div className="card">
        {submitted ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-100">
              <CheckCircle2 size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-brand-primary">Ticket Received!</h3>
              <p className="text-slate-500">We've logged your request. Our team will respond via email within 24 hours.</p>
            </div>
            <button onClick={() => setSubmitted(false)} className="btn-outline py-3 px-8">Send Another Message</button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Your Email</label>
              <input
                required
                type="email"
                className="input"
                placeholder="you@example.com"
                value={ticket.customer_email}
                onChange={(e) => setTicket({ ...ticket, customer_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Inquiry Type</label>
              <select className="input" value={ticket.subject} onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}>
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
                className="input min-h-[120px]"
                placeholder="Describe your issue or question..."
                value={ticket.message}
                onChange={(e) => setTicket({ ...ticket, message: e.target.value })}
              />
            </div>
            <button type="submit" disabled={sending} className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50">
              {sending ? <Clock className="animate-spin" size={18} /> : <Send size={18} />}
              {sending ? "Sending..." : "Submit Ticket"}
            </button>
          </form>
        )}
      </div>

      {ticket.customer_email && (
        <div className="card space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-brand-primary tracking-tight flex items-center gap-2">
              <Mail size={20} className="text-brand-secondary" />
              Your Tickets
            </h3>
            <button onClick={() => fetchTickets(ticket.customer_email)} className="text-xs font-bold text-brand-secondary hover:underline">Refresh</button>
          </div>
          <div className="space-y-3">
            {tickets.length > 0 ? tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => { setSelectedTicket(t); setReplyImage(null); fetchReplies(t.id); }}
                className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-secondary cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(t.status)}`}>
                        {t.status}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-brand-primary truncate">{t.subject}</h4>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-secondary transition-colors shrink-0" />
                </div>
              </div>
            )) : (
              <div className="text-center py-12 text-slate-400">
                <MessageSquare size={32} className="mx-auto mb-3 text-slate-200" />
                <p className="font-bold">No tickets yet</p>
                <p className="text-sm mt-1">Submit a ticket above to get started</p>
              </div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedTicket && (
          <div
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-end md:items-center justify-center z-[60]"
            onClick={() => setSelectedTicket(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-white w-full md:max-w-2xl md:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-brand-primary tracking-tight truncate">{selectedTicket.subject}</h3>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </span>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors shrink-0">
                  <X size={22} className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Your Original Message</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{selectedTicket.message}</p>
                </div>

                {replies.length > 0 && replies.map((r) => (
                  <div key={r.id} className={`max-w-[85%] p-4 rounded-2xl ${
                    r.sender_username === "Admin"
                      ? "bg-brand-primary/5 border border-brand-primary/10 mr-auto"
                      : "bg-brand-secondary/10 border border-brand-secondary/10 ml-auto"
                  }`}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-secondary">{r.sender_username}</span>
                      <span className="text-[10px] text-slate-400">{new Date(r.timestamp).toLocaleString()}</span>
                    </div>
                    {r.message && <p className="text-sm text-slate-700 leading-relaxed">{r.message}</p>}
                    {r.image_url && (
                      <div className="mt-3">
                        <img
                          src={r.image_url}
                          alt="Attached image"
                          className="rounded-xl border border-slate-200 max-w-full max-h-64 object-contain shadow-sm"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {replies.length === 0 && (
                  <div className="text-center py-8">
                    <Clock size={24} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-sm text-slate-400 font-bold">Waiting for a response from our team...</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 shrink-0">
                {replyImage && (
                  <div className="flex items-center gap-3 p-3 mb-3 bg-slate-50 rounded-xl border border-slate-100">
                    <Image size={16} className="text-brand-secondary shrink-0" />
                    <span className="text-xs font-bold text-slate-500 truncate flex-1">{replyImage.name}</span>
                    <button type="button" onClick={() => setReplyImage(null)} className="text-red-400 hover:text-red-600 text-xs font-bold">Remove</button>
                  </div>
                )}
                <form onSubmit={handleReply} className="flex gap-3 items-center">
                  <label className="shrink-0 p-3 rounded-xl bg-slate-100 text-slate-400 hover:bg-brand-secondary/10 hover:text-brand-secondary cursor-pointer transition-all">
                    <Image size={20} />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setReplyImage(e.target.files?.[0] || null)} />
                  </label>
                  <input
                    className="input flex-1 py-3"
                    placeholder="Type a reply..."
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={sending || (!newReply && !replyImage)}
                    className="btn-primary px-5 py-3 flex items-center gap-2 disabled:opacity-50 shrink-0"
                  >
                    {sending ? <Clock className="animate-spin" size={16} /> : <Send size={16} />}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
