import React, { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import logo from '../../../assets/logo.png'
import masterCardLogo from '../../../assets/masterc-card-logo.png'
import visaCardLogo from '../../../assets/visa-card-logo.png'
import { Printer, X, FileText, Download } from 'lucide-react'
import { format } from 'date-fns'
import { getBookingGuestTotals } from '../../../utils/bookingUtils'

const formatVoucherDate = (dateStr) => {
    if (!dateStr) return ''
    try {
        const d = typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
            ? new Date(`${dateStr}T00:00:00`)
            : new Date(dateStr)
        if (isNaN(d.getTime())) return dateStr
        return format(d, 'dd MMM yyyy')
    } catch {
        return dateStr
    }
}

const formatFullDateTime = (dateStr) => {
    if (!dateStr) return ''
    try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return dateStr
        return format(d, 'dd MMM yyyy, hh:mm a')
    } catch {
        return dateStr
    }
}

const formatPrintDateTime = (dateObj = new Date()) => {
    try {
        return format(dateObj, 'dd MMM yyyy, hh:mm a')
    } catch {
        return ''
    }
}

const ReservationVoucherModal = ({
    isOpen,
    onClose,
    bookingId,
    initialBooking
}) => {
    const axiosSecure = useAxiosSecure()
    const printContainerRef = useRef(null)

    // Dedicated Voucher API Query
    const { data: voucherData } = useQuery({
        queryKey: ["reservation-voucher-data", bookingId],
        queryFn: async () => {
            if (!bookingId) return null
            const res = await axiosSecure.get(`/booking/${bookingId}/reservation-voucher`)
            return res.data
        },
        enabled: !!isOpen && !!bookingId
    })

    if (!isOpen || !bookingId) return null

    // Extract dynamic fields with fallback to initialBooking
    const booking = voucherData?.reservation || initialBooking || {}
    const guest = booking.guest || {
        name: initialBooking?.name || "Guest",
        mobile: initialBooking?.mobile || "",
        email: initialBooking?.userEmail || initialBooking?.email || "",
        address: initialBooking?.address || "",
        organization: initialBooking?.organization || ""
    }

    const fallbackGuestTotals = getBookingGuestTotals(initialBooking || booking || {})
    const details = booking.details || {
        arrivalDate: initialBooking?.checkIn,
        departureDate: initialBooking?.checkOut,
        mode: "Self",
        totalNights: 1,
        guestCount: { 
            adults: fallbackGuestTotals.adults || 2, 
            children: fallbackGuestTotals.children || fallbackGuestTotals.babies || 0, 
            total: (fallbackGuestTotals.adults || 2) + (fallbackGuestTotals.children || fallbackGuestTotals.babies || 0) 
        },
        airportPickUp: "NO",
        flightEta: "",
        airportDrop: "NO",
        flightEtd: ""
    }

    const rawRooms = Array.isArray(booking.rooms) && booking.rooms.length > 0 
        ? booking.rooms 
        : Array.isArray(initialBooking?.rooms) && initialBooking.rooms.length > 0
        ? initialBooking.rooms.map(r => {
            const checkIn = r.checkIn || initialBooking?.checkIn
            const checkOut = r.checkOut || initialBooking?.checkOut
            const nights = Math.max(1, checkIn && checkOut ? Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)) : 1)
            const tariff = Number(r.pricePerNight || r.price || 0)
            return {
                roomType: r.categoryName || r.category || "Room",
                roomNo: r.roomNo || "",
                arrivalDate: checkIn,
                departureDate: checkOut,
                roomTariff: tariff,
                roomQty: 1,
                roomNights: nights,
                total: tariff * nights
            }
        })
        : [{
            roomType: initialBooking?.category || "Room Category",
            roomNo: initialBooking?.roomNo || "",
            arrivalDate: initialBooking?.checkIn,
            departureDate: initialBooking?.checkOut,
            roomTariff: Number(initialBooking?.totalAmount || 0),
            roomQty: 1,
            roomNights: 1,
            total: Number(initialBooking?.totalAmount || 0)
        }]

    const discountAmount = Number(booking.financials?.discountAmount || initialBooking?.discountAmount || initialBooking?.discount || initialBooking?.specialDiscount || 0)
    const subtotalAmount = rawRooms.reduce((sum, r) => sum + Number(r.total || 0), 0) || Number(initialBooking?.totalAmount || 0)
    const payableTotal = discountAmount > 0 ? Math.max(0, subtotalAmount - discountAmount) : Number(initialBooking?.totalAmount || subtotalAmount)
    const paidAmount = Number(booking.financials?.paidAmount !== undefined ? booking.financials.paidAmount : (initialBooking?.paidAmount || initialBooking?.advanceAmount || 0))
    const dueAmount = Math.max(0, payableTotal - paidAmount)

    const financials = {
        subtotal: subtotalAmount,
        discountAmount,
        totalAmount: payableTotal,
        paidAmount,
        dueAmount,
        paymentMethod: booking.financials?.paymentMethod || initialBooking?.paymentMethod || "M-Banking Advance"
    }

    const creatorName = booking.creator || initialBooking?.reference || initialBooking?.changedBy?.name || "Taniya Sharmin"
    const bookingCreatedDate = booking.createdDate || initialBooking?.createdAt || new Date()
    const printDate = booking.printDate || new Date()

    const handlePrint = () => {
        window.print()
    }

    const handleSavePdf = () => {
        const prevTitle = document.title
        const fileName = `Reservation_${booking.bookingId || initialBooking?.bookingId || bookingId || 'Voucher'}`
        document.title = fileName
        window.print()
        setTimeout(() => {
            document.title = prevTitle
        }, 1500)
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
            {/* Modal Box */}
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-full print:rounded-none">
                
                {/* Modal Action Bar (Hidden in Print) */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50/90 shrink-0 print:hidden">
                    <div className="flex items-center gap-2">
                        <FileText size={18} className="text-teal-600" />
                        <span className="font-bold text-slate-800 text-sm">
                            Reservation Letter — {booking.bookingId || initialBooking?.bookingId || bookingId}
                        </span>
                        <span className="badge badge-sm bg-[#01966e] text-white font-bold border-none">
                            Confirmed
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Button 1: Direct Physical Print */}
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="btn btn-sm bg-[#01966e] hover:bg-[#017c5b] text-white font-bold rounded-xl gap-1.5 shadow-xs border-none"
                            title="Print directly to connected printer"
                        >
                            <Printer size={15} /> Print
                        </button>

                        {/* Button 2: Save / Download as PDF */}
                        <button
                            type="button"
                            onClick={handleSavePdf}
                            className="btn btn-sm bg-[#5261d6] hover:bg-[#4351be] text-white font-bold rounded-xl gap-1.5 shadow-xs border-none"
                            title="Save as A4 Vector PDF"
                        >
                            <Download size={15} /> Save as PDF
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-sm btn-ghost btn-circle text-slate-400 hover:text-slate-700"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Printable A4 Content Area */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-white print:p-0 print:overflow-visible text-slate-900 font-sans text-[10px] leading-[1.25]">
                    <div ref={printContainerRef} id="printable-reservation-voucher" className="max-w-[740px] mx-auto space-y-2 print:space-y-1.5 print:max-w-none">
                        
                        {/* RESORT HEADER */}
                        <div className="text-center space-y-0.5 border-b border-slate-200 pb-1.5">
                            <img 
                                src={logo} 
                                alt="Miami Beach Resort" 
                                className="h-8 mx-auto object-contain mb-0.5" 
                            />
                            <h1 className="text-sm sm:text-base font-black tracking-wide text-slate-900 uppercase">
                                MIAMI BEACH RESORT
                            </h1>
                            <p className="text-[9.5px] text-slate-600 leading-tight">
                                Marin Drive Road,South Kolatoli, Cox's Bazar. 4700
                            </p>
                            <p className="text-[9.5px] text-slate-600 leading-tight">
                                Hotline: +8801341849375 ,+8801341849376, Web:
                            </p>
                            <p className="text-[9.5px] text-slate-600 leading-tight">
                                Email: Info.miamibeachresort@gmail.com
                            </p>
                        </div>

                        {/* RESERVATION LETTER TITLE */}
                        <div>
                            <h2 className="text-[11px] font-bold text-slate-900 underline uppercase tracking-tight">
                                Reservation Letter
                            </h2>
                        </div>

                        {/* TOP METADATA 2-COLUMN GRID */}
                        <div className="grid grid-cols-2 gap-x-4 text-[9.5px]">
                            {/* Left Column */}
                            <div className="space-y-0.5">
                                <div className="flex">
                                    <span className="w-32 font-bold text-slate-800">Reservation Number</span>
                                    <span className="font-semibold text-slate-900">: {booking.bookingId || initialBooking?.bookingId || bookingId} <strong className="text-slate-900 font-bold">Confirmed</strong></span>
                                </div>
                                <div className="flex">
                                    <span className="w-32 text-slate-700">Kind Attention</span>
                                    <span className="font-bold text-slate-900 uppercase">: {guest.name}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-32 text-slate-700">Email</span>
                                    <span className="text-slate-800">: {guest.email || ""}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-32 text-slate-700">Mobile Number</span>
                                    <span className="font-semibold text-slate-900">: {guest.mobile || ""}</span>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-0.5">
                                <div className="flex">
                                    <span className="w-32 text-slate-700">Print Date</span>
                                    <span className="text-slate-800">: {formatPrintDateTime(printDate)}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-32 text-slate-700">Organization</span>
                                    <span className="text-slate-800">: {guest.organization || ""}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-32 text-slate-700">Address</span>
                                    <span className="text-slate-800">: {guest.address || ""}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-32 text-slate-700">Reservation Creator</span>
                                    <span className="font-semibold text-slate-900">: {creatorName}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-32 text-slate-700">Reservation Created Date</span>
                                    <span className="text-slate-800">: {formatFullDateTime(bookingCreatedDate)}</span>
                                </div>
                            </div>
                        </div>

                        {/* SUBJECT & WELCOME GREETING */}
                        <div className="space-y-0.5 text-[9.5px]">
                            <p className="font-bold text-slate-900">
                                Subject: Room Reservation Letter
                            </p>
                            <p className="text-slate-700 leading-tight">
                                We truly appreciate your kind patronage in choosing <strong className="font-bold text-slate-900">Miami Beach Resort</strong> . Please refer to the details of your Reservation outlined below.
                            </p>
                        </div>

                        {/* RESERVATION DETAILS (3 COLUMNS) */}
                        <div className="space-y-0.5">
                            <h3 className="font-bold text-slate-900 underline text-[10px]">
                                Reservation Details
                            </h3>
                            <div className="grid grid-cols-3 gap-2 text-[9.5px] bg-slate-50/50 p-1.5 rounded border border-slate-200">
                                {/* Col 1 */}
                                <div className="space-y-0.5">
                                    <p><strong className="text-slate-800">Guest Name:</strong> <span className="uppercase font-semibold">{guest.name}</span></p>
                                    <p><strong className="text-slate-800">Phone:</strong> {guest.mobile}</p>
                                    <p><strong className="text-slate-800">Arrival Date :</strong> {formatVoucherDate(details.arrivalDate)}</p>
                                    <p><strong className="text-slate-800">Departure Date :</strong> {formatVoucherDate(details.departureDate)}</p>
                                </div>

                                {/* Col 2 */}
                                <div className="space-y-0.5">
                                    <p><strong className="text-slate-800">Reservation Mode :</strong> {details.mode || "Self"}</p>
                                    <p><strong className="text-slate-800">Room Night :</strong> {details.totalNights || 1}</p>
                                    <p><strong className="text-slate-800">Adult + Child :</strong> {details.guestCount?.adults || 2} + {details.guestCount?.children || 0} = {details.guestCount?.total || 2}</p>
                                </div>

                                {/* Col 3 */}
                                <div className="space-y-0.5">
                                    <p><strong className="text-slate-800">Airport Pick-up :</strong> {details.airportPickUp || "NO"}</p>
                                    <p><strong className="text-slate-800">Flight/ETA :</strong> {details.flightEta || ""}</p>
                                    <p><strong className="text-slate-800">Airport Drop :</strong> {details.airportDrop || "NO"}</p>
                                    <p><strong className="text-slate-800">Flight/ETD :</strong> {details.flightEtd || ""}</p>
                                </div>
                            </div>
                        </div>

                        {/* ROOM TARIFF TABLE */}
                        <div className="border border-slate-300 rounded overflow-hidden">
                            <table className="w-full text-left text-[9.5px] border-collapse">
                                <thead>
                                    <tr className="bg-slate-100/90 border-b border-slate-300 font-bold text-slate-900">
                                        <th className="p-1 border-r border-slate-300">Room Type</th>
                                        <th className="p-1 border-r border-slate-300 text-center">Arrival Date</th>
                                        <th className="p-1 border-r border-slate-300 text-center">Departure Date</th>
                                        <th className="p-1 border-r border-slate-300 text-right">Room Tariff</th>
                                        <th className="p-1 border-r border-slate-300 text-center">Room Qty</th>
                                        <th className="p-1 border-r border-slate-300 text-center">Room Nights</th>
                                        <th className="p-1 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rawRooms.map((room, idx) => (
                                        <tr key={idx} className="border-b border-slate-200">
                                            <td className="p-1 border-r border-slate-200 font-medium">
                                                {room.roomType}
                                                {room.roomNo ? ` (Room ${room.roomNo})` : ''}
                                            </td>
                                            <td className="p-1 border-r border-slate-200 text-center">{formatVoucherDate(room.arrivalDate)}</td>
                                            <td className="p-1 border-r border-slate-200 text-center">{formatVoucherDate(room.departureDate)}</td>
                                            <td className="p-1 border-r border-slate-200 text-right font-mono">BDT {Number(room.roomTariff || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="p-1 border-r border-slate-200 text-center">{room.roomQty || 1}</td>
                                            <td className="p-1 border-r border-slate-200 text-center">{room.roomNights || 1}</td>
                                            <td className="p-1 text-right font-mono font-bold">{Number(room.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                    {/* Summary Rows */}
                                    <tr className="border-t border-slate-300 bg-slate-50/50">
                                        <td colSpan={6} className="p-0.5 px-1 text-right font-bold border-r border-slate-200">Room Total:</td>
                                        <td className="p-0.5 px-1 text-right font-mono font-bold">BDT {Number(financials.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                    {financials.discountAmount > 0 && (
                                        <tr className="text-emerald-800 bg-emerald-50/30">
                                            <td colSpan={6} className="p-0.5 px-1 text-right font-bold border-r border-slate-200">Special Discount:</td>
                                            <td className="p-0.5 px-1 text-right font-mono font-semibold">-BDT {Number(financials.discountAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    )}
                                    {financials.discountAmount > 0 && (
                                        <tr className="bg-teal-50/50 font-bold">
                                            <td colSpan={6} className="p-0.5 px-1 text-right font-bold border-r border-slate-200">Net Payable:</td>
                                            <td className="p-0.5 px-1 text-right font-mono font-bold text-teal-900">BDT {Number(financials.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    )}
                                    <tr>
                                        <td colSpan={6} className="p-0.5 px-1 text-right font-bold border-r border-slate-200">{financials.paymentMethod || "Advance Paid"}:</td>
                                        <td className="p-0.5 px-1 text-right font-mono font-semibold text-emerald-800">BDT {Number(financials.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                    <tr className="bg-slate-100/60 font-black">
                                        <td colSpan={6} className="p-0.5 px-1 text-right font-bold border-r border-slate-200">Due Balance:</td>
                                        <td className="p-0.5 px-1 text-right font-mono text-slate-900">BDT {Number(financials.dueAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* COMPLIMENTARY PRIVILEGES & ACCEPTED CARDS */}
                        <div className="grid grid-cols-2 gap-3 text-[9.5px] pt-0.5">
                            {/* Left: Complimentary List */}
                            <div className="space-y-0.5">
                                <p className="font-bold text-slate-900 underline">
                                    Complimentary and privileges inclusive
                                </p>
                                <ul className="list-disc list-inside text-slate-700 space-y-0.5 pl-0.5 text-[9px]">
                                    <li>1 Large Bottle Mineral Water</li>
                                    <li>Wi-Fi Internet Access in Room & Lobby.</li>
                                    <li>24 Hour Room Services</li>
                                    <li>Swimming Pool Access In Rooftop</li>
                                    <li>Room Amenities ( Soap, Shampoo, Toothpaste, Toothbrush, Tissues)</li>
                                </ul>
                                <p className="pt-0.5 text-[9.5px]">
                                    <strong className="text-slate-900">Reference :</strong> {creatorName}
                                </p>
                            </div>

                            {/* Right: Accepted Cards Badges & Check-in Times */}
                            <div className="flex flex-col items-center justify-center text-center space-y-1 border border-slate-200 rounded p-1.5 bg-slate-50/40">
                                <span className="font-bold text-slate-800 text-[9.5px]">We Accept</span>
                                <div className="flex items-center justify-center gap-3">
                                    <img 
                                        src={masterCardLogo} 
                                        alt="MasterCard" 
                                        className="h-7 object-contain" 
                                    />
                                    <img 
                                        src={visaCardLogo} 
                                        alt="VISA" 
                                        className="h-7 object-contain" 
                                    />
                                </div>
                                <p className="text-[9px] font-bold text-slate-800 pt-0.5">
                                    Check-In : 13:00:00 Hours || Check-Out : 11:00:00 Hours
                                </p>
                            </div>
                        </div>

                        {/* POLICIES, TERMS & GUEST REMARKS */}
                        <div className="space-y-0.5 text-[9px] text-slate-700 leading-tight pt-0.5">
                            <p className="font-bold text-red-600">
                                5% Service Charge Will Be Added on Top of the Room Rent.
                            </p>
                            <p className="font-bold text-slate-900">
                                Important: National ID(Bangladeshi) OR Passport with valid Visa (Foreign Guests) Are Mandatory.
                            </p>
                            <p>
                                Conversion Rate : USD 1$ = BDT 123.00 (Variable without notice).
                            </p>
                            <p className="font-semibold text-slate-800">
                                Meal Plan : BED ONLY
                            </p>

                            <div className="pt-0.5 space-y-0.5">
                                <p className="font-bold text-slate-900 underline">Guest Remarks :</p>
                                <p className="font-bold text-slate-900">**Outside food & in room visitors are not allowed**</p>
                                <p className="font-bold text-slate-900">**Weapons are not allowed on the hotel premises**</p>
                                <p className="font-bold text-slate-900">**Pets are not allowed**</p>
                            </div>

                            <p className="pt-0.5">
                                Please do let us know if any additional information or/and assistance you may need in this respect or any other facilities and services that we cater for the comfort and convenience of our Valued Patrons from Home and Abroad.
                            </p>
                            <p>
                                Kindly ensure that your personal belongings are kept secure, as the hotel management will not be held responsible for any loss.
                            </p>

                            {/* SIGN OFF */}
                            <div className="pt-1.5">
                                <p className="font-bold text-slate-900">With Warmest Regards</p>
                                <p className="text-slate-400 leading-none">-------------------------------</p>
                                <p className="font-bold text-slate-900 text-[10px]">{creatorName}</p>
                            </div>

                            {/* CANCELLATION POLICY */}
                            <div className="pt-0.5 text-slate-700 leading-tight text-[8.5px]">
                                <p>
                                    <strong className="text-red-600 font-bold">Cancellation Policy: </strong>
                                    Reservation cancellation to be made 72 Hours before arrival, otherwise One night charge will be made. If cancelled later or in case of No-Show, 100% of the first night will be charged. Hence, we don't refund advance booking money for any case of cancellation. Booking can be postponed for the next 04 months.
                                </p>
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div className="text-center text-[9px] text-slate-600 border-t border-slate-200 pt-1 mt-1">
                            <p className="font-bold text-slate-800">Hotel Address:</p>
                            <p>Marin Drive Road,South Kolatoli, Cox's Bazar. 4700 | 01341849375 | miamibeachresort@gmail.com</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Stylesheet */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    html, body {
                        height: 100% !important;
                        overflow: hidden !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-reservation-voucher, #printable-reservation-voucher * {
                        visibility: visible !important;
                    }
                    #printable-reservation-voucher {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 3mm 6mm !important;
                        box-sizing: border-box !important;
                        page-break-inside: avoid !important;
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }
                    @page {
                        size: A4 portrait;
                        margin: 4mm;
                    }
                }
                `
            }} />
        </div>,
        document.body
    )
}

export default ReservationVoucherModal
