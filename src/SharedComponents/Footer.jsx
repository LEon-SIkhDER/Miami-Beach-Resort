import React from 'react'
import { Link } from 'react-router'
import logo from '../assets/logo.png'
import { 
    MapPin, 
    Phone, 
    Mail, 
    Clock, 
    ShieldCheck, 
    Facebook,
    Instagram,
    Youtube
} from 'lucide-react'

const Footer = () => {
    return (
        <footer className="bg-slate-950 text-slate-300 pt-16 pb-8 border-t border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Main 4-column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-slate-800/80">
                    
                    {/* Brand & Mission (Col 1 - 4) */}
                    <div className="lg:col-span-4 space-y-4">
                        <Link to="/" className="flex items-center gap-3 group select-none">
                            <img 
                                src={logo} 
                                alt="Miami Beach Resort Logo" 
                                className="h-12 w-auto object-contain bg-white/10 p-1.5 rounded-2xl border border-white/10" 
                            />
                            <div>
                                <h3 className="text-xl font-black tracking-tight text-white font-serif">
                                    Miami Beach Resort
                                </h3>
                                <p className="text-xs text-teal-400 font-semibold tracking-wider uppercase">
                                    Cox's Bazar, Bangladesh
                                </p>
                            </div>
                        </Link>
                        
                        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
                            Experience prime beachfront luxury, cool ocean breeze, and top-tier hospitality right at Dolphin Mor, Kolatoli Beach, Cox's Bazar.
                        </p>

                        <div className="pt-2 flex items-center gap-3">
                            <a 
                                href="https://facebook.com" 
                                target="_blank" 
                                rel="noreferrer" 
                                className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-teal-400 hover:border-teal-500/40 transition-colors"
                            >
                                <Facebook size={16} />
                            </a>
                            <a 
                                href="https://instagram.com" 
                                target="_blank" 
                                rel="noreferrer" 
                                className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-teal-400 hover:border-teal-500/40 transition-colors"
                            >
                                <Instagram size={16} />
                            </a>
                            <a 
                                href="https://youtube.com" 
                                target="_blank" 
                                rel="noreferrer" 
                                className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-teal-400 hover:border-teal-500/40 transition-colors"
                            >
                                <Youtube size={16} />
                            </a>
                        </div>
                    </div>

                    {/* Quick Navigation Links (Col 5 - 6) */}
                    <div className="lg:col-span-2 space-y-3.5">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-teal-400">
                            Explore
                        </h4>
                        <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400 font-medium">
                            <li>
                                <Link to="/" className="hover:text-white hover:translate-x-1 inline-block transition-all">
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link to="/about" className="hover:text-white hover:translate-x-1 inline-block transition-all">
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link to="/services" className="hover:text-white hover:translate-x-1 inline-block transition-all">
                                    Services & Amenities
                                </Link>
                            </li>
                            <li>
                                <Link to="/my-bookings" className="hover:text-white hover:translate-x-1 inline-block transition-all">
                                    My Bookings
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resort Facilities (Col 7 - 9) */}
                    <div className="lg:col-span-3 space-y-3.5">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-teal-400">
                            Resort Amenities
                        </h4>
                        <ul className="space-y-2 text-xs text-slate-400">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                                24/7 Power Backup & Generator
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                                High-Speed Optical Fiber Wi-Fi
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                                Multi-Cuisine Seafood Restaurant
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                                Airport / Bus Terminal Transport
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                                Coastal Sightseeing & Tour Desk
                            </li>
                        </ul>
                    </div>

                    {/* Direct Contact & Location (Col 10 - 12) */}
                    <div className="lg:col-span-3 space-y-3.5">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-teal-400">
                            Resort Front Desk
                        </h4>
                        <div className="space-y-2.5 text-xs text-slate-400">
                            <p className="flex items-start gap-2.5 leading-relaxed">
                                <MapPin size={15} className="text-teal-400 shrink-0 mt-0.5" />
                                <span>Dolphin Mor, Kolatoli Beach Road, Cox's Bazar, Bangladesh</span>
                            </p>
                            <p className="flex items-center gap-2.5">
                                <Phone size={15} className="text-teal-400 shrink-0" />
                                <a href="tel:+8801616472282" className="font-bold text-white hover:text-teal-300 transition-colors">
                                    +8801616472282
                                </a>
                            </p>
                            <p className="flex items-center gap-2.5">
                                <Mail size={15} className="text-teal-400 shrink-0" />
                                <span>booking@miamibeachresort.com</span>
                            </p>
                            <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-1 mt-2">
                                <p className="text-[11px] font-bold text-teal-300 flex items-center gap-1.5">
                                    <Clock size={13} /> Check-In / Check-Out
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    Check-In: <strong>01:00 PM</strong> | Check-Out: <strong>11:00 AM</strong>
                                </p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Bottom Copyright & Security */}
                <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                    <p>
                        © {new Date().getFullYear()} <strong className="text-slate-300">Miami Beach Resort</strong>. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                            <ShieldCheck size={13} className="text-teal-400" /> Secure Online & Frontdesk Booking
                        </span>
                        <span>•</span>
                        <span>Cox's Bazar, Bangladesh</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer
