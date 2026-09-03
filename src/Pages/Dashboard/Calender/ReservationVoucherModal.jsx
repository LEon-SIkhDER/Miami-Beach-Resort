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
        return format(d, 'MMM-dd-yyyy')
    } catch {
        return dateStr
    }
}

const formatCreatedDateTime = (dateStr) => {
    if (!dateStr) return ''
    try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return dateStr
        return format(d, 'yyyy-MM-dd hh:mm a')
    } catch {
        return dateStr
    }
}

const formatPrintDateTime = (dateObj = new Date()) => {
    try {
        const d = dateObj instanceof Date ? dateObj : new Date(dateObj)
        if (isNaN(d.getTime())) return ''
        return format(d, 'dd/MM/yyyy hh:mm a')
    } catch {
        return ''
    }
}

const formatStatusLabel = (status) => {
    if (!status) return 'Confirmed'
    if (status === 'booking_confirmed') return 'Confirmed'
    if (status === 'payment_waiting') return 'Payment Waiting'
    if (status === 'request_booking') return 'Request Booking'
    if (status === 'checked_in' || status === 'checked_id') return 'Checked In'
    if (status === 'checked_out') return 'Checked Out'
    if (status === 'cancel' || status === 'cancelled') return 'Cancelled'
    return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
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
    const adultsCount = Number(detailsGuestAdults(booking, initialBooking, fallbackGuestTotals))
    const childrenCount = Number(detailsGuestChildren(booking, initialBooking, fallbackGuestTotals))
    const totalGuests = adultsCount + childrenCount

    const checkInDate = booking.details?.arrivalDate || initialBooking?.checkIn || booking.checkIn
    const checkOutDate = booking.details?.departureDate || initialBooking?.checkOut || booking.checkOut
    const totalNights = booking.details?.totalNights || 
        (checkInDate && checkOutDate ? Math.max(1, Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24))) : 1)

    const extraService = booking.extraService || booking.financials?.extraService || initialBooking?.extraService || ""
    const extraServiceCost = Number(booking.extraServiceCost || booking.financials?.extraServiceCost || initialBooking?.extraServiceCost || 0)

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
    const roomSubtotalAmount = rawRooms.reduce((sum, r) => sum + Number(r.total || 0), 0)
    const subtotalAmount = roomSubtotalAmount + extraServiceCost || Number(initialBooking?.totalAmount || 0)
    const payableTotal = discountAmount > 0 ? Math.max(0, subtotalAmount - discountAmount) : Number(initialBooking?.totalAmount || subtotalAmount)
    const paidAmount = Number(booking.financials?.paidAmount !== undefined ? booking.financials.paidAmount : (initialBooking?.paidAmount || initialBooking?.advanceAmount || 0))
    const dueAmount = Math.max(0, payableTotal - paidAmount)

    const paymentMethodLabel = booking.financials?.paymentMethod || booking.paymentMethod || initialBooking?.paymentMethod || (paidAmount > 0 ? "M-Banking" : "Payment")
    const advanceRowLabel = `${paymentMethodLabel.includes("Advance") ? paymentMethodLabel : `${paymentMethodLabel} Advance`}:`

    const creatorName = booking.reference || booking.creator || initialBooking?.reference || initialBooking?.changedBy?.name || "Miami Management"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:w-full print:h-auto">
            {/* Modal Box */}
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden print:static print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-full print:h-auto print:rounded-none print:overflow-visible">
                
                {/* Modal Action Bar (Hidden in Print) */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50/90 shrink-0 print:hidden">
                    <div className="flex items-center gap-2.5">
                        <FileText size={18} className="text-teal-600" />
                        <span className="font-bold text-slate-800 text-sm sm:text-base">
                            Reservation Letter — {booking.bookingId || initialBooking?.bookingId || bookingId}
                        </span>
                        <span className={`badge badge-sm font-bold border-none text-white ${
                            booking.status === "booking_confirmed" || booking.status === "confirmed" ? "bg-[#01966e]" :
                            booking.status === "payment_waiting" ? "bg-amber-600" :
                            booking.status === "checked_in" ? "bg-teal-600" :
                            booking.status === "checked_out" ? "bg-blue-600" :
                            booking.status === "cancelled" || booking.status === "cancel" ? "bg-rose-600" : "bg-slate-600"
                        }`}>
                            {formatStatusLabel(booking.status)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="btn btn-sm bg-[#01966e] hover:bg-[#017c5b] text-white font-bold rounded-xl gap-1.5 shadow-xs border-none"
                            title="Print directly to connected printer"
                        >
                            <Printer size={15} /> Print
                        </button>

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
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-white print:p-0 print:overflow-visible text-black font-sans text-[11px] leading-tight">
                    <div 
                        ref={printContainerRef} 
                        id="printable-reservation-voucher" 
                        className="max-w-[760px] mx-auto space-y-1.5 print:space-y-1 print:max-w-none print:w-full"
                    >
                        
                        {/* RESORT HEADER */}
                        <div className="text-center space-y-0.5">
                            <img 
                                src={logo} 
                                alt="Miami Beach Resort" 
                                className="h-8 mx-auto object-contain mb-0.5" 
                            />
                            <h1 className="text-[13.5px] font-bold tracking-wider text-black uppercase">
                                MIAMI BEACH RESORT
                            </h1>
                            <p className="text-[11px] text-black">
                                Marin Drive Road,South Kolatoli, Cox's Bazar. 4700
                            </p>
                            <p className="text-[11px] text-black">
                                Hotline: +8801341849375 ,+8801341849376, Web:
                            </p>
                            <p className="text-[11px] text-black">
                                Email: Info.miamibeachresort@gmail.com
                            </p>
                        </div>

                        {/* RESERVATION LETTER TITLE */}
                        <div className="pt-0.5">
                            <h2 className="text-[13px] font-bold text-black">
                                Reservation Letter
                            </h2>
                        </div>

                        {/* TOP METADATA 2-COLUMN GRID */}
                        <div className="grid grid-cols-2 gap-x-4 text-[11px] leading-snug">
                            {/* Left Column */}
                            <div>
                                <div className="flex">
                                    <span className="w-36 text-black">Reservation Number :</span>
                                    <span className="font-bold text-black">{booking.bookingId || initialBooking?.bookingId || bookingId}</span>
                                    <span className="font-semibold text-black ml-2">{formatStatusLabel(booking.status)}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-36 text-black">Kind Attention :</span>
                                    <span className="font-bold text-black uppercase">{guest.name ? `MR. ${guest.name}` : ""}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-36 text-black">Email :</span>
                                    <span className="text-black">{guest.email || ""}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-36 text-black">Mobile Number :</span>
                                    <span className="text-black">{guest.mobile || ""}</span>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div>
                                <div className="flex">
                                    <span className="w-40 text-black">Print Date :</span>
                                    <span className="text-black">{formatPrintDateTime(printDate)}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-40 text-black">Organization :</span>
                                    <span className="text-black">{guest.organization || ""}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-40 text-black">Address :</span>
                                    <span className="text-black">{guest.address || ""}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-40 text-black">Reservation Creator:</span>
                                    <span className="text-black">{creatorName}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-40 text-black">Reservation Created Date :</span>
                                    <span className="text-black">{formatCreatedDateTime(bookingCreatedDate)}</span>
                                </div>
                            </div>
                        </div>

                        {/* SUBJECT & WELCOME GREETING */}
                        <div className="pt-0.5 text-[11px]">
                            <p className="font-bold text-black">
                                Subject: Room Reservation Letter
                            </p>
                            <p className="text-black">
                                We truly appreciate your kind patronage in choosing &nbsp; <strong className="font-bold">Miami Beach Resort</strong> . Please refer to the details of your Reservation outlined below.
                            </p>
                        </div>

                        {/* RESERVATION DETAILS (3 COLUMNS) */}
                        <div className="pt-0.5">
                            <h3 className="font-bold text-black text-[11.5px] mb-0.5">
                                Reservation Details
                            </h3>
                            <div className="grid grid-cols-3 gap-x-3 text-[11px] leading-snug">
                                {/* Col 1 */}
                                <div>
                                    <p><span className="font-bold">Guest Name:</span> <span className="uppercase font-bold">{guest.name}</span></p>
                                    <p><span className="font-bold">Phone:</span> {guest.mobile}</p>
                                    <p><span className="font-bold">Arrival Date :</span> {formatVoucherDate(checkInDate)}</p>
                                    <p><span className="font-bold">Departure Date :</span> {formatVoucherDate(checkOutDate)}</p>
                                </div>

                                {/* Col 2 */}
                                <div>
                                    <p><span className="font-bold">Reservation Mode :</span> {booking.details?.mode || "Self"}</p>
                                    <p><span className="font-bold">Room Night :</span> {totalNights}</p>
                                    <p><span className="font-bold">Adult + Child :</span> {adultsCount} + {childrenCount} = {totalGuests}</p>
                                </div>

                                {/* Col 3 */}
                                <div>
                                    <p><span className="font-bold">Airport Pick-up :</span> {booking.details?.airportPickUp || "NO"}</p>
                                    <p><span className="font-bold">Flight/ETA :</span> {booking.details?.flightEta || ""}</p>
                                    <p><span className="font-bold">Airport Drop :</span> {booking.details?.airportDrop || "NO"}</p>
                                    <p><span className="font-bold">Flight/ETD :</span> {booking.details?.flightEtd || ""}</p>
                                </div>
                            </div>
                        </div>

                        {/* ROOM TARIFF TABLE */}
                        <div className="pt-0.5" style={{ width: '100%', padding: '0 2px', boxSizing: 'border-box' }}>
                            <table 
                                className="text-left text-[11px] text-black" 
                                style={{ 
                                    width: 'calc(100% - 2px)', 
                                    margin: '0 auto',
                                    borderCollapse: 'collapse', 
                                    border: '1px solid #000000', 
                                    boxSizing: 'border-box',
                                    tableLayout: 'fixed'
                                }}
                            >
                                <colgroup>
                                    <col style={{ width: '28%' }} />
                                    <col style={{ width: '13%' }} />
                                    <col style={{ width: '13%' }} />
                                    <col style={{ width: '15%' }} />
                                    <col style={{ width: '9%' }} />
                                    <col style={{ width: '10%' }} />
                                    <col style={{ width: '12%' }} />
                                </colgroup>
                                <thead>
                                    <tr className="font-bold text-black" style={{ borderBottom: '1px solid #000000' }}>
                                        <th style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'left' }}>Room Type</th>
                                        <th style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center' }}>Arrival Date</th>
                                        <th style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center' }}>Departure Date</th>
                                        <th style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center' }}>Room Tariff</th>
                                        <th style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center' }}>Room Qty</th>
                                        <th style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center' }}>Room Nights</th>
                                        <th style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'right' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rawRooms.map((room, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #000000' }}>
                                            <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.roomType}</td>
                                            <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center' }}>{formatVoucherDate(room.arrivalDate)}</td>
                                            <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center' }}>{formatVoucherDate(room.departureDate)}</td>
                                            <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'right' }}>BDT {Number(room.roomTariff || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center' }}>{room.roomQty || 1}</td>
                                            <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center' }}>{room.roomNights || 1}</td>
                                            <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'right' }}>{Number(room.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}

                                    {/* Extra Services Row if present */}
                                    {extraServiceCost > 0 && (
                                        <tr style={{ borderBottom: '1px solid #000000' }}>
                                            <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'left', fontWeight: '500' }}>{extraService || "Extra Service"}</td>
                                            <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center' }}>—</td>
                                            <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center' }}>—</td>
                                            <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'right' }}>BDT {Number(extraServiceCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center' }}>1</td>
                                            <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center' }}>—</td>
                                            <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'right' }}>{Number(extraServiceCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    )}

                                    {/* Summary Rows */}
                                    <tr style={{ borderBottom: '1px solid #000000' }}>
                                        <td colSpan={6} style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
                                        <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'right', fontWeight: 'bold' }}>{Number(payableTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>

                                    <tr style={{ borderBottom: '1px solid #000000' }}>
                                        <td colSpan={6} style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'right', fontWeight: 'bold' }}>{advanceRowLabel}</td>
                                        <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'right', fontWeight: 'bold' }}>{Number(paidAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>

                                    <tr style={{ borderBottom: '1px solid #000000' }}>
                                        <td colSpan={6} style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'right', fontWeight: 'bold' }}>Due :</td>
                                        <td style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'right', fontWeight: 'bold' }}>{Number(dueAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* COMPLIMENTARY PRIVILEGES & ACCEPTED CARDS */}
                        <div className="grid grid-cols-2 gap-x-4 pt-0.5 text-[11px]">
                            {/* Left: Complimentary List */}
                            <div>
                                <p className="font-bold text-black">
                                    Complimentary and privileges inclusive
                                </p>
                                <ul className="list-disc list-inside text-black space-y-0 pl-1">
                                    <li>1 Large Bottle Mineral Water</li>
                                    <li>Wi-Fi Internet Access in Room & Lobby.</li>
                                    <li>24 Hour Room Services</li>
                                    <li>Swimming Pool Access In Rooftop</li>
                                    <li>Room Amenities ( Soap, Shampoo, Toothpaste, Toothbrush, Tissues)</li>
                                </ul>
                                <div className="pt-1 flex items-center gap-1.5">
                                    <span className="font-bold text-black">Reference :</span>
                                    <span className="border border-black px-2 py-0.5 font-bold uppercase inline-block">
                                        {creatorName}
                                    </span>
                                </div>
                            </div>

                            {/* Right: Accepted Cards Badges & Check-in Times */}
                            <div className="flex flex-col items-center justify-center text-center space-y-1">
                                <span className="font-bold text-black text-[11px]">We Accept</span>
                                <div className="flex items-center justify-center gap-3">
                                    <img 
                                        src={masterCardLogo} 
                                        alt="MasterCard" 
                                        className="h-6 object-contain" 
                                    />
                                    <img 
                                        src={visaCardLogo} 
                                        alt="VISA" 
                                        className="h-6 object-contain" 
                                    />
                                </div>
                                <p className="text-[11px] font-bold text-black pt-0.5">
                                    Check-In : 13:00:00 Hours || Check-Out : 11:00:00 Hours
                                </p>
                            </div>
                        </div>

                        {/* POLICIES, TERMS & GUEST REMARKS */}
                        <div className="space-y-0.5 text-[10px] text-black leading-snug pt-0.5">
                            <p className="font-bold text-red-600">
                                5% Service Charge Will Be Added on Top of the Room Rent.
                            </p>
                            <p className="font-bold text-black">
                                Important: National ID(Bangladeshi) OR Passport with valid Visa (Foreign Guests) Are Mandatory.
                            </p>
                            <p className="text-black">
                                Conversion Rate : USD 1$ = BDT 123.00 (Variable without notice).
                            </p>
                            <p className="font-bold text-black">
                                Meal Plan : BED ONLY
                            </p>

                            <div className="pt-0.5 space-y-0">
                                <p className="font-bold text-black">Guest Remarks :</p>
                                <p className="font-bold text-black">**Outside food & in room visitors are not allowed**</p>
                                <p className="font-bold text-black">**Weapons are not allowed on the hotel premises**</p>
                                <p className="font-bold text-black">**Pets are not allowed**</p>
                            </div>

                            <p className="pt-0.5 text-black">
                                Please do let us know if any additional information or/and assistance you may need in this respect or any other facilities and services that we cater for the comfort and convenience of our Valued Patrons from Home and Abroad.
                            </p>
                            <p className="text-black">
                                Kindly ensure that your personal belongings are kept secure, as the hotel management will not be held responsible for any loss.
                            </p>

                            {/* SIGN OFF WITH INCREASED SIGNATURE SPACE */}
                            <div className="pt-1">
                                <p className="font-bold text-black text-[11px]">With Warmest Regards</p>
                                <div className="h-8 sm:h-9" />
                                <p className="text-black font-mono text-[11px]">-------------------------------</p>
                                <p className="font-bold text-black text-[11px]">{creatorName}</p>
                            </div>

                            {/* CANCELLATION POLICY */}
                            <div className="pt-0.5 text-black text-[9.5px] leading-tight">
                                <p>
                                    <span className="text-red-600 font-bold">Cancellation Policy: </span>
                                    Reservation cancellation to be made 72 Hours before arrival, otherwise One night charge will be made. If cancelled later or in case of No-Show, 100% of the first night will be charged. Hence, we don't refund advance booking money for any case of cancellation. Booking can be postponed for the next 04 months.
                                </p>
                            </div>
                        </div>

                        {/* HOTEL ADDRESS FOOTER */}
                        <div className="text-center text-[10.5px] text-black pt-1.5 border-t border-slate-300">
                            <p className="font-bold text-black">Hotel Address:</p>
                            <p className="text-black">Marin Drive Road,South Kolatoli, Cox's Bazar. 4700 | 01341849375 | miamibeachresort@gmail.com</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Stylesheet */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 6mm 8mm 6mm 8mm;
                    }
                    *, *::before, *::after {
                        box-sizing: border-box !important;
                    }
                    html, body {
                        height: auto !important;
                        min-height: 100% !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    #root {
                        display: none !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-reservation-voucher, #printable-reservation-voucher * {
                        visibility: visible !important;
                    }
                    #printable-reservation-voucher {
                        position: static !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 auto !important;
                        padding: 0 1.5mm !important;
                        box-sizing: border-box !important;
                        page-break-after: avoid !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        break-after: avoid !important;
                        font-size: 11px !important;
                        line-height: 1.25 !important;
                    }
                    #printable-reservation-voucher table {
                        width: calc(100% - 2px) !important;
                        margin: 0 auto !important;
                        border-collapse: collapse !important;
                        border: 1px solid #000000 !important;
                        box-sizing: border-box !important;
                        table-layout: fixed !important;
                    }
                    #printable-reservation-voucher th, 
                    #printable-reservation-voucher td {
                        border: 1px solid #000000 !important;
                        border-color: #000000 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
                `
            }} />
        </div>,
        document.body
    )
}

// Helpers for guest counts
function detailsGuestAdults(booking, initialBooking, fallbackGuestTotals) {
    if (booking.details?.guestCount?.adults !== undefined) return booking.details.guestCount.adults
    if (fallbackGuestTotals.adults !== undefined) return fallbackGuestTotals.adults
    if (initialBooking?.adults !== undefined) return initialBooking.adults
    return 0
}

function detailsGuestChildren(booking, initialBooking, fallbackGuestTotals) {
    if (booking.details?.guestCount?.children !== undefined) return booking.details.guestCount.children
    if (fallbackGuestTotals.children !== undefined) return fallbackGuestTotals.children
    if (fallbackGuestTotals.babies !== undefined) return fallbackGuestTotals.babies
    if (initialBooking?.children !== undefined) return initialBooking.children
    if (initialBooking?.babies !== undefined) return initialBooking.babies
    return 0
}

export default ReservationVoucherModal

