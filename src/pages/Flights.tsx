import React, { useState, useEffect, useCallback } from "react";
import { Plane, Search, MapPin, AlertCircle, Crown, Sparkles, Star, X, Copy, CreditCard, Clock, Ruler, Filter, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Flight, FlightCabin, User } from "../types";
import { DUMMY_FLIGHTS } from "../data/dummyFlights";

interface FlightsProps {
  user: User | null;
  setActiveTab: (tab: string) => void;
}

const CABIN_COLORS: Record<string, string> = {
  economy: "bg-blue-100 text-blue-700 border-blue-200",
  first_class: "bg-amber-100 text-amber-700 border-amber-200",
  private_jet: "bg-purple-100 text-purple-700 border-purple-200",
};

const CABIN_BG: Record<string, string> = {
  economy: "bg-blue-50",
  first_class: "bg-amber-50",
  private_jet: "bg-purple-50",
};

const CABIN_ICONS: Record<string, React.ReactNode> = {
  economy: <Plane size={14} />,
  first_class: <Crown size={14} />,
  private_jet: <Sparkles size={14} />,
};

const CABIN_LABELS: Record<string, string> = {
  economy: "Economy",
  first_class: "First Class",
  private_jet: "Private Jet",
};

const PrivateJetSVG = () => (
  <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1e3a8a" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
      <linearGradient id="jetBody" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#e2e8f0" />
      </linearGradient>
    </defs>
    <rect width="400" height="200" fill="url(#skyGrad)" rx="16" />
    <circle cx="350" cy="40" r="20" fill="#fbbf24" opacity="0.3" />
    <circle cx="50" cy="30" r="3" fill="white" opacity="0.6" />
    <circle cx="120" cy="55" r="2" fill="white" opacity="0.4" />
    <circle cx="280" cy="25" r="2.5" fill="white" opacity="0.5" />
    <circle cx="320" cy="60" r="1.5" fill="white" opacity="0.3" />
    <circle cx="80" cy="70" r="1.5" fill="white" opacity="0.4" />
    {/* Clouds */}
    <ellipse cx="60" cy="130" rx="30" ry="10" fill="white" opacity="0.15" />
    <ellipse cx="300" cy="150" rx="40" ry="12" fill="white" opacity="0.1" />
    {/* Jet body */}
    <path d="M100 100 L300 95 L320 97 L340 100 L320 103 L300 105 L100 100Z" fill="url(#jetBody)" stroke="#94a3b8" strokeWidth="0.5" />
    {/* Wings */}
    <path d="M160 100 L200 70 L220 70 L190 100Z" fill="url(#jetBody)" stroke="#94a3b8" strokeWidth="0.5" />
    <path d="M160 100 L200 130 L220 130 L190 100Z" fill="url(#jetBody)" stroke="#94a3b8" strokeWidth="0.5" />
    {/* Tail */}
    <path d="M100 100 L80 75 L100 80Z" fill="url(#jetBody)" stroke="#94a3b8" strokeWidth="0.5" />
    <path d="M100 100 L80 125 L100 120Z" fill="url(#jetBody)" stroke="#94a3b8" strokeWidth="0.5" />
    {/* Windows */}
    <circle cx="140" cy="99" r="1.5" fill="#3b82f6" />
    <circle cx="155" cy="99" r="1.5" fill="#3b82f6" />
    <circle cx="170" cy="99" r="1.5" fill="#3b82f6" />
    <circle cx="185" cy="99" r="1.5" fill="#3b82f6" />
    <circle cx="200" cy="99" r="1.5" fill="#3b82f6" />
    <circle cx="215" cy="99" r="1.5" fill="#3b82f6" />
    <circle cx="230" cy="99" r="1.5" fill="#3b82f6" />
    {/* Cockpit */}
    <path d="M300 96 L325 99 L300 103Z" fill="#1e3a8a" opacity="0.4" />
    {/* Engine glow */}
    <circle cx="330" cy="100" r="4" fill="#fbbf24" opacity="0.6" />
    <circle cx="330" cy="100" r="2" fill="#f97316" opacity="0.8" />
    {/* Trail */}
    <line x1="335" y1="100" x2="380" y2="100" stroke="white" strokeWidth="0.5" opacity="0.3" />
    <line x1="335" y1="98" x2="370" y2="96" stroke="white" strokeWidth="0.3" opacity="0.2" />
    <line x1="335" y1="102" x2="370" y2="104" stroke="white" strokeWidth="0.3" opacity="0.2" />
    {/* Label */}
    <text x="200" y="175" textAnchor="middle" fill="white" fontSize="11" fontFamily="Arial" fontWeight="bold" opacity="0.7" letterSpacing="0.2em">DIPLOMATIC PRIVATE JETS</text>
  </svg>
);

