import React, { useState } from "react";
import { Search, Clock, MapPin, CheckCircle2, AlertCircle, Download, Camera, PackageCheck, ShieldCheck, Plane, Calendar, Upload, FileText } from "lucide-react";
import { motion } from "motion/react";
import { Shipment, User } from "../types";
import { generateReceiptHTML, openReceiptWindow, downloadReceipt } from "../lib/receipt";

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
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofMessage, setProofMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  const handleUploadProof = async () => {
    if (!proofFile || !shipment) return;
    setUploadingProof(true);
    setProofMessage(null);

    try {
      const formData = new FormData();
      formData.append("proof", proofFile);
      formData.append("username", user?.username || "anonymous");

      const res = await fetch(`/api/shipments/${shipment.id}/payment-proof`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        const updatedShipment = { ...shipment, payment_proof_url: data.proof_url, payment_confirmed: 0 };
        setShipment(updatedShipment);
        localStorage.setItem("last_shipment", JSON.stringify(updatedShipment));
        setProofMessage({ type: "success", text: "Payment proof uploaded successfully! Awaiting admin confirmation." });
        setProofFile(null);
      } else {
        setProofMessage({ type: "error", text: data.error || "Failed to upload proof." });
      }
    } catch (err) {
      setProofMessage({ type: "error", text: "Upload failed. Please try again." });
    } finally {
      setUploadingProof(false);
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
    <div className="py-8 md:py-20 max-w-5xl mx-auto px-4 md:px-6 space-y-10 md:space-y-16">
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
                      <div key={step} className="flex flex-col items-center gap-2 md:gap-4">
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-700 ${
                          isCurrent ? "bg-brand-secondary border-brand-secondary text-white shadow-xl shadow-brand-secondary/30 scale-125 z-10" :
                          isActive ? "bg-brand-secondary/10 border-brand-secondary text-brand-secondary" : "bg-white border-slate-100 text-slate-200"
                        }`}>
                          {isActive ? <CheckCircle2 size={16} /> : <div className="w-1.5 h-1.5 bg-current rounded-full" />}
                        </div>
                        <div className="text-center">
                          <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-widest leading-tight block ${
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
              ) : shipment.status === "Customs" && shipment.payment_confirmed !== 1 ? (
                <div className="flex items-center justify-center gap-2 text-amber-600 font-bold text-xs bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 text-center leading-tight">
                  Complete customs payment to claim
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
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const html = generateReceiptHTML({
                        type: "package",
                        trackingId: shipment.id,
                        deliveryDate: new Date().toLocaleDateString(),
                        senderName: shipment.customer_name,
                        senderAddress: shipment.origin,
                        receiverName: shipment.customer_name,
                        receiverEmail: "",
                        receiverAddress: shipment.destination,
                        origin: shipment.origin,
                        destination: shipment.destination,
                        content: shipment.content_description || "General Cargo",
                        weight: shipment.weight || "",
                        quantity: "1",
                        action: "Delivered",
                        paymentStatus: "PAID",
                        estDelivery: shipment.estimated_delivery || "",
                        shippingFee: shipment.shipping_cost ? `$${shipment.shipping_cost}` : "",
                        ownerPhotoUrl: shipment.client_photo_url || "",
                      });
                      const opened = openReceiptWindow(html, `Receipt - ${shipment.id}`);
                      if (!opened) downloadReceipt(html, `receipt-${shipment.id}.html`);
                    }}
                    className="flex items-center justify-center gap-2 text-brand-secondary font-bold text-sm hover:underline bg-brand-secondary/5 px-4 py-2 rounded-xl border border-brand-secondary/10"
                  >
                    <FileText size={18} />
                    View Receipt
                  </button>
                  <button
                    onClick={() => {
                      const html = generateReceiptHTML({
                        type: "package",
                        trackingId: shipment.id,
                        deliveryDate: new Date().toLocaleDateString(),
                        senderName: shipment.customer_name,
                        senderAddress: shipment.origin,
                        receiverName: shipment.customer_name,
                        receiverEmail: "",
                        receiverAddress: shipment.destination,
                        origin: shipment.origin,
                        destination: shipment.destination,
                        content: shipment.content_description || "General Cargo",
                        weight: shipment.weight || "",
                        quantity: "1",
                        action: "Delivered",
                        paymentStatus: "PAID",
                        estDelivery: shipment.estimated_delivery || "",
                        shippingFee: shipment.shipping_cost ? `$${shipment.shipping_cost}` : "",
                        ownerPhotoUrl: shipment.client_photo_url || "",
                      });
                      downloadReceipt(html, `receipt-${shipment.id}.html`);
                    }}
                    className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all"
                  >
                    <Download size={18} />
                    Download
                  </button>
                </div>
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

          {shipment.status === "Customs" && (
            <div className="card bg-indigo-50 border-indigo-100 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-indigo-900 tracking-tight">Customs Clearance Required</h4>
                  <p className="text-indigo-600 font-bold text-sm uppercase tracking-widest">Payment for Processing</p>
                </div>
              </div>

              {shipment.customs_amount && (
                <div className="bg-white p-6 rounded-2xl border-2 border-indigo-200 shadow-sm text-center">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Amount Due</p>
                  <p className="text-4xl font-black text-indigo-900">
                    {shipment.customs_currency || "USD"} {Number(shipment.customs_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              {shipment.payment_methods && (() => {
                try {
                  const methods = JSON.parse(shipment.payment_methods);
                  if (!methods || methods.length === 0) return null;
                  return (
                    <div className="space-y-4">
                      <h5 className="text-xs font-black text-indigo-700 uppercase tracking-widest">Payment Methods</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {methods.map((pm: any, idx: number) => (
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
                    </div>
                  );
                } catch {
                  return null;
                }
              })()}

              {proofMessage && (
                <div className={`p-4 rounded-xl border text-sm font-bold text-center ${proofMessage.type === "success" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}`}>
                  {proofMessage.text}
                </div>
              )}

              {shipment.payment_proof_url && shipment.payment_confirmed === 1 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
                  <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg">
                    <CheckCircle2 size={28} />
                  </div>
                  <p className="text-lg font-black text-emerald-800">Payment Confirmed</p>
                  <p className="text-sm text-emerald-600 font-medium">Your customs payment has been verified. Your goods are cleared for delivery.</p>
                </div>
              ) : shipment.payment_proof_url ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-4">
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg animate-pulse">
                      <Clock size={28} />
                    </div>
                    <p className="text-lg font-black text-amber-800">Awaiting Payment Confirmation</p>
                    <p className="text-sm text-amber-600 font-medium">Your proof of payment has been submitted. Admin will review and confirm shortly.</p>
                  </div>
                  {shipment.payment_proof_url && (
                    <div className="text-center">
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Your Uploaded Proof</p>
                      <img src={shipment.payment_proof_url} alt="Payment Proof" className="rounded-xl border border-amber-200 max-w-xs mx-auto shadow-md" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest text-center">Upload Different Proof</p>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        className="flex-1 text-xs font-bold text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200"
                      />
                      <button
                        onClick={handleUploadProof}
                        disabled={!proofFile || uploadingProof}
                        className="btn-primary py-2 px-4 text-xs flex items-center gap-1 disabled:opacity-50"
                      >
                        {uploadingProof ? <Clock className="animate-spin" size={14} /> : <Upload size={14} />}
                        Re-upload
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-indigo-500 italic text-center">Upload proof of payment (receipt or screenshot) to proceed with customs clearance.</p>
                  <div className="flex gap-3">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="flex-1 text-sm font-bold text-slate-500 file:mr-4 file:py-3 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"
                    />
                    <button
                      onClick={handleUploadProof}
                      disabled={!proofFile || uploadingProof}
                      className="btn-primary py-3 px-6 text-sm flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                    >
                      {uploadingProof ? <Clock className="animate-spin" size={18} /> : <Upload size={18} />}
                      Upload Proof
                    </button>
                  </div>
                </div>
              )}
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
                      <div key={step} className="flex flex-col items-center gap-2 md:gap-4">
                        <div className={`w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center border-2 md:border-4 transition-all duration-700 ${
                          isActive ? "bg-brand-secondary border-brand-secondary text-white shadow-xl shadow-brand-secondary/30 scale-110" : "bg-white border-slate-100 text-slate-200"
                        }`}>
                          {isActive ? <CheckCircle2 size={18} /> : <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-current rounded-full" />}
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
