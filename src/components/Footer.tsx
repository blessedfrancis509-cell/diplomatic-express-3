import React from "react";
import { Facebook, Twitter, Linkedin, Instagram, Mail, MapPin } from "lucide-react";
import { Logo } from "./Logo";

export const Footer = () => {
  return (
    <footer className="bg-brand-primary text-white pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-6">
          <Logo light size={48} />
          <p className="text-slate-400 leading-relaxed">
            Diplomatic Xpress Logistics is on the mission of reducing freight management inefficiencies and providing maximum cost savings for our clients.
          </p>
          <div className="flex gap-4">
            {[
              { Icon: Facebook, link: "#" },
              { Icon: Twitter, link: "#" },
              { Icon: Linkedin, link: "#" },
              { Icon: Instagram, link: "#" }
            ].map((item, i) => (
              <a key={i} href={item.link} target={item.link.startsWith('http') ? "_blank" : undefined} rel={item.link.startsWith('http') ? "noopener noreferrer" : undefined} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-secondary transition-colors">
                <item.Icon size={18} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-lg font-bold mb-6">Quick Links</h4>
          <ul className="space-y-4 text-slate-400">
            <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Our Services</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Tracking</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-lg font-bold mb-6">Services</h4>
          <ul className="space-y-4 text-slate-400">
            <li><a href="#" className="hover:text-white transition-colors">Air Freight</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Ocean Cargo</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Road Transport</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Warehousing</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-lg font-bold mb-6">Contact Us</h4>
          <ul className="space-y-4 text-slate-400">
            <li className="flex items-center gap-3">
              <Mail size={18} className="text-brand-secondary" />
              <span>DiplomaticXpressInfo@gmail.com</span>
            </li>
            <li className="flex items-center gap-3">
              <MapPin size={18} className="text-brand-secondary" />
              <span>345 diplomatic xpress cambrige</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-20 pt-10 border-t border-white/10 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} DIPLOMATIC XPRESS LOGISTICS. All rights reserved. Built for modern logistics.</p>
      </div>
    </footer>
  );
};
