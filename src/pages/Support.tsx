import React, { useState, useEffect } from "react";
import { MessageSquare, CheckCircle2, Mail, Phone, MapPin, ShieldCheck, X } from "lucide-react";
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
          // Check if the reply belongs to the currently selected ticket
          if (selectedTicketRef.current && Number(selectedTicketRef.current.id) === Number(message.data.ticket_id)) {
            setReplies(prev => {
              // Avoid duplicates
              if (prev.some(r => r.id === message.data.id)) return prev;
              return [...prev, message.data];
            });
          }
          // Also refresh the ticket list to show updated status if needed
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
  }, [ticket.customer_email]); // Removed selectedTicket from dependencies to keep connection stable

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newReply) return;
    const res = await fetch(`/api/tickets/${selectedTicket.id}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender_username: ticket.customer_email || "Customer", message: newReply }),
    });
    if (res.ok) {
      setNewReply("");
      fetchReplies(selectedTicket.id);
    }
  };

  return (
    <>
      <div className="py-20 max-w-7xl mx-auto px-6 space-y-20">
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <h2 className="text-5xl font-black text-brand-primary tracking-tight">Support Center</h2>
        <p className="text-lg text-slate-500 leading-relaxed">Our logistics experts are standing by to help you with any questions about your shipments, billing, or technical issues.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        <div className="lg:col-span-2">
          <div className="card">
            {submitted ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 space-y-6">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-100">
                  <CheckCircle2 size={48} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-brand-primary">Ticket Received!</h3>
                  <p className="text-slate-500 text-lg">We've logged your request. A support specialist will contact you within 24 hours.</p>
                </div>
                <button onClick={() => setSubmitted(false)} className="btn-outline">Send Another Message</button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Email Address</label>
                    <input required type="email" className="input" placeholder="you@example.com" value={ticket.customer_email} onChange={(e) => setTicket({ ...ticket, customer_email: e.target.value })} />
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
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Detailed Message</label>
                  <textarea required className="input h-48" placeholder="How can we help you today?" value={ticket.message} onChange={(e) => setTicket({ ...ticket, message: e.target.value })} />
                </div>
                <button type="submit" className="btn-primary w-full py-5 text-xl">Submit Support Ticket</button>
              </form>
            )}
          </div>

          {ticket.customer_email && (
            <div className="card space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-brand-primary">Your Recent Tickets</h3>
                <button onClick={() => fetchTickets(ticket.customer_email)} className="text-xs font-bold text-brand-secondary hover:underline">Refresh</button>
              </div>
              <div className="space-y-4">
                {tickets.map((t) => (
                  <div key={t.id} onClick={() => { setSelectedTicket(t); fetchReplies(t.id); }} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-secondary cursor-pointer transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black text-brand-secondary uppercase tracking-widest bg-white px-2 py-1 rounded-md border border-slate-100">{t.status}</span>
                      <span className="text-[10px] text-slate-400">{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-brand-primary">{t.subject}</h4>
                  </div>
                ))}
                {tickets.length === 0 && <p className="text-center py-10 text-slate-400">No tickets found for this email.</p>}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="card space-y-8">
            <h4 className="text-xl font-black text-brand-primary">Direct Contact</h4>
            <div className="space-y-6">
              {[
                { icon: Mail, label: "Email Us", val: "DiplomaticXpressInfo@gmail.com", color: "text-blue-500" },
                { icon: Phone, label: "Whatsapp", val: "+1 (236) 952 3031", color: "text-emerald-500" },
                { icon: MapPin, label: "Visit Us", val: "345 diplomatic xpress cambrige", color: "text-brand-secondary" }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center ${item.color} border border-slate-100`}>
                    <item.icon size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                    <p className="font-bold text-brand-primary">{item.val}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card bg-brand-primary text-white space-y-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-brand-secondary" size={28} />
              <h4 className="text-xl font-black tracking-tight">Priority Support</h4>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">Enterprise customers get access to a dedicated account manager and 1-hour response times.</p>
            <button className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold transition-all">Upgrade to Enterprise</button>
          </div>
        </div>
      </div>
    </div>

      <AnimatePresence>
        {selectedTicket && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setSelectedTicket(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }} 
              className="card w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Ticket: {selectedTicket.subject}</h3>
                <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 mb-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase mb-2">Original Message</p>
                  <p className="text-sm text-slate-600">{selectedTicket.message}</p>
                </div>
                <div className="space-y-4">
                  {replies.map((r) => (
                    <div key={r.id} className={`p-4 rounded-xl border ${r.sender_username === "Admin" ? "bg-blue-50 border-blue-100 ml-8" : "bg-white border-slate-100 mr-8"}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-brand-secondary uppercase">{r.sender_username}</span>
                        <span className="text-[10px] text-slate-400">{new Date(r.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-600">{r.message}</p>
                    </div>
                  ))}
                </div>
              </div>
              <form onSubmit={handleReply} className="flex gap-4">
                <input className="input flex-1" placeholder="Type your reply..." value={newReply} onChange={(e) => setNewReply(e.target.value)} />
                <button type="submit" className="btn-primary px-8">Reply</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
