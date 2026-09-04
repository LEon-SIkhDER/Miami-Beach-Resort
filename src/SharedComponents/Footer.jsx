import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import Logo from './Logo'
import toast from 'react-hot-toast'
import { 
    MapPin, 
    Phone, 
    Mail, 
    Clock, 
    ShieldCheck, 
    Facebook, 
    Instagram, 
    Youtube, 
    Sparkles, 
    ArrowRight, 
    CheckCircle2, 
    Send 
} from 'lucide-react'

const Footer = () => {
    const [newsletterEmail, setNewsletterEmail] = useState('')
    const location = useLocation()
    const navigate = useNavigate()

    const handleAnchorClick = (e, targetId) => {
        e.preventDefault()
        if (location.pathname === '/') {
            const el = document.getElementById(targetId)
            if (el) {
                el.scrollIntoView({ behavior: 'smooth' })
            }
        } else {
            navigate(`/#${targetId}`)
        }
    }

    const handleNewsletterSubmit = (e) => {
        e.preventDefault()
        if (!newsletterEmail.trim()) {
            toast.error("Please enter your email address")
            return
        }
        toast.success("Thank you for subscribing to Miami Beach Resort updates.")
        setNewsletterEmail('')
    }

    return (
        <footer id="contact" className="bg-[#021813] text-slate-300 pt-16 pb-10 border-t border-[#c5a880]/20 relative overflow-hidden">
            {/* Ambient gold glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-[#c5a880]/10 to-transparent pointer-events-none blur-2xl"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                
                {/* Main 4-column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/10">
                    
                    {/* Brand & Mission (Col 1 - 4) */}
                    <div className="lg:col-span-4 space-y-4">
                        <Logo imageSize="h-14" textSize="text-xl" />
                        
                        <p className="text-xs sm:text-sm text-slate-300/80 leading-relaxed max-w-sm font-light">
                            Enjoy prime beachfront comfort, ocean breeze, and top-tier hospitality right at Dolphin Mor, Kolatoli Beach, Cox's Bazar.
                        </p>

                        <div className="pt-1 flex items-center gap-3">
                            <a 
                                href="https://www.facebook.com/MiamiBeachResort.Coxsbazar" 
                                target="_blank" 
                                rel="noreferrer" 
                                aria-label="Facebook"
                                className="w-10 h-10 rounded-2xl bg-[#03221b] border border-[#c5a880]/30 flex items-center justify-center text-slate-300 hover:text-[#dfc89e] hover:border-[#dfc89e] transition-colors shadow-xs"
                            >
                                <Facebook size={17} />
                            </a>
                            <a 
                                href="https://www.instagram.com/miamibeachresort.coxsbazar" 
                                target="_blank" 
                                rel="noreferrer" 
                                aria-label="Instagram"
                                className="w-10 h-10 rounded-2xl bg-[#03221b] border border-[#c5a880]/30 flex items-center justify-center text-slate-300 hover:text-[#dfc89e] hover:border-[#dfc89e] transition-colors shadow-xs"
                            >
                                <Instagram size={17} />
                            </a>
                            <a 
                                href="https://www.youtube.com/@miamibeachresortcoxbazar" 
                                target="_blank" 
                                rel="noreferrer" 
                                aria-label="YouTube"
                                className="w-10 h-10 rounded-2xl bg-[#03221b] border border-[#c5a880]/30 flex items-center justify-center text-slate-300 hover:text-[#dfc89e] hover:border-[#dfc89e] transition-colors shadow-xs"
                            >
                                <Youtube size={17} />
                            </a>
                        </div>
                    </div>

                    {/* Quick Navigation Links (Col 5 - 6) */}
                    <div className="lg:col-span-2 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#dfc89e] font-serif">
                            Quick Links
                        </h4>
                        <ul className="space-y-3 text-xs sm:text-sm text-slate-300 font-medium">
                            <li>
                                <a 
                                    href="#rooms" 
                                    onClick={(e) => handleAnchorClick(e, 'rooms')}
                                    className="hover:text-[#dfc89e] hover:translate-x-1 inline-block transition-all cursor-pointer"
                                >
                                    Suites & Rooms
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="#services" 
                                    onClick={(e) => handleAnchorClick(e, 'services')}
                                    className="hover:text-[#dfc89e] hover:translate-x-1 inline-block transition-all cursor-pointer"
                                >
                                    Services & Amenities
                                </a>
                            </li>
                            <li>
                                <Link 
                                    to="/my-bookings" 
                                    className="hover:text-[#dfc89e] hover:translate-x-1 inline-block transition-all"
                                >
                                    My Bookings
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resort 10 Amenities List (Col 7 - 9) */}
                    <div className="lg:col-span-3 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#dfc89e] font-serif">
                            Services & Facilities
                        </h4>
                        <ul className="space-y-2 text-xs text-slate-300/90 font-light">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a880]"></span>
                                Swimming Pool Access
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a880]"></span>
                                AC Rooms
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a880]"></span>
                                Modern Washroom
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a880]"></span>
                                Free WiFi
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a880]"></span>
                                Complimentary Water & Toiletries
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a880]"></span>
                                Lift Available & Free Parking
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a880]"></span>
                                Generator Backup & 24/7 Housekeeping
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a880]"></span>
                                100% Security Hotel
                            </li>
                        </ul>
                    </div>

                    {/* Direct Contact & Location (Col 10 - 12) */}
                    <div className="lg:col-span-3 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#dfc89e] font-serif">
                            Resort Front Desk
                        </h4>
                        <div className="space-y-3 text-xs text-slate-300">
                            <p className="flex items-start gap-2.5 leading-relaxed">
                                <MapPin size={16} className="text-[#dfc89e] shrink-0 mt-0.5" />
                                <span>Dolphin Mor, Kolatoli Beach Road, Cox's Bazar, Bangladesh</span>
                            </p>
                            <p className="flex items-center gap-2.5">
                                <Phone size={16} className="text-[#dfc89e] shrink-0" />
                                <a 
                                    href="https://wa.me/8801616472282" 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="font-mono text-sm font-bold text-[#dfc89e] hover:text-white transition-colors"
                                >
                                    +8801616472282 (WhatsApp)
                                </a>
                            </p>
                            <p className="flex items-center gap-2.5">
                                <Mail size={16} className="text-[#dfc89e] shrink-0" />
                                <span>booking@miamibeachresort.com</span>
                            </p>
                            <div className="p-3 bg-[#03221b] rounded-2xl border border-[#c5a880]/30 space-y-1 mt-2">
                                <p className="text-[11px] font-bold text-[#dfc89e] flex items-center gap-1.5">
                                    <Clock size={14} /> Check-In / Check-Out
                                </p>
                                <p className="text-[11px] text-slate-300">
                                    Check-In: <strong>01:00 PM</strong> | Check-Out: <strong>11:00 AM</strong>
                                </p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Bottom Copyright & Security */}
                <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-light">
                    <p>
                        © {new Date().getFullYear()} <strong className="text-[#dfc89e] font-serif font-bold">Miami Beach Resort</strong>. All rights reserved.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-[#dfc89e]" /> 100% Genuine Booking & Frontdesk Support
                        </span>
                        <span>•</span>
                        <span>Dolphin Mor, Kolatoli, Cox's Bazar</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer
