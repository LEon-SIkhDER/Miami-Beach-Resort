import React from 'react'
import { Link } from 'react-router'
import logo from '../../assets/logo.png'
import { 
    MapPin, 
    Phone, 
    Mail, 
    Clock, 
    ShieldCheck, 
    Sparkles, 
    Users, 
    Award, 
    HeartHandshake, 
    BedDouble, 
    Compass, 
    Sun,
    CheckCircle2,
    ArrowRight
} from 'lucide-react'

const About = () => {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero Banner */}
            <section className="relative bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 text-white py-20 sm:py-28 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:24px_24px] opacity-15"></div>
                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        <Sparkles size={14} /> Luxury Coastal Hospitality
                    </span>
                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-serif tracking-tight leading-tight">
                        About Miami Beach Resort
                    </h1>
                    <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
                        Where the warmth of Bengali hospitality meets prime beachfront comfort at Dolphin Mor, Kolatoli Beach, Cox's Bazar.
                    </p>
                </div>
            </section>

            {/* Main Story & Highlights */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    
                    {/* Story Left Column */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="inline-flex items-center gap-2 text-teal-700 text-xs font-bold uppercase tracking-widest">
                            <Compass size={16} /> Our Coastal Sanctuary
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-serif leading-tight">
                            Crafting Unforgettable Beachside Moments in Cox's Bazar
                        </h2>
                        <div className="space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed">
                            <p>
                                Nestled right at the heart of Cox's Bazar's premier tourism hub—<strong>Dolphin Mor, Kolatoli Beach</strong>—Miami Beach Resort is a premium coastal destination designed for families, honeymooners, solo explorers, and business travelers.
                            </p>
                            <p>
                                Just moments away from the world's longest natural sea beach, our resort delivers an authentic beachfront atmosphere with modern luxury rooms, sea view balconies, 24/7 dedicated guest concierge, uninterrupted power supply, and mouth-watering multi-cuisine dining.
                            </p>
                            <p>
                                Whether you're here to watch the breathtaking Bay of Bengal sunset, explore the Marine Drive and Inani coral beaches, or unwind in air-conditioned comfort, our team is committed to making your stay seamless and memorable.
                            </p>
                        </div>

                        {/* Feature Badges */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2.5">
                                <CheckCircle2 size={18} className="text-teal-600 shrink-0" />
                                <span className="text-xs font-bold text-slate-800">Prime Location</span>
                            </div>
                            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2.5">
                                <CheckCircle2 size={18} className="text-teal-600 shrink-0" />
                                <span className="text-xs font-bold text-slate-800">24/7 Frontdesk</span>
                            </div>
                            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2.5">
                                <CheckCircle2 size={18} className="text-teal-600 shrink-0" />
                                <span className="text-xs font-bold text-slate-800">100% Power Backup</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Card Right Column */}
                    <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-teal-950 rounded-3xl p-8 sm:p-10 text-white shadow-2xl border border-teal-900/50 space-y-8">
                        <div className="flex items-center gap-3">
                            <img src={logo} alt="Miami Beach Resort" className="h-14 w-auto bg-white/10 p-2 rounded-2xl border border-white/10" />
                            <div>
                                <h3 className="font-serif font-black text-xl text-white">Miami Beach Resort</h3>
                                <p className="text-xs text-teal-400 font-medium">Excellence in Beachside Hospitality</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
                            <div>
                                <p className="text-3xl sm:text-4xl font-black text-teal-300 font-serif">50+</p>
                                <p className="text-xs text-slate-400 mt-1 uppercase font-semibold tracking-wider">Luxury Rooms & Suites</p>
                            </div>
                            <div>
                                <p className="text-3xl sm:text-4xl font-black text-teal-300 font-serif">100m</p>
                                <p className="text-xs text-slate-400 mt-1 uppercase font-semibold tracking-wider">To Kolatoli Beach</p>
                            </div>
                            <div>
                                <p className="text-3xl sm:text-4xl font-black text-teal-300 font-serif">10k+</p>
                                <p className="text-xs text-slate-400 mt-1 uppercase font-semibold tracking-wider">Delighted Guests</p>
                            </div>
                            <div>
                                <p className="text-3xl sm:text-4xl font-black text-teal-300 font-serif">24/7</p>
                                <p className="text-xs text-slate-400 mt-1 uppercase font-semibold tracking-wider">Security & Concierge</p>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Link 
                                to="/" 
                                className="btn btn-primary w-full rounded-2xl font-bold text-white text-sm shadow-md gap-2"
                            >
                                <span>Browse Rooms & Book</span>
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>

                </div>
            </section>

            {/* Core Values Section */}
            <section className="bg-white py-16 sm:py-24 border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
                        <span className="text-teal-600 font-bold text-xs uppercase tracking-widest">Why Travelers Choose Us</span>
                        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-serif">
                            Our Commitment to Your Comfort
                        </h2>
                        <p className="text-slate-500 text-sm sm:text-base">
                            Every detail at Miami Beach Resort is crafted to ensure peace of mind, high cleanliness standards, and warm hospitality.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 space-y-4 hover:shadow-lg transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                                <Award size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Uncompromised Quality</h3>
                            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                                Spotless room cleanliness, crisp linens, sanitized bathrooms, and continuous power backup ensure your relaxation without disruption.
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 space-y-4 hover:shadow-lg transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                                <HeartHandshake size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Guest-First Hospitality</h3>
                            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                                Our frontdesk and housekeeping staff are available 24/7 to attend to your queries, room service requests, and travel guidance.
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 space-y-4 hover:shadow-lg transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                                <MapPin size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Central Beach Location</h3>
                            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                                Located at Dolphin Mor, you are directly connected to shopping bazaars, beach restaurants, tour buses, and the main shoreline.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact & Location Details */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
                <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                        <span className="text-teal-400 font-bold text-xs uppercase tracking-widest">Plan Your Stay</span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold font-serif">
                            Ready to Experience Cox's Bazar?
                        </h2>
                        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                            Contact our reservations desk today for booking inquiries, corporate packages, group retreats, or immediate check-in assistance.
                        </p>
                        <div className="pt-2 flex flex-wrap gap-4 text-xs">
                            <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-xl">
                                <Phone size={14} className="text-teal-400" />
                                <span>+8801616472282</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-xl">
                                <MapPin size={14} className="text-teal-400" />
                                <span>Dolphin Mor, Kolatoli</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-start lg:justify-end">
                        <Link 
                            to="/" 
                            className="btn btn-primary btn-lg rounded-2xl font-bold text-white px-8 shadow-xl"
                        >
                            Book Your Stay Online
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default About