export const Flights = ({ user, setActiveTab }: FlightsProps) => {
  const [allFlights, setAllFlights] = useState<Flight[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState({ origin: "", destination: "" });
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [selectedCabin, setSelectedCabin] = useState<string>("economy");
  const [cabinFilter, setCabinFilter] = useState<string>("all");
  const [bookingData, setBookingData] = useState({ passenger_name: user?.username || "", passport_number: "" });
  const [bookingStep, setBookingStep] = useState<"form" | "payment" | "processing">("form");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentAccount, setPaymentAccount] = useState<any>({});

  const closeModal = useCallback(() => {
    setSelectedFlight(null);
    setBookingStep("form");
    setBookingError(null);
    setSelectedCabin("economy");
    setCopied(false);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedFlight) closeModal();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedFlight, closeModal]);

  useEffect(() => {
    fetchFlights();
    fetch("/api/settings/payment-account").then(r => r.json()).then(setPaymentAccount).catch(() => {});
  }, []);

  const fetchFlights = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/flights");
      let apiFlights: Flight[] = [];
      if (res.ok) {
        try { apiFlights = await res.json(); } catch { /* empty */ }
      }
      const combined = [...DUMMY_FLIGHTS, ...apiFlights];
      setAllFlights(combined);
      setFlights(combined);
    } catch {
      setAllFlights(DUMMY_FLIGHTS);
      setFlights(DUMMY_FLIGHTS);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    filterFlights(search.origin, search.destination, cabinFilter);
  };

  const handleShowAll = () => {
    setSearch({ origin: "", destination: "" });
    setCabinFilter("all");
    setFlights(allFlights);
  };

  const getCabin = (flight: Flight, cabinClass: string): FlightCabin | undefined => {
    return flight.cabins?.find((c) => c.class === cabinClass);
  };

  const filterFlights = (origin: string, destination: string, cabin: string) => {
    const originQ = origin.toLowerCase().trim();
    const destQ = destination.toLowerCase().trim();
    let filtered = allFlights;
    if (originQ || destQ) {
      filtered = filtered.filter((fl) => {
        const matchOrigin = !originQ || fl.origin.toLowerCase().includes(originQ);
        const matchDest = !destQ || fl.destination.toLowerCase().includes(destQ);
        return matchOrigin && matchDest;
      });
    }
    if (cabin !== "all") {
      filtered = filtered.filter((fl) => fl.cabins?.some((c) => c.class === cabin));
    }
    setFlights(filtered);
  };

  const handleCabinFilter = (key: string) => {
    setCabinFilter(key);
    filterFlights(search.origin, search.destination, key);
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setActiveTab("auth"); return; }
    if (!selectedFlight || !bookingCabin) return;

    try {
      const res = await fetch(`/api/flights/${selectedFlight.id}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          passenger_name: bookingData.passenger_name,
          passport_number: bookingData.passport_number,
          cabin_class: selectedCabin,
          airline: selectedFlight.airline,
          flight_number: selectedFlight.flight_number,
          origin: selectedFlight.origin,
          destination: selectedFlight.destination,
          departure_time: selectedFlight.departure_time,
          arrival_time: selectedFlight.arrival_time,
          price: bookingCabin.price,
          duration_minutes: selectedFlight.duration_minutes,
          distance_km: selectedFlight.distance_km,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBookingStep("payment");
      } else {
        setBookingError(data.error || "Failed to book flight.");
      }
    } catch {
      setBookingError("Failed to book flight. Please try again.");
    }
  };

  const bookingCabin = selectedFlight ? getCabin(selectedFlight, selectedCabin) : undefined;
  const hasPaymentInfo = paymentAccount.bank_name && paymentAccount.account_number;

  const handleCopyAccount = () => {
    const text = `${paymentAccount.bank_name}\n${paymentAccount.account_name}\n${paymentAccount.account_number}${paymentAccount.routing_number ? "\n" + paymentAccount.routing_number : ""}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m > 0 ? m + "m" : ""}`.trim();
  };

  const formatDistance = (km: number) => {
    if (km >= 1000) return `${(km / 1000).toFixed(1)}K km`;
    return `${km} km`;
  };

  return (
    <div className="py-8 md:py-20 max-w-7xl mx-auto px-4 md:px-6 space-y-8 md:space-y-12">
      <div className="text-center space-y-3 md:space-y-4 max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-6xl font-black text-brand-primary tracking-tight">
          Fly with <span className="text-brand-secondary">Xpress</span>
        </h2>
        <p className="text-base md:text-lg text-slate-500">Book your next adventure with our diplomatic flight network. Fast, secure, and global.</p>
      </div>

      {/* Search Bar */}
      <div className="card bg-brand-primary p-5 md:p-8 lg:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-secondary/10 blur-3xl rounded-full -mr-32 -mt-32" />
        <form onSubmit={handleSearch} className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="space-y-2">
            <label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white/60">From</label>
            <div className="relative">
              <MapPin className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-3 md:py-4 rounded-2xl bg-white text-brand-primary font-bold text-sm md:text-base focus:outline-none focus:ring-4 focus:ring-brand-secondary/20 transition-all"
                placeholder="City or airport"
                value={search.origin}
                onChange={(e) => setSearch({ ...search, origin: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white/60">To</label>
            <div className="relative">
              <MapPin className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-brand-secondary" size={18} />
              <input
                className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-3 md:py-4 rounded-2xl bg-white text-brand-primary font-bold text-sm md:text-base focus:outline-none focus:ring-4 focus:ring-brand-secondary/20 transition-all"
                placeholder="City or airport"
                value={search.destination}
                onChange={(e) => setSearch({ ...search, destination: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <button type="submit" className="w-full btn-secondary py-3 md:py-4 flex items-center justify-center gap-2 text-base md:text-lg">
              <Search size={18} />
              Search
            </button>
            {(search.origin || search.destination || cabinFilter !== "all") && (
              <button type="button" onClick={handleShowAll} className="btn-outline py-3 md:py-4 px-3 md:px-4 text-xs md:text-sm whitespace-nowrap">
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Cabin Filter Tabs */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
          {[
            { key: "all", label: "All Flights", count: allFlights.length, icon: <Filter size={14} /> },
            { key: "economy", label: "Economy", count: allFlights.filter(f => f.cabins?.some(c => c.class === "economy")).length, icon: <Plane size={14} /> },
            { key: "first_class", label: "First Class", count: allFlights.filter(f => f.cabins?.some(c => c.class === "first_class")).length, icon: <Crown size={14} /> },
            { key: "private_jet", label: "Private Jet", count: allFlights.filter(f => f.cabins?.some(c => c.class === "private_jet")).length, icon: <Sparkles size={14} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleCabinFilter(tab.key)}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-3 rounded-full text-xs md:text-sm font-black uppercase tracking-wider transition-all border-2 ${
                cabinFilter === tab.key
                  ? "bg-brand-primary text-white border-brand-primary shadow-lg"
                  : "bg-white text-slate-500 border-slate-200 hover:border-brand-secondary hover:text-brand-secondary"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${cabinFilter === tab.key ? "bg-white/20" : "bg-slate-100"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Flight Results */}
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl md:text-2xl font-black text-brand-primary tracking-tight">
            {cabinFilter === "all" ? "All Flights" : CABIN_LABELS[cabinFilter] + " Flights"}
          </h3>
          <span className="text-xs md:text-sm font-bold text-slate-400">{flights.length} flights found</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 md:py-20 space-y-4">
            <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 font-bold text-sm">Finding the best routes...</p>
          </div>
        ) : flights.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:gap-6">
            {flights.map((flight) => {
              const isPrivate = flight.airline.includes("Private");
              return (
                <motion.div
                  key={flight.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="card hover:border-brand-secondary transition-all overflow-hidden"
                >
                  {/* Private Jet Image Banner */}
                  {isPrivate && cabinFilter === "private_jet" && (
                    <div className="w-full h-32 md:h-44 -mb-2 overflow-hidden rounded-t-[1.5rem]">
                      <PrivateJetSVG />
                    </div>
                  )}

                  {/* Mobile layout */}
                  <div className="md:hidden p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPrivate ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-brand-primary"}`}>
                          {isPrivate ? <Sparkles size={16} /> : <Plane size={16} />}
                        </div>
                        <div>
                          <p className="font-black text-brand-primary text-xs uppercase tracking-tight">{flight.airline}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{flight.flight_number}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-base font-black text-brand-primary">
                          {new Date(flight.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className="text-xs font-bold text-slate-500">{flight.origin}</p>
                      </div>
                      <div className="flex-[2] flex flex-col items-center gap-1">
                        <div className="w-full h-px bg-slate-200 relative">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-1">
                            <Plane size={12} className="text-brand-secondary rotate-90" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-slate-400">
                          <span className="font-bold">{formatDuration(flight.duration_minutes)}</span>
                          <span>·</span>
                          <span>{formatDistance(flight.distance_km)}</span>
                        </div>
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-base font-black text-brand-primary">
                          {new Date(flight.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className="text-xs font-bold text-slate-500">{flight.destination}</p>
                      </div>
                    </div>

                    {/* Cabin cards for mobile */}
                    <div className="grid grid-cols-3 gap-2">
                      {flight.cabins?.map((cabin) => (
                        <button
                          key={cabin.class}
                          onClick={() => { setSelectedFlight(flight); setSelectedCabin(cabin.class); }}
                          className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                            cabin.class === "economy" ? "border-blue-100 bg-blue-50/50 hover:bg-blue-50" :
                            cabin.class === "first_class" ? "border-amber-100 bg-amber-50/50 hover:bg-amber-50" :
                            "border-purple-100 bg-purple-50/50 hover:bg-purple-50"
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {CABIN_ICONS[cabin.class]}
                            <span className={`text-[9px] font-black uppercase ${
                              cabin.class === "economy" ? "text-blue-600" :
                              cabin.class === "first_class" ? "text-amber-600" :
                              "text-purple-600"
                            }`}>
                              {cabin.label === "Private Jet" ? "Private" : cabin.label === "First Class" ? "First" : "Economy"}
                            </span>
                          </div>
                          <span className="text-sm font-black text-brand-primary">${cabin.price.toLocaleString()}</span>
                          <span className="text-[9px] font-bold text-emerald-600">{cabin.available_seats} seats</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div className={`hidden md:flex flex-col lg:flex-row items-stretch gap-0 ${isPrivate && cabinFilter === "private_jet" ? "mt-0" : ""}`}>
                    <div className="flex-1 p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPrivate ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-brand-primary"}`}>
                            {isPrivate ? <Sparkles size={20} /> : <Plane size={24} />}
                          </div>
                          <div>
                            <p className="font-black text-brand-primary uppercase tracking-tight">{flight.airline}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase">{flight.flight_number}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">From</p>
                          <p className="text-2xl font-black text-brand-secondary tracking-tighter">
                            ${flight.cabins?.[0]?.price.toLocaleString() || flight.price.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-xl font-black text-brand-primary">
                            {new Date(flight.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-sm font-bold text-slate-500">{flight.origin}</p>
                        </div>
                        <div className="flex-[2] flex flex-col items-center gap-2">
                          <div className="w-full h-px bg-slate-200 relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                              <Plane size={16} className="text-brand-secondary rotate-90" />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1 font-bold"><Clock size={10} /> {formatDuration(flight.duration_minutes)}</span>
                            <span className="font-black">·</span>
                            <span className="flex items-center gap-1 font-bold"><Ruler size={10} /> {formatDistance(flight.distance_km)}</span>
                          </div>
                        </div>
                        <div className="flex-1 text-right">
                          <p className="text-xl font-black text-brand-primary">
                            {new Date(flight.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-sm font-bold text-slate-500">{flight.destination}</p>
                        </div>
                      </div>
                    </div>

                    <div className="lg:border-l border-t lg:border-t-0 border-slate-100 flex flex-col lg:flex-row">
                      {flight.cabins?.map((cabin) => (
                        <button
                          key={cabin.class}
                          onClick={() => { setSelectedFlight(flight); setSelectedCabin(cabin.class); }}
                          className={`flex-1 p-5 flex flex-col items-center justify-center gap-2 transition-all min-w-[140px] ${
                            cabin.class === "economy" ? "hover:bg-blue-50 border-b lg:border-b-0 lg:border-r border-slate-100" :
                            cabin.class === "first_class" ? "hover:bg-amber-50 border-b lg:border-b-0 lg:border-r border-slate-100" :
                            "hover:bg-purple-50"
                          }`}
                        >
                          <div className={`flex items-center gap-1.5 ${
                            cabin.class === "economy" ? "text-blue-600" :
                            cabin.class === "first_class" ? "text-amber-600" :
                            "text-purple-600"
                          }`}>
                            {CABIN_ICONS[cabin.class]}
                            <span className="text-xs font-black uppercase tracking-wider">{cabin.label}</span>
                          </div>
                          <p className="text-xl font-black text-brand-primary">${cabin.price.toLocaleString()}</p>
                          <p className="text-[10px] font-bold text-emerald-600">{cabin.available_seats} seats</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 md:py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 space-y-3">
            <Plane size={40} className="text-slate-200 mx-auto" />
            <p className="text-slate-400 font-bold text-sm md:text-base">No flights found for this route.</p>
            <button onClick={handleShowAll} className="btn-outline py-2 px-6 text-xs">Show All Flights</button>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedFlight && bookingCabin && (
          <div
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-end md:items-center justify-center z-[60] p-0 md:p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white w-full md:max-w-lg md:rounded-[2rem] rounded-t-[2rem] shadow-2xl max-h-[92vh] md:max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky Header */}
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 shrink-0">
                <h3 className="text-lg md:text-2xl font-black text-brand-primary tracking-tight">
                  {bookingStep === "form" ? "Book Flight" : bookingStep === "payment" ? "Complete Payment" : "Processing"}
                </h3>
                <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-all">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 overscroll-contain">

                {/* ===== STEP 1: BOOKING FORM ===== */}
                {bookingStep === "form" && (
                  <>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Flight</span>
                        <span className="font-bold text-brand-primary text-sm">{selectedFlight.airline} {selectedFlight.flight_number}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route</span>
                        <span className="font-bold text-brand-primary text-sm">{selectedFlight.origin} → {selectedFlight.destination}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-black text-brand-primary">
                            {new Date(selectedFlight.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500">{new Date(selectedFlight.departure_time).toLocaleDateString()}</p>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full h-px bg-slate-200 relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-50 px-2">
                              <Plane size={12} className="text-brand-secondary rotate-90" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-slate-400">
                            <span className="font-bold">{formatDuration(selectedFlight.duration_minutes)}</span>
                            <span>·</span>
                            <span>{formatDistance(selectedFlight.distance_km)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-brand-primary">
                            {new Date(selectedFlight.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500">{new Date(selectedFlight.arrival_time).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400">Select Cabin</label>
                      <div className="grid grid-cols-3 gap-2 md:gap-3">
                        {selectedFlight.cabins?.map((cabin) => (
                          <button
                            key={cabin.class}
                            type="button"
                            onClick={() => setSelectedCabin(cabin.class)}
                            className={`p-3 md:p-4 rounded-2xl border-2 text-center transition-all ${
                              selectedCabin === cabin.class
                                ? `${CABIN_COLORS[cabin.class]} border-current shadow-md`
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <span className="flex items-center gap-1">
                                {CABIN_ICONS[cabin.class]}
                                <span className="text-[10px] md:text-xs font-black uppercase">{cabin.label}</span>
                              </span>
                              <span className="text-base md:text-lg font-black">${cabin.price.toLocaleString()}</span>
                              <span className="text-[9px] md:text-[10px] font-bold opacity-60">{cabin.available_seats} seats</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {bookingCabin.perks && (
                      <div className="p-3 md:p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3">Included Perks</p>
                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                          {bookingCabin.perks.map((perk) => (
                            <span key={perk} className="flex items-center gap-1 px-2 md:px-3 py-1 bg-white rounded-full text-[10px] md:text-xs font-bold text-slate-600 border border-slate-200">
                              <Star size={8} className="text-brand-secondary" />
                              {perk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center p-4 bg-brand-primary/5 rounded-2xl">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Total Price</span>
                      <span className="text-2xl md:text-3xl font-black text-brand-secondary">${bookingCabin.price.toLocaleString()}</span>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">Passenger Name</label>
                        <input
                          required
                          className="input text-sm"
                          placeholder="Full name as on passport"
                          value={bookingData.passenger_name}
                          onChange={(e) => setBookingData({ ...bookingData, passenger_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">Passport Number (Optional)</label>
                        <input
                          className="input text-sm"
                          placeholder="Passport ID"
                          value={bookingData.passport_number}
                          onChange={(e) => setBookingData({ ...bookingData, passport_number: e.target.value })}
                        />
                      </div>
                    </div>

                    {bookingError && (
                      <div className="p-3 md:p-4 bg-red-50 text-red-600 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2">
                        <AlertCircle size={16} />
                        {bookingError}
                      </div>
                    )}
                  </>
                )}

                {/* ===== STEP 2: PAYMENT INSTRUCTIONS ===== */}
                {bookingStep === "payment" && (
                  <div className="space-y-6">
                    <div className="text-center py-4 space-y-3">
                      <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                        <CreditCard size={32} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-lg font-black text-brand-primary">Complete Your Payment</h4>
                        <p className="text-sm text-slate-500">Transfer the amount below to confirm your booking.</p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Flight</span>
                        <span className="font-bold text-brand-primary text-sm">{selectedFlight.flight_number}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route</span>
                        <span className="font-bold text-brand-primary text-sm">{selectedFlight.origin} → {selectedFlight.destination}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cabin</span>
                        <span className="font-bold text-brand-primary text-sm">{CABIN_LABELS[selectedCabin]}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Amount Due</span>
                        <span className="text-2xl font-black text-brand-secondary">${bookingCabin.price.toLocaleString()}</span>
                      </div>
                    </div>

                    {hasPaymentInfo ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <CreditCard size={18} className="text-brand-secondary" />
                          <p className="text-sm font-black text-brand-primary uppercase tracking-wider">Payment Details</p>
                        </div>
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-bold">Bank / Provider</span>
                              <span className="font-bold text-brand-primary">{paymentAccount.bank_name}</span>
                            </div>
                            {paymentAccount.account_name && (
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-bold">Account Name</span>
                                <span className="font-bold text-brand-primary">{paymentAccount.account_name}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 font-bold">Account / IBAN</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-brand-primary font-mono">{paymentAccount.account_number}</span>
                                <button onClick={handleCopyAccount} className="p-1 rounded-md hover:bg-amber-100 transition-all">
                                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-400" />}
                                </button>
                              </div>
                            </div>
                            {paymentAccount.routing_number && (
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-bold">Routing / SWIFT</span>
                                <span className="font-bold text-brand-primary font-mono">{paymentAccount.routing_number}</span>
                              </div>
                            )}
                          </div>
                          {paymentAccount.payment_note && (
                            <p className="text-xs text-amber-700 italic pt-2 border-t border-amber-200">{paymentAccount.payment_note}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-2">
                        <CreditCard size={24} className="text-slate-300 mx-auto" />
                        <p className="text-sm font-bold text-slate-400">Payment details will be provided by the administrator.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ===== STEP 3: PROCESSING ===== */}
                {bookingStep === "processing" && (
                  <div className="space-y-6 py-8">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Loader2 size={40} className="text-brand-primary animate-spin" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xl font-black text-brand-primary">Payment Processing</h4>
                        <p className="text-sm text-slate-500">Waiting for admin confirmation. Your booking will appear on your dashboard once approved.</p>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-amber-600" />
                        <p className="text-sm font-black text-amber-700 uppercase tracking-wider">What happens next?</p>
                      </div>
                      <ol className="space-y-2 text-sm text-amber-800">
                        <li className="flex items-start gap-2">
                          <span className="font-black mt-0.5">1.</span>
                          <span>Admin will verify your payment</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-black mt-0.5">2.</span>
                          <span>Once confirmed, your flight ticket will appear on your dashboard</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-black mt-0.5">3.</span>
                          <span>You can download your e-ticket after the flight lands</span>
                        </li>
                      </ol>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Flight</span>
                        <span className="font-bold text-brand-primary text-sm">{selectedFlight.flight_number}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route</span>
                        <span className="font-bold text-brand-primary text-sm">{selectedFlight.origin} → {selectedFlight.destination}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cabin</span>
                        <span className="font-bold text-brand-primary text-sm">{CABIN_LABELS[selectedCabin]}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</span>
                        <span className="font-black text-brand-secondary">${bookingCabin.price.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Sticky Footer */}
              {bookingStep === "form" && (
                <div className="p-4 md:p-6 border-t border-slate-100 shrink-0">
                  <div className="flex gap-3">
                    <button type="button" onClick={closeModal} className="btn-outline flex-1 py-3 md:py-4 text-sm md:text-base">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleBook}
                      className="btn-primary flex-1 py-3 md:py-4 text-sm md:text-base"
                    >
                      Confirm Booking
                    </button>
                  </div>
                </div>
              )}
              {bookingStep === "payment" && (
                <div className="p-4 md:p-6 border-t border-slate-100 shrink-0">
                  <div className="flex gap-3">
                    <button type="button" onClick={closeModal} className="btn-outline flex-1 py-3 md:py-4 text-sm md:text-base">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingStep("processing")}
                      className="btn-primary flex-1 py-3 md:py-4 text-sm md:text-base flex items-center justify-center gap-2"
                    >
                      <Check size={18} />
                      I Have Paid
                    </button>
                  </div>
                </div>
              )}
              {bookingStep === "processing" && (
                <div className="p-4 md:p-6 border-t border-slate-100 shrink-0">
                  <button onClick={closeModal} className="btn-primary w-full py-3 md:py-4 text-sm md:text-base">
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
