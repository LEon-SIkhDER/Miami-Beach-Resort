import React from 'react'
import { Link } from 'react-router'
import logo from '../assets/logo.png'

const Logo = ({ 
    to = "/", 
    className = "", 
    imageSize = "h-11 sm:h-12", 
    textSize = "text-base sm:text-lg",
    showSubtitle = true 
}) => {
    return (
        <Link to={to} className={`flex items-center gap-3 group select-none ${className}`}>
            <div className="relative shrink-0">
                <img 
                    src={logo} 
                    alt="Miami Beach Resort Logo" 
                    className={`${imageSize} w-auto object-contain bg-[#03221b] p-1.5 rounded-2xl border border-[#c5a880]/40 shadow-md transition-transform duration-300 group-hover:scale-105`} 
                />
            </div>
            <div>
                <h3 className={`${textSize} font-bold tracking-wider text-white font-serif leading-tight`}>
                    Miami Beach <span className="text-[#dfc89e]">Resort</span>
                </h3>
                {showSubtitle && (
                    <p className="text-[9px] sm:text-[10px] text-[#dfc89e] font-semibold tracking-[0.25em] uppercase mt-0.5 font-sans">
                        Dolphin Mor, Kolatoli Beach
                    </p>
                )}
            </div>
        </Link>
    )
}

export default Logo
