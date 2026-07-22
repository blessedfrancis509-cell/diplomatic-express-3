import React, { useState, useEffect } from "react";
import { Plane, Search, Calendar, MapPin, DollarSign, Users, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Flight, User } from "../types";

interface FlightsProps {
  user: User | null;
  setActiveTab: (tab: string) => void;
}

export const Flights = ({ user, setActiveTab }: FlightsProps) => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState({ origin: "", destination: "" });
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [bookingData, setBookingData] = useState({ passenger_name: user?.username || "", passport_number: "" });
  const [bookingStatus, setBookingStatus] = useState<{ success?: boolean; error?: string } | null>(null);

  useEffect(() => {
    fetchFlights();
  }, []);

  const fetchFlights = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(search).toString();
      const res = await fetch(`/api/flights?${query}`);
      if (res.ok) {
        const data = await res.json();
        setFlights(data);
      }
    } catch (err) {
      console.error("Failed to fetch flights:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFlights();
  };

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
          passport_number: bookingData.passport_number
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBookingStatus({ success: true });
        setTimeout(() => {
          setSelectedFlight(null);
          setBookingStatus(null);
          fetchFlights();
        }, 3000);
      } else {
        setBookingStatus({ error: data.error });
      }
    } catch (err) {
      setBookingStatus({ error: "Failed to book flight. Please try again." });
    }
  };

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
          <div className="flex items-end">
            <button type="submit" className="w-full btn-secondary py-4 flex items-center justify-center gap-2 text-lg">
              <Search size={20} />
              Search Flights
            </button>
          </div>
        </form>
      </div>

      {/* Flight Results */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black text-brand-primary tracking-tight">Available Flights</h3>
          <span className="text-sm font-bold text-slate-400">{flights.length} flights found</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 font-bold">Finding the best routes...</p>
          </div>
        ) : flights.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {flights.map((flight) => (
              <motion.div 
                key={flight.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="card group hover:border-brand-secondary transition-all cursor-pointer"
                onClick={() => setSelectedFlight(flight)}
              >
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-1 space-y-6 w-full">
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
                        <p className="text-2xl font-black text-brand-secondary tracking-tighter">${flight.price}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Per Passenger</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-xl font-black text-brand-primary">{new Date(flight.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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
                        <p className="text-xl font-black text-brand-primary">{new Date(flight.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-sm font-bold text-slate-500">{flight.destination}</p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-auto md:border-l border-slate-100 md:pl-8 flex flex-col items-center justify-center gap-4">
                    <div className="text-center">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Availability</p>
                      <p className="text-sm font-bold text-emerald-600">{flight.available_seats} Seats Left</p>
                    </div>
                    <button className="w-full btn-primary py-3 px-8 text-sm">Book Now</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold">No flights matching your search were found.</p>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedFlight && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setSelectedFlight(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Confirm Booking</h3>
                <button onClick={() => setSelectedFlight(null)} className="text-slate-400 hover:text-brand-primary">
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
                    <p className="text-slate-500">Your ticket has been issued. You can view it in your dashboard.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBook} className="space-y-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Flight</span>
                      <span className="font-bold text-brand-primary">{selectedFlight.airline} {selectedFlight.flight_number}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Route</span>
                      <span className="font-bold text-brand-primary">{selectedFlight.origin} → {selectedFlight.destination}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Price</span>
                      <span className="text-xl font-black text-brand-secondary">${selectedFlight.price}</span>
                    </div>
                  </div>

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
                    <button type="button" onClick={() => setSelectedFlight(null)} className="btn-outline flex-1 py-4">Cancel</button>
                    <button type="submit" className="btn-primary flex-1 py-4 text-lg">Confirm & Pay</button>
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
