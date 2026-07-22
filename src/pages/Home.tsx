import React from "react";
import { motion } from "motion/react";
import { MessageSquare, Shield, Globe, Zap, CheckCircle2, Star, Plane, Bike, Bus, Package } from "lucide-react";

interface HomeProps {
  onSupportClick: () => void;
}

export const Home = ({ onSupportClick }: HomeProps) => {
  return (
    <div className="">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 md:py-20 lg:py-32">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
          <motion.div 
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute top-20 left-0 text-brand-secondary"
          >
            <Plane size={120} />
          </motion.div>
          <motion.div 
            animate={{ x: ["100%", "-100%"] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-40 right-0 text-brand-secondary"
          >
            <Bus size={100} />
          </motion.div>
          <motion.div 
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear", delay: 5 }}
            className="absolute top-1/2 left-0 text-brand-secondary"
          >
            <Bike size={80} />
          </motion.div>
        </div>
        <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6 md:space-y-8 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 bg-brand-secondary/10 text-brand-secondary px-4 py-2 rounded-full font-bold text-sm mx-auto lg:mx-0">
              <Zap size={16} />
              <span>UNBEATABLE TRUCKING AND TRANSPORT SERVICES</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-brand-primary leading-[1.1] tracking-tighter uppercase">
              CRANE TO TRAIN, <br className="hidden md:block" />
              <span className="bg-linear-to-br from-brand-secondary to-brand-accent bg-clip-text text-transparent">WE DO EVERYTHING.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Starting from loading to unloading and maintaining the highest standards in terms of safety while in transit, we take nothing to chance.
            </p>
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
              <button onClick={onSupportClick} className="btn-primary flex items-center justify-center gap-2 text-lg py-4 px-8">
                Support <MessageSquare size={20} />
              </button>
              <button className="btn-outline text-lg py-4 px-8">Our Solutions</button>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <img 
                    key={i} 
                    src={`https://picsum.photos/seed/user${i}/100/100`} 
                    className="w-12 h-12 rounded-full border-4 border-white shadow-lg" 
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
              <div className="text-sm">
                <div className="flex text-yellow-400 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} fill="currentColor" />)}
                </div>
                <p className="font-bold text-brand-primary">Trusted by 10k+ companies</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative h-[400px] md:h-[500px] lg:h-[600px] rounded-3xl overflow-hidden shadow-2xl border border-white/20 group"
          >
            <div className="absolute -inset-4 bg-brand-secondary/20 blur-3xl rounded-full" />
            
            <div className="absolute inset-0 w-full h-full">
              <motion.img 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                src="https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?auto=format&fit=crop&w=1200&q=80" 
                alt="Global Logistics" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/80 via-brand-primary/20 to-transparent" />
            
            <div className="absolute bottom-10 left-10 right-10 space-y-4">
              <div className="flex gap-3">
                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white text-xs font-bold uppercase tracking-widest">Air Freight</div>
                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white text-xs font-bold uppercase tracking-widest">Ground Shipping</div>
              </div>
              <h3 className="text-3xl font-black text-white leading-tight">Moving the world, <br />one delivery at a time.</h3>
            </div>

            {/* Floating UI Elements */}
            <motion.div 
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-10 right-10 bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 hidden md:block z-10"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</p>
                  <p className="text-lg font-black text-brand-primary">In Transit</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-20 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-brand-primary tracking-tight uppercase flex items-baseline justify-center gap-2 flex-wrap">
              WELCOME TO DIPLOMATIC <span className="flex items-baseline">
                <span className="text-4xl md:text-5xl bg-linear-to-br from-brand-secondary to-brand-accent bg-clip-text text-transparent">X</span>
                <span className="bg-linear-to-br from-brand-secondary to-brand-accent bg-clip-text text-transparent">PRESS</span>
              </span> LOGISTICS
            </h2>
            <p className="text-base md:text-lg text-slate-600">Diplomatic Xpress Logistics is on the mission of reducing freight management inefficiencies and providing maximum cost savings for our clients.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Globe, title: "Cargo", desc: "Team of cargo experts are always available to help you with any queries you might have, or if you want to consult in length your logistic requirements." },
              { icon: Shield, title: "Logistic Service", desc: "We provide logistic services in the nation, whether it is freight transportation, supply chain solutions, warehousing and distribution." },
              { icon: Zap, title: "Storage", desc: "We take pride in catering to a broad range of clientele throughout the country with our warehousing services, which is comprehensive, reliable and flexible." }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="p-10 rounded-3xl bg-brand-bg border border-slate-100 space-y-6 transition-all"
              >
                <div className="w-16 h-16 bg-linear-to-br from-brand-secondary to-brand-accent text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-secondary/20">
                  <feature.icon size={32} />
                </div>
                <h3 className="text-2xl font-bold text-brand-primary">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 md:py-24 bg-brand-bg">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-20 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-brand-primary tracking-tight uppercase">Our <span className="text-brand-secondary">Services</span></h2>
            <p className="text-base md:text-lg text-slate-600">End-to-end logistics solutions tailored to your business needs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Package, title: "Parcel Delivery", desc: "Fast and secure door-to-door parcel delivery across all 50 states and 190+ countries." },
              { icon: Globe, title: "International Freight", desc: "Ocean and air freight solutions with customs clearance and documentation support." },
              { icon: Shield, title: "Warehousing", desc: "Secure storage facilities with inventory management and pick-and-pack services." },
              { icon: Zap, title: "Express Courier", desc: "Same-day and next-day express delivery for urgent shipments and documents." }
            ].map((service, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card text-center space-y-4 hover:shadow-2xl hover:border-brand-secondary/20 transition-all group"
              >
                <div className="w-14 h-14 bg-brand-secondary/10 text-brand-secondary rounded-2xl flex items-center justify-center mx-auto group-hover:bg-brand-secondary group-hover:text-white transition-all">
                  <service.icon size={28} />
                </div>
                <h3 className="text-lg font-black text-brand-primary">{service.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{service.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Warehouse Locations */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-brand-primary tracking-tight uppercase">Global <span className="text-brand-secondary">Warehouse</span> Network</h2>
            <p className="text-base md:text-lg text-slate-600">Strategically located hubs for efficient distribution worldwide.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { city: "New York", country: "United States", code: "JFK", status: "Operational" },
              { city: "London", country: "United Kingdom", code: "LHR", status: "Operational" },
              { city: "Dubai", country: "UAE", code: "DXB", status: "Operational" },
              { city: "Singapore", country: "Singapore", code: "SIN", status: "Operational" },
              { city: "Toronto", country: "Canada", code: "YYZ", status: "Operational" },
              { city: "Sydney", country: "Australia", code: "SYD", status: "Operational" }
            ].map((loc, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="card flex items-center gap-4 hover:border-brand-secondary/20 transition-all"
              >
                <div className="w-12 h-12 bg-brand-primary/5 rounded-xl flex items-center justify-center text-brand-primary font-black text-sm shrink-0">
                  {loc.code}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-brand-primary">{loc.city}</p>
                  <p className="text-xs text-slate-400">{loc.country}</p>
                </div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">{loc.status}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-brand-primary text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-secondary via-transparent to-transparent" />
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
            {[
              { label: "Packages Delivered", value: "50M+" },
              { label: "Active Countries", value: "190+" },
              { label: "Happy Customers", value: "1M+" },
              { label: "Success Rate", value: "99.9%" }
            ].map((stat, i) => (
              <div key={i} className="space-y-2">
                <p className="text-5xl font-black bg-linear-to-br from-brand-secondary to-brand-accent bg-clip-text text-transparent">{stat.value}</p>
                <p className="text-slate-400 font-medium uppercase tracking-widest text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-linear-to-br from-brand-primary to-brand-accent rounded-[3rem] p-12 lg:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-brand-primary/40">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-secondary/20 blur-[100px] rounded-full -mr-48 -mt-48" />
            <div className="relative z-10 space-y-8">
              <h2 className="text-4xl lg:text-5xl font-black tracking-tight uppercase">Ready to optimize your supply chain?</h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto">Join thousands of businesses that trust DIPLOMATIC XPRESS LOGISTICS for their global shipping needs.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <button className="bg-white text-brand-primary px-10 py-4 rounded-2xl font-black text-lg hover:bg-slate-50 transition-all">Get Started Now</button>
                <button className="bg-linear-to-br from-brand-secondary to-brand-accent text-white px-10 py-4 rounded-2xl font-black text-lg hover:opacity-90 transition-all">Contact Sales</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
