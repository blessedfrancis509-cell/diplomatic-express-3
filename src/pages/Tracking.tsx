import React, { useState } from "react";
import { Search, Clock, MapPin, CheckCircle2, AlertCircle, Download, Camera, PackageCheck, MessageSquare, ShieldCheck, Plane, Calendar, Users } from "lucide-react";
import { motion } from "motion/react";
import { Shipment, User } from "../types";

interface TrackingPortalProps {
  user: User | null;
  setActiveTab: (tab: string) => void;
}

export const TrackingPortal = ({ user, setActiveTab }: TrackingPortalProps) => {
  const [trackingId, setTrackingId] = useState(() => localStorage.getItem("last_tracking_id") || "");
  const [trackingType, setTrackingType] = useState<"package" | "flight">("package");
  const [shipment, setShipment] = useState<Shipment | null>(() => {
    const saved = localStorage.getItem("last_shipment");
    return saved ? JSON.parse(saved) : null;
  });
  const [flight, setFlight] = useState<any | null>(() => {
    const saved = localStorage.getItem("last_flight");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [claimStatus, setClaimStatus] = useState<{ success?: boolean; error?: string } | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkIds, setBulkIds] = useState("");
  const [bulkResults, setBulkResults] = useState<{ id: string; status: string; found: boolean; shipment?: Shipment }[]>([]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = trackingId.trim().toUpperCase();
    if (!cleanId) return;

    // Auto-detect type if it looks like a LOGI- ID
    const detectedType = cleanId.startsWith("LOGI-") ? "package" : (cleanId.startsWith("XP-") ? "flight" : trackingType);
    setTrackingType(detectedType);

    setLoading(true);
    setError("");
    setClaimStatus(null);
    setShipment(null);
    setFlight(null);
    localStorage.removeItem("last_shipment");
    localStorage.removeItem("last_flight");

    try {
      const endpoint = detectedType === "package" ? `/api/shipments/${cleanId}` : `/api/flights/track/${cleanId}`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (detectedType === "package") {
          setShipment(data);
          localStorage.setItem("last_shipment", JSON.stringify(data));
          localStorage.setItem("last_tracking_id", cleanId);
        } else {
          setFlight(data);
          localStorage.setItem("last_flight", JSON.stringify(data));
          localStorage.setItem("last_tracking_id", cleanId);
        }
      } else {
        setError(`${detectedType === "package" ? "Tracking ID" : "Flight Number"} not found. Please verify and try again.`);
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const ids = bulkIds.split(/[\n,]+/).map(id => id.trim().toUpperCase()).filter(id => id);
    if (ids.length === 0) return;

    setLoading(true);
    setError("");
    setBulkResults([]);

    const results: { id: string; status: string; found: boolean; shipment?: Shipment }[] = [];

    for (const id of ids) {
      try {
        const res = await fetch(`/api/shipments/${id}`);
        if (res.ok) {
          const data = await res.json();
          results.push({ id, status: data.status, found: true, shipment: data });
        } else {
          results.push({ id, status: "Not Found", found: false });
        }
      } catch {
        results.push({ id, status: "Error", found: false });
      }
    }

    setBulkResults(results);
    setLoading(false);
  };

  const handleClaim = async () => {
    if (!user) {
      setActiveTab("auth");
      return;
    }
    if (!shipment) return;

    try {
      const res = await fetch(`/api/shipments/${shipment.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.username }),
      });
      const data = await res.json();
      if (res.ok) {
        setClaimStatus({ success: true });
        const updatedShipment = { ...shipment, claimed_by: user.username as any };
        setShipment(updatedShipment);
        localStorage.setItem("last_shipment", JSON.stringify(updatedShipment));
      } else {
        setClaimStatus({ error: data.error });
      }
    } catch (err) {
      setClaimStatus({ error: "Failed to claim shipment. Please try again." });
    }
  };

  const getStatusStep = (status: string) => {
    const steps = ["Pending", "Warehouse", "Shipping", "Courier 1", "Courier 2", "Courier 3", "In Transit", "Customs", "Out for Delivery", "Delivered"];
    return steps.findIndex(s => s.toLowerCase() === status.toLowerCase());
  };

  const getFlightStatusStep = (status: string) => {
    const steps = ["Scheduled", "Boarding", "Taxiing", "Taking Off", "In-Air", "Descending", "Landing", "Landed"];
    return steps.findIndex(s => s.toLowerCase() === status.toLowerCase());
  };

  return (
    <div className="py-20 max-w-5xl mx-auto px-6 space-y-16">
      <div className="text-center space-y-4 md:space-y-6 max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-black text-brand-primary tracking-tight">Real-Time Tracking</h2>
        <p className="text-base md:text-lg text-slate-500">Track your packages or monitor flight status in one place.</p>
        
        <div className="flex justify-center gap-4 pt-4">
          <button 
            onClick={() => { setTrackingType("package"); setShipment(null); setFlight(null); setError(""); }}
            className={`px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${
              trackingType === "package" ? "bg-brand-secondary text-white shadow-lg" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
            }`}
          >
            Package
          </button>
          <button 
            onClick={() => { setTrackingType("flight"); setShipment(null); setFlight(null); setError(""); }}
            className={`px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${
              trackingType === "flight" ? "bg-brand-secondary text-white shadow-lg" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
            }`}
          >
            Flight
          </button>
          <button 
            onClick={() => { setBulkMode(!bulkMode); setBulkResults([]); setError(""); }}
            className={`px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${
              bulkMode ? "bg-brand-primary text-white shadow-lg" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
            }`}
          >
            Bulk Track
          </button>
        </div>
      </div>

      <form onSubmit={handleTrack} className="relative max-w-2xl mx-auto">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-secondary to-brand-accent rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
          <div className="relative flex flex-col sm:flex-row gap-2">
            <input 
              className="w-full pl-6 pr-6 sm:pr-40 py-4 sm:py-6 rounded-2xl bg-white shadow-2xl border border-slate-100 text-xl sm:text-2xl font-bold focus:outline-none focus:ring-4 focus:ring-brand-secondary/10 transition-all"
              placeholder={trackingType === "package" ? "LOGI-XXXXX" : "XP-123"}
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={loading}
              className="sm:absolute sm:right-3 sm:top-3 sm:bottom-3 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 py-4 sm:py-0 px-8"
            >
              {loading ? <Clock className="animate-spin" size={20} /> : <Search size={20} />}
              Track
            </button>
          </div>
        </div>
      </form>

      {bulkMode && (
        <form onSubmit={handleBulkTrack} className="max-w-2xl mx-auto space-y-4">
          <div className="card space-y-4">
            <h4 className="font-black text-brand-primary">Bulk Track Multiple Packages</h4>
            <p className="text-sm text-slate-500">Enter tracking IDs separated by commas or new lines (one per line).</p>
            <textarea 
              className="input h-32 font-mono text-sm"
              placeholder={"LOGI-ABC12\nLOGI-DEF34\nLOGI-GHI56"}
              value={bulkIds}
              onChange={(e) => setBulkIds(e.target.value)}
            />
            <button type="submit" disabled={loading} className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Clock className="animate-spin" size={20} /> : <Search size={20} />}
              Track All Packages
            </button>
          </div>

          {bulkResults.length > 0 && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-brand-primary">Bulk Tracking Results</h4>
                <span className="text-xs font-bold text-slate-400">{bulkResults.filter(r => r.found).length}/{bulkResults.length} found</span>
              </div>
              <div className="space-y-2">
                {bulkResults.map((result, i) => (
                  <div key={i} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    result.found ? "bg-emerald-50 border-emerald-100 hover:border-emerald-300" : "bg-red-50 border-red-100"
                  }`}>
                    <div className="flex items-center gap-3">
                      {result.found ? <CheckCircle2 size={18} className="text-emerald-500" /> : <AlertCircle size={18} className="text-red-400" />}
                      <span className="font-mono font-bold text-sm text-brand-primary">{result.id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        result.found ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                      }`}>
                        {result.status}
                      </span>
                      {result.found && (
                        <button 
                          type="button"
                          onClick={() => { setTrackingId(result.id); setBulkMode(false); setBulkResults([]); }}
                          className="text-xs font-bold text-brand-secondary hover:underline"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      )}

      {error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 text-red-500 justify-center font-bold bg-red-50 py-4 rounded-2xl border border-red-100 max-w-md mx-auto">
          <AlertCircle size={24} />
          {error}
        </motion.div>
      )}

      {flight && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
          <div className="card grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Airline</span>
              <p className="text-2xl font-black text-brand-primary">{flight.airline}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Flight Number</span>
              <p className="text-3xl font-black text-brand-secondary font-mono">{flight.flight_number}</p>
            </div>
            <div className="space-y-1 md:text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Status</span>
              <div className="flex md:justify-end">
                <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                  flight.status === "Landed" ? "bg-emerald-100 text-emerald-700" : 
                  flight.status === "In-Air" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-700"
                }`}>
                  {flight.status}
                </span>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <h4 className="text-xl font-black text-brand-primary tracking-tight mb-8 flex items-center gap-2">
              <Plane size={24} className="text-brand-secondary" />
              Flight Progress
            </h4>
            <div className="relative pt-4 overflow-x-auto pb-8 -mx-6 px-6">
              <div className="min-w-[800px] relative">
                <div className="absolute top-[1.6rem] left-0 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(0, (getFlightStatusStep(flight.status) / 7) * 100)}%` }}
                    className="h-full bg-brand-secondary shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-1000"
                  />
                </div>
                <div className="relative flex justify-between">
                  {["Scheduled", "Boarding", "Taxiing", "Taking Off", "In-Air", "Descending", "Landing", "Landed"].map((step, i) => {
                    const isActive = getFlightStatusStep(flight.status) >= i;
                    const isCurrent = getFlightStatusStep(flight.status) === i;
                    return (
                      <div key={step} className="flex flex-col items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-700 ${
                          isCurrent ? "bg-brand-secondary border-brand-secondary text-white shadow-xl shadow-brand-secondary/30 scale-125 z-10" :
                          isActive ? "bg-brand-secondary/10 border-brand-secondary text-brand-secondary" : "bg-white border-slate-100 text-slate-200"
                        }`}>
                          {isActive ? <CheckCircle2 size={20} /> : <div className="w-1.5 h-1.5 bg-current rounded-full" />}
                        </div>
                        <div className="text-center">
                          <span className={`text-[9px] font-black uppercase tracking-widest leading-tight block ${
                            isCurrent ? "text-brand-secondary underline underline-offset-4" :
                            isActive ? "text-brand-primary" : "text-slate-300"
                          }`}>{step}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="card grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <h4 className="text-xl font-black text-brand-primary tracking-tight">Route Details</h4>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-3xl font-black text-brand-primary">{flight.origin.split('(')[1]?.replace(')', '') || flight.origin}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase">{flight.origin}</p>
                </div>
                <div className="flex-1 h-px bg-slate-200 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                    <motion.div 
                      animate={{ x: [0, 20, 0] }}
                      transition={{ repeat: Infinity, duration: 3 }}
                    >
                      <CheckCircle2 size={16} className="text-brand-secondary" />
                    </motion.div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black text-brand-primary">{flight.destination.split('(')[1]?.replace(')', '') || flight.destination}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase">{flight.destination}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-xl font-black text-brand-primary tracking-tight">Schedule</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Departure</p>
                  <p className="text-sm font-bold text-brand-primary">{new Date(flight.departure_time).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Arrival</p>
                  <p className="text-sm font-bold text-brand-primary">{new Date(flight.arrival_time).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card space-y-12">
            <div className="flex justify-between items-center">
              <h4 className="text-2xl font-black text-brand-primary tracking-tight flex items-center gap-3">
                <Clock size={28} className="text-brand-secondary" />
                Flight History
              </h4>
              <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">Live Updates</span>
            </div>
            
            <div className="space-y-0">
              {flight.updates?.map((update: any, i: number) => {
                const isLatest = i === 0;
                return (
                  <div key={i} className="flex gap-8 group relative">
                    <div className="flex flex-col items-center relative">
                      <div className={`w-6 h-6 rounded-full border-4 border-white shadow-xl z-20 flex items-center justify-center transition-all duration-500 ${
                        isLatest ? "bg-brand-secondary scale-125 ring-4 ring-brand-secondary/20" : "bg-slate-200"
                      }`}>
                        {isLatest ? <Plane size={12} className="text-white" /> : <div className="w-1 h-1 bg-slate-400 rounded-full" />}
                      </div>
                      {i !== flight.updates!.length - 1 && (
                        <div className={`w-1 absolute top-6 bottom-0 left-1/2 -translate-x-1/2 z-10 ${
                          isLatest ? "bg-gradient-to-b from-brand-secondary to-slate-100" : "bg-slate-100"
                        }`} />
                      )}
                    </div>
                    
                    <div className="flex-1 pb-12">
                      <div className={`p-6 rounded-3xl border transition-all duration-300 ${
                        isLatest ? "bg-white border-brand-secondary/20 shadow-xl shadow-brand-secondary/5" : "bg-slate-50/50 border-slate-100"
                      }`}>
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                          <div className="space-y-1">
                            <p className={`text-xl font-black ${isLatest ? "text-brand-primary" : "text-slate-500"}`}>
                              {update.status}
                            </p>
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className={isLatest ? "text-brand-secondary" : "text-slate-400"} />
                              <span className={`text-sm font-bold ${isLatest ? "text-slate-600" : "text-slate-400"}`}>
                                {update.location || "En route"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                            <Calendar size={12} />
                            {new Date(update.timestamp).toLocaleString()}
                          </div>
                        </div>
                        
                        {update.notes && (
                          <div className={`p-4 rounded-2xl text-sm italic leading-relaxed ${
                            isLatest ? "bg-brand-secondary/5 text-brand-primary border border-brand-secondary/10" : "bg-white text-slate-500 border border-slate-100"
                          }`}>
                            "{update.notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!flight.updates || flight.updates.length === 0) && (
                <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                    <AlertCircle size={32} className="text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-bold">No tracking history available for this flight.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {shipment && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
          <div className="card grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-10">
            <div className="flex items-center gap-4 md:col-span-2">
              {shipment.client_photo_url && (
                <img src={shipment.client_photo_url} alt="Client" className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-brand-secondary shadow-lg" referrerPolicy="no-referrer" />
              )}
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient Details</span>
                <p className="text-lg md:text-xl font-bold text-brand-primary">{shipment.customer_name}</p>
                <p className="text-sm text-slate-500">{shipment.client_phone}</p>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tracking ID</span>
              <p className="text-2xl md:text-3xl font-black text-brand-secondary font-mono">{shipment.id}</p>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col items-stretch md:items-end justify-end gap-3">
              {shipment.claimed_by ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                  <PackageCheck size={18} />
                  Claimed
                </div>
              ) : (
                <button 
                  onClick={handleClaim}
                  className="btn-primary py-2 px-6 text-sm flex items-center justify-center gap-2"
                >
                  <PackageCheck size={18} />
                  Claim Shipment
                </button>
              )}
              {shipment.status === "Delivered" && (
                <button 
                  onClick={() => {
                    const receiptWindow = window.open('', '_blank');
                    if (receiptWindow) {
                      receiptWindow.document.write(`
                        <html><head><title>Receipt - ${shipment.id}</title>
                        <style>
                          body{font-family:Arial,sans-serif;padding:40px;color:#1e3a8a;}
                          .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1e3a8a;padding-bottom:20px;margin-bottom:30px;}
                          .title{font-size:24px;font-weight:900;text-transform:uppercase;}
                          .subtitle{font-size:10px;color:#64748b;letter-spacing:0.2em;}
                          .tracking{font-size:20px;font-family:monospace;color:#3b82f6;font-weight:900;}
                          .section{margin:20px 0;padding:15px;background:#f8fafc;border-radius:8px;}
                          .label{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;}
                          .value{font-size:14px;font-weight:700;color:#1e3a8a;margin-top:4px;}
                          .grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;}
                          .footer{margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center;}
                          @media print{body{padding:20px;}}
                        </style></head><body>
                          <div class="header">
                            <div><div class="title">Diplomatic Xpress Logistics</div><div class="subtitle">Official Consignment Receipt</div></div>
                            <div><div class="label">Tracking Number</div><div class="tracking">${shipment.id}</div></div>
                          </div>
                          <div class="grid">
                            <div class="section"><div class="label">Recipient</div><div class="value">${shipment.customer_name}</div></div>
                            <div class="section"><div class="label">Phone</div><div class="value">${shipment.client_phone || 'N/A'}</div></div>
                            <div class="section"><div class="label">Origin</div><div class="value">${shipment.origin}</div></div>
                            <div class="section"><div class="label">Destination</div><div class="value">${shipment.destination}</div></div>
                            <div class="section"><div class="label">Status</div><div class="value" style="color:#059669;">${shipment.status}</div></div>
                            <div class="section"><div class="label">Date</div><div class="value">${new Date().toLocaleDateString()}</div></div>
                            ${shipment.weight ? `<div class="section"><div class="label">Weight</div><div class="value">${shipment.weight} kg</div></div>` : ''}
                            ${shipment.shipping_cost ? `<div class="section"><div class="label">Shipping Cost</div><div class="value">$${shipment.shipping_cost}</div></div>` : ''}
                            ${shipment.content_description ? `<div class="section"><div class="label">Contents</div><div class="value">${shipment.content_description}</div></div>` : ''}
                          </div>
                          <div class="footer">© ${new Date().getFullYear()} Diplomatic Xpress Logistics. This receipt is digitally generated and valid without signature.</div>
                          <script>window.onload=function(){window.print();}</script>
                        </body></html>
                      `);
                      receiptWindow.document.close();
                    }
                  }}
                  className="flex items-center justify-center gap-2 text-brand-secondary font-bold text-sm hover:underline bg-brand-secondary/5 px-4 py-2 rounded-xl border border-brand-secondary/10"
                >
                  <Download size={18} />
                  Download Receipt
                </button>
              )}
              {shipment.status !== "Delivered" && (
                <div className="flex items-center justify-center gap-2 text-slate-300 text-xs font-bold italic">
                  <Download size={14} />
                  Receipt available after delivery
                </div>
              )}
            </div>
          </div>

          {claimStatus?.error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm font-bold text-center">
              {claimStatus.error}
            </div>
          )}
          {claimStatus?.success && (
            <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl border border-emerald-100 text-sm font-bold text-center">
              Shipment claimed successfully! It is now linked to your account.
            </div>
          )}

          {(shipment.weight || shipment.dimensions || shipment.shipping_cost || shipment.content_description || shipment.estimated_delivery) && (
            <div className="card">
              <h4 className="text-lg font-black text-brand-primary tracking-tight mb-6">Shipment Details</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {shipment.content_description && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contents</p>
                    <p className="font-bold text-brand-primary">{shipment.content_description}</p>
                  </div>
                )}
                {shipment.weight && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Weight</p>
                    <p className="font-bold text-brand-primary">{shipment.weight} kg</p>
                  </div>
                )}
                {shipment.dimensions && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dimensions</p>
                    <p className="font-bold text-brand-primary">{shipment.dimensions} cm</p>
                  </div>
                )}
                {shipment.shipping_cost && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Shipping Cost</p>
                    <p className="font-bold text-brand-secondary">${shipment.shipping_cost}</p>
                  </div>
                )}
                {shipment.estimated_delivery && (
                  <div className="p-4 bg-brand-secondary/5 rounded-xl border border-brand-secondary/10 md:col-span-2">
                    <p className="text-[10px] font-black text-brand-secondary uppercase tracking-widest mb-1">Estimated Delivery</p>
                    <p className="font-bold text-brand-primary">{new Date(shipment.estimated_delivery).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {shipment.product_photos && shipment.product_photos.length > 0 && (
            <div className="card space-y-6">
              <h4 className="text-xl font-black text-brand-primary tracking-tight">Product Images</h4>
              <div className="flex flex-wrap gap-4">
                {shipment.product_photos.map((photo, i) => (
                  <img key={i} src={photo} alt={`Product ${i+1}`} className="w-32 h-32 rounded-xl object-cover border border-slate-200 shadow-md hover:scale-105 transition-transform cursor-pointer" referrerPolicy="no-referrer" />
                ))}
              </div>
            </div>
          )}

          {shipment.status === "Customs" && shipment.payment_methods && (
            <div className="card bg-indigo-50 border-indigo-100 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-indigo-900 tracking-tight">Customs Clearance Required</h4>
                  <p className="text-indigo-600 font-bold text-sm uppercase tracking-widest">Payment Methods for Processing</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {JSON.parse(shipment.payment_methods).map((pm: any, idx: number) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm flex justify-between items-center group hover:border-indigo-300 transition-all">
                    <div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{pm.name}</p>
                      <p className="font-mono font-bold text-indigo-900 break-all">{pm.details}</p>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(pm.details);
                        alert("Address copied to clipboard!");
                      }}
                      className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-indigo-500 italic">Please complete payment to one of the addresses above to proceed with customs clearance. Once paid, notify your agent.</p>
            </div>
          )}

          <div className="card space-y-16 overflow-hidden">
            <div className="relative pt-4 overflow-x-auto pb-8 -mx-6 px-6">
              <div className="min-w-[800px] relative">
                <div className="absolute top-[2.1rem] left-0 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(getStatusStep(shipment.status) / 9) * 100}%` }}
                    className="h-full bg-brand-secondary shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                  />
                </div>
                <div className="relative flex justify-between">
                  {["Pending", "Warehouse", "Shipping", "Courier 1", "Courier 2", "Courier 3", "In Transit", "Customs", "Out for Delivery", "Delivered"].map((step, i) => {
                    const isActive = getStatusStep(shipment.status) >= i;
                    return (
                      <div key={step} className="flex flex-col items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-4 transition-all duration-700 ${
                          isActive ? "bg-brand-secondary border-brand-secondary text-white shadow-xl shadow-brand-secondary/30 scale-110" : "bg-white border-slate-100 text-slate-200"
                        }`}>
                          {isActive ? <CheckCircle2 size={24} /> : <div className="w-2 h-2 bg-current rounded-full" />}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest text-center max-w-[80px] leading-tight ${
                          isActive ? "text-brand-primary" : "text-slate-300"
                        }`}>{step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-10">
              <h4 className="text-2xl font-black text-brand-primary tracking-tight flex items-center gap-3">
                <Clock size={28} className="text-brand-secondary" />
                Transit Timeline
              </h4>
              <div className="space-y-10">
                {shipment.updates?.map((update, i) => (
                  <div key={i} className="flex gap-8 group">
                    <div className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full border-4 border-white shadow-lg transition-colors duration-500 ${i === 0 ? "bg-brand-secondary scale-125" : "bg-slate-300"}`} />
                      {i !== shipment.updates!.length - 1 && <div className="w-1 flex-1 bg-slate-100 my-2 rounded-full" />}
                    </div>
                    <div className="flex-1 space-y-4 pb-10">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-2">
                        <div>
                          <p className="text-xl font-black text-brand-primary">{update.status}</p>
                          <p className="text-slate-500 font-medium flex items-center gap-2">
                            <MapPin size={16} className="text-brand-secondary" />
                            {update.location}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">{new Date(update.timestamp).toLocaleString()}</span>
                      </div>
                      {update.notes && (
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-slate-600 leading-relaxed italic">
                          "{update.notes}"
                        </div>
                      )}
                      {update.photo_url && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-brand-secondary">
                            <Camera size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Proof of Delivery</span>
                          </div>
                          <img 
                            src={update.photo_url} 
                            alt="Proof" 
                            className="rounded-3xl border border-slate-200 max-w-md w-full shadow-2xl hover:scale-[1.02] transition-transform cursor-zoom-in"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(!shipment.updates || shipment.updates.length === 0) && (
                  <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold">Awaiting initial transit scan...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
