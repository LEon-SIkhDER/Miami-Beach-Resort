import React from 'react'
import { Link } from 'react-router'
import { 
    BedDouble, 
    Utensils, 
    Car, 
    Wifi, 
    ShieldCheck, 
    Clock, 
    Sparkles, 
    Compass, 
    Tv, 
    Briefcase, 
    LifeBuoy, 
    PhoneCall, 
    ArrowRight,
    CheckCircle,
    Coffee
} from 'lucide-react'

const serviceList = [
    {
        id: "accommodation",
        icon: <BedDouble size={28} className="text-teal-600" />,
        title: "Luxury Rooms & Suites",
        subtitle: "Air-conditioned comfort with modern coastal aesthetics",
        description: "Choose from our Deluxe Couple rooms, Twin Bed Suites, Sea View executive rooms, and spacious Family Suites equipped with premium spring mattresses, smart LED TVs, high-speed Wi-Fi, and private balconies.",
        features: ["King / Queen Size Luxury Beds", "Private Balconies with Ocean Breeze", "Ensuite Modern Bathrooms with Hot & Cold Water", "Daily Housekeeping & Sanitization"]
    },
    {
        id: "dining",
        icon: <Utensils size={28} className="text-teal-600" />,
        title: "Multi-Cuisine Seafood & Dining",
        subtitle: "Fresh Bay of Bengal seafood & traditional Bengali delights",
        description: "Savor freshly caught Rupchanda, Coral, Crab, and King Prawn delicacies along with traditional Bengali, Indian, and Continental menus prepared by seasoned coastal chefs.",
        features: ["Authentic Bengali Delicacies", "Fresh Catch Coastal Seafood BBQ", "In-Room Dining & Room Service", "Complimentary Morning Breakfast"]
    },
    {
        id: "tours",
        icon: <Compass size={28} className="text-teal-600" />,
        title: "Coastal Sightseeing & Tour Desk",
        subtitle: "Guided excursion planning across Cox's Bazar",
        description: "Our front desk team arranges personalized local sightseeing trips to Marine Drive, Inani Coral Beach, Himchori Waterfalls, Radiant Fish World, and Saint Martin Island ship ticket bookings.",
        features: ["Marine Drive Open Jeep / Sedan Tours", "Inani & Himchori Day Trips", "Saint Martin Ship & Tour Tickets", "Local Beach Activity Guidance"]
    },
    {
        id: "security",
        icon: <ShieldCheck size={28} className="text-teal-600" />,
        title: "24/7 Security & Uninterrupted Power",
        subtitle: "Peace of mind with full generator backup & CCTV monitoring",
        description: "Travel with complete confidence. Our resort is fortified with round-the-clock security personnel, multi-angle CCTV surveillance, and high-capacity automatic power generators.",
        features: ["Instant Auto Generator Backup", "24/7 Monitored CCTV Security", "Secure Electronic Door Locks", "Emergency First-Aid & Medical On-Call"]
    },
    {
        id: "transport",
        icon: <Car size={28} className="text-teal-600" />,
        title: "Airport & Bus Terminal Transfers",
        subtitle: "Hassle-free chauffeur pickup and drop services",
        description: "Arrive effortlessly at Cox's Bazar Airport or the Kolatoli bus terminals. We provide clean, air-conditioned vehicle transfers upon reservation request.",
        features: ["Cox's Bazar Airport Pickup / Drop", "Kolatoli Bus Counter Assistance", "Private Chauffeur Car Rentals", "Safe Luggage Storage"]
    },
    {
        id: "corporate",
        icon: <Briefcase size={28} className="text-teal-600" />,
        title: "Corporate Meets & Group Retreats",
        subtitle: "Spacious meeting facilities for corporate gatherings",
        description: "Host executive conferences, annual office retreats, team building events, and family reunions with custom catering, projection equipment, and group lodging discounts.",
        features: ["Meeting & Banquet Hall Setup", "High-Definition Audio/Visual Support", "Custom Corporate Catering Menus", "Exclusive B2B & Group Room Rates"]
    }
]

const Services = () => {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero Banner */}
            <section className="relative bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 text-white py-20 sm:py-28 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:24px_24px] opacity-15"></div>
                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        <Sparkles size={14} /> World-Class Coastal Amenities
                    </span>
                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-serif tracking-tight leading-tight">
                        Our Services & Facilities
                    </h1>
                    <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
                        Thoughtfully tailored amenities and bespoke concierge services designed to make your Cox's Bazar holiday extraordinary.
                    </p>
                </div>
            </section>

            {/* Services Grid */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
                    <span className="text-teal-600 font-bold text-xs uppercase tracking-widest">Tailored For Your Comfort</span>
                    <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-serif">
                        Everything You Need for a Perfect Coastal Vacation
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {serviceList.map((service) => (
                        <div 
                            key={service.id}
                            className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-6 group"
                        >
                            <div className="space-y-4">
                                <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    {service.icon}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                                        {service.title}
                                    </h3>
                                    <p className="text-xs font-medium text-teal-600 mt-0.5">
                                        {service.subtitle}
                                    </p>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                                    {service.description}
                                </p>
                            </div>

                            <div className="pt-4 border-t border-slate-100 space-y-2">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Highlights</p>
                                <ul className="space-y-1.5">
                                    {service.features.map((feat, idx) => (
                                        <li key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                                            <CheckCircle size={14} className="text-teal-600 shrink-0" />
                                            <span>{feat}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Quick Timing & Policy Callout */}
            <section className="bg-white py-16 border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-gradient-to-r from-slate-900 to-teal-950 rounded-3xl p-8 sm:p-12 text-white flex flex-col lg:flex-row items-center justify-between gap-8 shadow-xl">
                        <div className="space-y-3 max-w-2xl">
                            <span className="text-teal-300 font-bold text-xs uppercase tracking-widest">24/7 Dedicated Concierge</span>
                            <h3 className="text-2xl sm:text-3xl font-extrabold font-serif">
                                Have a Special Request or Need Group Accommodation?
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                Our frontdesk is on standby 24 hours a day to customize your holiday package, schedule early check-ins, or manage corporate conferences.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3.5 shrink-0">
                            <a 
                                href="tel:+8801616472282" 
                                className="btn btn-outline border-teal-400 text-teal-300 hover:bg-teal-900/50 rounded-2xl text-xs sm:text-sm px-6"
                            >
                                <PhoneCall size={16} /> Call Frontdesk
                            </a>
                            <Link 
                                to="/" 
                                className="btn btn-primary rounded-2xl font-bold text-white text-xs sm:text-sm px-6 shadow-md"
                            >
                                <span>Book Rooms Online</span>
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default Services
