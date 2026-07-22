import React, { useState, useEffect } from "react";
import { User as UserIcon, Package, FileText, LogOut, ChevronRight, MapPin, Download, Plane } from "lucide-react";
import { motion } from "motion/react";
import { User, Shipment } from "../types";

interface ClientDashboardProps {
  user: User;
  onLogout: () => void;
  setActiveTab: (tab: string) => void;
}

export const ClientDashboard = ({ user, onLogout, setActiveTab }: ClientDashboardProps) => {
  const [myShipments, setMyShipments] = useState<Shipment[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyData();
  }, []);

  const fetchMyData = async () => {
    setLoading(true);
    try {
      const [shipRes, bookRes] = await Promise.all([
        fetch("/api/shipments"),
        fetch(`/api/my-bookings/${user.id}`)
      ]);

      if (shipRes.ok) {
        const allShipments: Shipment[] = await shipRes.json();
        setMyShipments(allShipments.filter(s => s.claimed_by === user.username));
      }

      if (bookRes.ok) {
        const bookings = await bookRes.json();
        setMyBookings(bookings);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 md:py-20 max-w-7xl mx-auto px-4 md:px-6 space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-brand-secondary to-brand-accent flex items-center justify-center text-white shadow-xl">
            <UserIcon size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-brand-primary tracking-tight uppercase">My Account</h2>
            <p className="text-slate-500 font-medium">Welcome back, <span className="text-brand-secondary">{user.username}</span></p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="btn-outline flex items-center gap-2 py-3 px-6 text-red-500 hover:bg-red-50 border-red-100"
        >
          <LogOut size={18} />
          Logout
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card space-y-6">
            <h3 className="text-xl font-black text-brand-primary tracking-tight flex items-center gap-2">
              <FileText size={20} className="text-brand-secondary" />
              Profile Details
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Username</p>
                <p className="font-bold text-brand-primary">{user.username}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                <p className="font-bold text-brand-primary">{user.email || "Not provided"}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Type</p>
                <p className="font-bold text-brand-secondary uppercase text-xs tracking-widest">{user.role}</p>
              </div>
            </div>
          </div>

          <div className="bg-brand-primary rounded-3xl p-8 text-white space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-secondary/20 blur-3xl rounded-full -mr-16 -mt-16" />
            <h4 className="text-lg font-bold relative z-10">Need Assistance?</h4>
            <p className="text-white/70 text-sm relative z-10">Our support team is available 24/7 to help you with your shipments.</p>
            <button 
              onClick={() => setActiveTab("support")}
              className="w-full py-3 bg-white text-brand-primary rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors relative z-10"
            >
              Contact Support
            </button>
          </div>
        </div>

        {/* My Shipments & Bookings */}
        <div className="lg:col-span-2 space-y-8">
          {/* Shipments Section */}
          <div className="card">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-brand-primary tracking-tight flex items-center gap-2">
                <Package size={24} className="text-brand-secondary" />
                My Claimed Shipments
              </h3>
              <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">
                {myShipments.length} Total
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="w-10 h-10 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : myShipments.length > 0 ? (
              <div className="space-y-4">
                {myShipments.map((shipment) => (
                  <motion.div 
                    key={shipment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-secondary transition-all group"
                  >
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-brand-secondary font-mono bg-white px-3 py-1 rounded-lg border border-slate-200">
                            {shipment.id}
                          </span>
                          <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                            shipment.status === 'Delivered' ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-secondary/10 text-brand-secondary'
                          }`}>
                            {shipment.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Origin</p>
                            <p className="text-sm font-bold text-brand-primary flex items-center gap-1">
                              <MapPin size={14} className="text-slate-300" />
                              {shipment.origin}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Destination</p>
                            <p className="text-sm font-bold text-brand-primary flex items-center gap-1">
                              <MapPin size={14} className="text-brand-secondary" />
                              {shipment.destination}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end gap-3 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
                        <button 
                          onClick={() => setActiveTab("tracking")}
                          className="text-brand-secondary font-bold text-sm flex items-center gap-1 hover:underline"
                        >
                          View Details
                          <ChevronRight size={16} />
                        </button>
                        {shipment.status === "Delivered" ? (
                          <button 
                            onClick={() => setActiveTab("tracking")}
                            className="btn-outline py-2 px-4 text-xs flex items-center gap-2"
                          >
                            <Download size={14} />
                            Receipt
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-bold italic">Receipt after delivery</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                <p className="text-slate-400 font-bold">No shipments claimed yet</p>
                <button onClick={() => setActiveTab("tracking")} className="btn-primary py-2 px-6 text-xs">Track a Shipment</button>
              </div>
            )}
          </div>

          {/* Flight Bookings Section */}
          <div className="card">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-brand-primary tracking-tight flex items-center gap-2">
                <Plane size={24} className="text-brand-secondary" />
                My Flight Bookings
              </h3>
              <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">
                {myBookings.length} Total
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="w-10 h-10 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : myBookings.length > 0 ? (
              <div className="space-y-4">
                {myBookings.map((booking) => (
                  <motion.div 
                    key={booking.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-secondary transition-all group"
                  >
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-brand-secondary uppercase tracking-widest bg-white px-3 py-1 rounded-lg border border-slate-200">
                            {booking.flight_number}
                          </span>
                          {booking.cabin_class && (
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                              booking.cabin_class === "private_jet" ? "bg-purple-100 text-purple-700" :
                              booking.cabin_class === "first_class" ? "bg-amber-100 text-amber-700" :
                              "bg-blue-100 text-blue-700"
                            }`}>
                              {booking.cabin_class === "private_jet" ? "Private Jet" : booking.cabin_class === "first_class" ? "First Class" : "Economy"}
                            </span>
                          )}
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-md text-[10px] font-black uppercase tracking-widest">
                            {booking.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Passenger</p>
                            <p className="text-sm font-bold text-brand-primary">{booking.passenger_name}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Route</p>
                            <p className="text-sm font-bold text-brand-primary">{booking.origin} → {booking.destination}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end gap-3 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Departure</p>
                          <p className="text-sm font-bold text-brand-primary">{new Date(booking.departure_time).toLocaleDateString()}</p>
                        </div>
                        {booking.status === "Landed" ? (
                          <button 
                            onClick={() => {
                              const receiptWindow = window.open('', '_blank');
                              if (receiptWindow) {
                                receiptWindow.document.write(`
                                  <html><head><title>E-Ticket - ${booking.flight_number}</title>
                                  <style>
                                    body{font-family:Arial,sans-serif;padding:40px;color:#1e3a8a;}
                                    .header{background:#1e3a8a;color:white;padding:30px;border-radius:12px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:center;}
                                    .title{font-size:22px;font-weight:900;text-transform:uppercase;}
                                    .flight-num{font-size:28px;font-weight:900;color:#3b82f6;}
                                    .grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;}
                                    .section{padding:15px;background:#f8fafc;border-radius:8px;border-left:3px solid #3b82f6;}
                                    .label{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;}
                                    .value{font-size:14px;font-weight:700;color:#1e3a8a;margin-top:4px;}
                                    .route{text-align:center;padding:30px;background:#f0f9ff;border-radius:12px;margin:20px 0;display:flex;justify-content:space-between;align-items:center;}
                                    .airport{font-size:32px;font-weight:900;}
                                    .footer{margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center;}
                                    @media print{body{padding:20px;}}
                                  </style></head><body>
                                    <div class="header">
                                      <div><div class="title">Diplomatic Xpress Airways</div><div style="font-size:10px;opacity:0.7;margin-top:4px;">BOARDING PASS & E-TICKET</div></div>
                                      <div class="flight-num">${booking.flight_number}</div>
                                    </div>
                                    <div class="route">
                                      <div><div class="airport">${(booking.origin || '').split('(')[0]}</div><div class="label">Origin</div></div>
                                      <div style="font-size:24px;color:#3b82f6;">✈ →</div>
                                      <div><div class="airport">${(booking.destination || '').split('(')[0]}</div><div class="label">Destination</div></div>
                                    </div>
                                    <div class="grid">
                                      <div class="section"><div class="label">Passenger</div><div class="value">${booking.passenger_name}</div></div>
                                      <div class="section"><div class="label">Cabin Class</div><div class="value">${booking.cabin_class === "private_jet" ? "Private Jet" : booking.cabin_class === "first_class" ? "First Class" : "Economy"}</div></div>
                                      <div class="section"><div class="label">Status</div><div class="value" style="color:#059669;">${booking.status}</div></div>
                                      <div class="section"><div class="label">Departure</div><div class="value">${new Date(booking.departure_time).toLocaleString()}</div></div>
                                      <div class="section"><div class="label">Price Paid</div><div class="value">$${booking.price}</div></div>
                                    </div>
                                    <div class="footer">© ${new Date().getFullYear()} Diplomatic Xpress Logistics. This e-ticket is digitally generated.</div>
                                    <script>window.onload=function(){window.print();}</script>
                                  </body></html>
                                `);
                                receiptWindow.document.close();
                              }
                            }}
                            className="btn-outline py-2 px-4 text-xs flex items-center gap-2"
                          >
                            <Download size={14} />
                            E-Ticket
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-bold italic">E-Ticket after landing</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                <p className="text-slate-400 font-bold">No flight bookings yet</p>
                <button onClick={() => setActiveTab("flights")} className="btn-primary py-2 px-6 text-xs">Search Flights</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
