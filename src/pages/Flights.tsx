import React, { useState, useEffect } from "react";
import { Plane, Search, MapPin, CheckCircle2, AlertCircle, Crown, Sparkles, Star } from "lucide-react";
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

const CABIN_ICONS: Record<string, React.ReactNode> = {
  economy: <Plane size={14} />,
  first_class: <Crown size={14} />,
  private_jet: <Sparkles size={14} />,
};

export const Flights = ({ user, setActiveTab }: FlightsProps) => {
  const [allFlights, setAllFlights] = useState<Flight[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState({ origin: "", destination: "" });
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [selectedCabin, setSelectedCabin] = useState<string>("economy");
  const [cabinFilter, setCabinFilter] = useState<string>("all");
  const [bookingData, setBookingData] = useState({ passenger_name: user?.username || "", passport_number: "" });
  const [bookingStatus, setBookingStatus] = useState<{ success?: boolean; error?: string } | null>(null);

  useEffect(() => {
    fetchFlights();
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
    const originQ = search.origin.toLowerCase().trim();
    const destQ = search.destination.toLowerCase().trim();
    const filtered = allFlights.filter((fl) => {
      const matchOrigin = !originQ || fl.origin.toLowerCase().includes(originQ);
      const matchDest = !destQ || fl.destination.toLowerCase().includes(destQ);
      return matchOrigin && matchDest;
    });
    setFlights(filtered);
  };

  const handleShowAll = () => {
    setSearch({ origin: "", destination: "" });
    setFlights(allFlights);
  };

  const getCabin = (flight: Flight, cabinClass: string): FlightCabin | undefined => {
    return flight.cabins?.find((c) => c.class === cabinClass);
  };

  const getDisplayedPrice = (flight: Flight): number => {
    const cabin = getCabin(flight, cabinFilter === "all" ? "economy" : cabinFilter);
    return cabin?.price ?? flight.price;
  };

  const filteredFlights = cabinFilter === "all"
    ? flights
    : flights.filter((fl) => fl.cabins?.some((c) => c.class === cabinFilter));

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setActiveTab("auth");
      return;
    }
    if (!selectedFlight) return;

    try {
      const res = await fetch(`/api/flights/${selectedFlight.id}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          passenger_name: bookingData.passenger_name,
          passport_number: bookingData.passport_number,
          cabin_class: selectedCabin,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBookingStatus({ success: true });
        setTimeout(() => {
          setSelectedFlight(null);
          setBookingStatus(null);
          setSelectedCabin("economy");
          fetchFlights();
        }, 3000);
      } else {
        setBookingStatus({ error: data.error });
      }
    } catch {
      setBookingStatus({ error: "Failed to book flight. Please try again." });
    }
  };

  const bookingCabin = selectedFlight ? getCabin(selectedFlight, selectedCabin) : undefined;

  return (
    <div className="py-20 max-w-7xl mx-auto px-6 space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h2 className="text-4xl md:text-6xl font-black text-brand-primary tracking-tight">
          Fly with <span className="text-brand-secondary">Xpress</span>
        </h2>
        <p className="text-lg text-slate-500">Book your next adventure with our diplomatic flight network. Fast, secure, and global.</p>
      </div>

      {/* Search Bar */}
      <div className="card bg-brand-primary p-8 md:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-secondary/10 blur-3xl rounded-full -mr-32 -mt-32" />
        <form onSubmit={handleSearch} className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-white/60">Origin</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white text-brand-primary font-bold focus:outline-none focus:ring-4 focus:ring-brand-secondary/20 transition-all"
                placeholder="From where?"
                value={search.origin}
                onChange={(e) => setSearch({ ...search, origin: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-white/60">Destination</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary" size={20} />
              <input
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white text-brand-primary font-bold focus:outline-none focus:ring-4 focus:ring-brand-secondary/20 transition-all"
                placeholder="To where?"
                value={search.destination}
                onChange={(e) => setSearch({ ...search, destination: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <button type="submit" className="w-full btn-secondary py-4 flex items-center justify-center gap-2 text-lg">
              <Search size={20} />
              Search
            </button>
            {(search.origin || search.destination) && (
              <button type="button" onClick={handleShowAll} className="btn-outline py-4 px-4 text-sm whitespace-nowrap">
                Show All
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Cabin Filter */}
      <div className="flex flex-wrap gap-3 justify-center">
        {[
          { key: "all", label: "All Flights", icon: <Plane size={16} /> },
          { key: "economy", label: "Economy ($500-$1K)", icon: <Plane size={16} /> },
          { key: "first_class", label: "First Class ($1.5K-$5.5K)", icon: <Crown size={16} /> },
          { key: "private_jet", label: "Private Jet ($10K+)", icon: <Sparkles size={16} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setCabinFilter(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-black uppercase tracking-wider transition-all border-2 ${
              cabinFilter === tab.key
                ? "bg-brand-primary text-white border-brand-primary shadow-lg"
                : "bg-white text-slate-500 border-slate-200 hover:border-brand-secondary hover:text-brand-secondary"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Flight Results */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black text-brand-primary tracking-tight">Available Flights</h3>
          <span className="text-sm font-bold text-slate-400">{filteredFlights.length} flights found</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 font-bold">Finding the best routes...</p>
          </div>
        ) : filteredFlights.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {filteredFlights.map((flight) => {
              const eco = getCabin(flight, "economy");
              const first = getCabin(flight, "first_class");
              const priv = getCabin(flight, "private_jet");

              return (
                <motion.div
                  key={flight.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="card group hover:border-brand-secondary transition-all"
                >
                  <div className="flex flex-col lg:flex-row items-stretch gap-0">
                    {/* Main Info */}
                    <div className="flex-1 p-6 space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-brand-primary">
                            <Plane size={24} />
                          </div>
                          <div>
                            <p className="font-black text-brand-primary uppercase tracking-tight">{flight.airline}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase">{flight.flight_number}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">From</p>
                          <p className="text-2xl font-black text-brand-secondary tracking-tighter">
                            ${eco?.price.toLocaleString() || flight.price.toLocaleString()}
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
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Direct Flight</p>
                        </div>
                        <div className="flex-1 text-right">
                          <p className="text-xl font-black text-brand-primary">
                            {new Date(flight.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-sm font-bold text-slate-500">{flight.destination}</p>
                        </div>
                      </div>
                    </div>

                    {/* Cabin Classes */}
                    <div className="lg:border-l border-t lg:border-t-0 border-slate-100 flex flex-col lg:flex-row">
                      {eco && (
                        <button
                          onClick={() => { setSelectedFlight(flight); setSelectedCabin("economy"); }}
                          className="flex-1 p-5 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 transition-all border-b lg:border-b-0 lg:border-r border-slate-100 min-w-[140px]"
                        >
                          <div className="flex items-center gap-1.5 text-blue-600">
                            <Plane size={16} />
                            <span className="text-xs font-black uppercase tracking-wider">Economy</span>
                          </div>
                          <p className="text-xl font-black text-brand-primary">${eco.price.toLocaleString()}</p>
                          <p className="text-[10px] font-bold text-emerald-600">{eco.available_seats} seats</p>
                        </button>
                      )}
                      {first && (
                        <button
                          onClick={() => { setSelectedFlight(flight); setSelectedCabin("first_class"); }}
                          className="flex-1 p-5 flex flex-col items-center justify-center gap-2 hover:bg-amber-50 transition-all border-b lg:border-b-0 lg:border-r border-slate-100 min-w-[140px]"
                        >
                          <div className="flex items-center gap-1.5 text-amber-600">
                            <Crown size={16} />
                            <span className="text-xs font-black uppercase tracking-wider">First Class</span>
                          </div>
                          <p className="text-xl font-black text-brand-primary">${first.price.toLocaleString()}</p>
                          <p className="text-[10px] font-bold text-emerald-600">{first.available_seats} seats</p>
                        </button>
                      )}
                      {priv && (
                        <button
                          onClick={() => { setSelectedFlight(flight); setSelectedCabin("private_jet"); }}
                          className="flex-1 p-5 flex flex-col items-center justify-center gap-2 hover:bg-purple-50 transition-all min-w-[140px]"
                        >
                          <div className="flex items-center gap-1.5 text-purple-600">
                            <Sparkles size={16} />
                            <span className="text-xs font-black uppercase tracking-wider">Private Jet</span>
                          </div>
                          <p className="text-xl font-black text-brand-primary">${priv.price.toLocaleString()}</p>
                          <p className="text-[10px] font-bold text-emerald-600">{priv.available_seats} seats</p>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold">No flights matching your search were found.</p>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedFlight && bookingCabin && (
          <div
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => { setSelectedFlight(null); setBookingStatus(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Book Flight</h3>
                <button onClick={() => { setSelectedFlight(null); setBookingStatus(null); }} className="text-slate-400 hover:text-brand-primary">
                  <AlertCircle size={28} />
                </button>
              </div>

              {bookingStatus?.success ? (
                <div className="text-center py-12 space-y-6">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={48} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-black text-brand-primary">Booking Confirmed!</h4>
                    <p className="text-slate-500">Your ticket has been issued. View it in your dashboard.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBook} className="space-y-6">
                  {/* Flight Summary */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Flight</span>
                      <span className="font-bold text-brand-primary">{selectedFlight.airline} {selectedFlight.flight_number}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Route</span>
                      <span className="font-bold text-brand-primary">{selectedFlight.origin} → {selectedFlight.destination}</span>
                    </div>
                  </div>

                  {/* Cabin Selection */}
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Select Cabin</label>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedFlight.cabins?.map((cabin) => (
                        <button
                          key={cabin.class}
                          type="button"
                          onClick={() => setSelectedCabin(cabin.class)}
                          className={`p-4 rounded-2xl border-2 text-center transition-all ${
                            selectedCabin === cabin.class
                              ? `${CABIN_COLORS[cabin.class]} border-current shadow-md`
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="flex items-center gap-1">
                              {CABIN_ICONS[cabin.class]}
                              <span className="text-xs font-black uppercase">{cabin.label}</span>
                            </span>
                            <span className="text-lg font-black">${cabin.price.toLocaleString()}</span>
                            <span className="text-[10px] font-bold opacity-60">{cabin.available_seats} seats</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Perks */}
                  {bookingCabin.perks && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Included Perks</p>
                      <div className="flex flex-wrap gap-2">
                        {bookingCabin.perks.map((perk) => (
                          <span key={perk} className="flex items-center gap-1 px-3 py-1 bg-white rounded-full text-xs font-bold text-slate-600 border border-slate-200">
                            <Star size={10} className="text-brand-secondary" />
                            {perk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Total Price */}
                  <div className="flex justify-between items-center p-4 bg-brand-primary/5 rounded-2xl">
                    <span className="text-sm font-black text-slate-500 uppercase tracking-wider">Total Price</span>
                    <span className="text-3xl font-black text-brand-secondary">${bookingCabin.price.toLocaleString()}</span>
                  </div>

                  {/* Passenger Info */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400">Passenger Name</label>
                      <input
                        required
                        className="input"
                        placeholder="Full name as on passport"
                        value={bookingData.passenger_name}
                        onChange={(e) => setBookingData({ ...bookingData, passenger_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400">Passport Number (Optional)</label>
                      <input
                        className="input"
                        placeholder="Passport ID"
                        value={bookingData.passport_number}
                        onChange={(e) => setBookingData({ ...bookingData, passport_number: e.target.value })}
                      />
                    </div>
                  </div>

                  {bookingStatus?.error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2">
                      <AlertCircle size={18} />
                      {bookingStatus.error}
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button type="button" onClick={() => { setSelectedFlight(null); setBookingStatus(null); }} className="btn-outline flex-1 py-4">
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary flex-1 py-4 text-lg">
                      Confirm & Pay
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
