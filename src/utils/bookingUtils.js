export const formatDate = (dateInput) => {
    if (!dateInput) return ""
    try {
        const d = typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
            ? new Date(`${dateInput}T00:00:00`)
            : new Date(dateInput)
        if (isNaN(d.getTime())) return String(dateInput)
        
        const day = String(d.getDate()).padStart(2, '0')
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const month = months[d.getMonth()]
        const year = d.getFullYear()
        
        return `${day} ${month} ${year}`
    } catch {
        return String(dateInput)
    }
}

export const formatDateTime = (dateInput) => {
    if (!dateInput) return ""
    try {
        const d = new Date(dateInput)
        if (isNaN(d.getTime())) return String(dateInput)
        
        const day = String(d.getDate()).padStart(2, '0')
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const month = months[d.getMonth()]
        const year = d.getFullYear()
        
        let hours = d.getHours()
        const minutes = String(d.getMinutes()).padStart(2, '0')
        const ampm = hours >= 12 ? 'PM' : 'AM'
        hours = hours % 12
        hours = hours ? hours : 12
        const strHours = String(hours).padStart(2, '0')
        
        return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`
    } catch {
        return String(dateInput)
    }
}

export const getNightCount = (checkIn, checkOut) => {
    const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24))
    return nights > 0 ? nights : 0
}

export const getBookingRooms = (booking = {}) => {
    if (Array.isArray(booking.rooms) && booking.rooms.length) {
        return booking.rooms
    }

    if (!booking.roomId && !booking.checkIn && !booking.checkOut) {
        return []
    }

    const childCount = Number(booking.children !== undefined ? booking.children : (booking.babies || 0))

    return [{
        roomId: booking.roomId,
        categoryId: booking.categoryId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        adults: Number(booking.adults || 1),
        babies: childCount,
        children: childCount,
        pricePerNight: Number(booking.pricePerNight || booking.price || 0),
        room: {
            name: booking.roomName,
            category: booking.roomCategory
        }
    }]
}

export const getRoomName = (roomItem = {}) => {
    return roomItem.categoryName || roomItem.room?.name || roomItem.name || roomItem.roomName || roomItem.room?.category || roomItem.roomCategory || "Category Room"
}

export const getRoomTotal = (roomItem = {}) => {
    return getNightCount(roomItem.checkIn, roomItem.checkOut) * Number(roomItem.pricePerNight || 0)
}

export const getBookingSubtotal = (booking = {}) => {
    const rooms = getBookingRooms(booking)
    if (rooms.length) {
        const total = rooms.reduce((sum, room) => sum + getRoomTotal(room), 0)
        if (total > 0) return total
    }
    return Number(booking.subtotal || booking.standardTotal || booking.totalAmount || 0)
}

export const getBookingDiscount = (booking = {}) => {
    return Number(booking.discountAmount || booking.discount || booking.specialDiscount || 0)
}

export const getBookingTotal = (booking = {}) => {
    const subtotal = getBookingSubtotal(booking)
    const discount = getBookingDiscount(booking)

    if (booking.totalAmount !== undefined && booking.totalAmount !== null && !isNaN(Number(booking.totalAmount))) {
        const t = Number(booking.totalAmount)
        // If stored totalAmount equals subtotal and there is a discount, net payable is subtotal - discount
        if (discount > 0 && Math.abs(t - subtotal) < 0.01) {
            return Math.max(0, subtotal - discount)
        }
        // If stored totalAmount is explicitly set (e.g. customized authority price)
        if (t > 0 && t <= subtotal) {
            return t
        }
    }

    return Math.max(0, subtotal - discount)
}

export const getBookingPaidAmount = (booking = {}) => {
    return Number(booking.paidAmount !== undefined && booking.paidAmount !== null ? booking.paidAmount : (booking.advanceAmount || 0))
}

export const getBookingDueAmount = (booking = {}) => {
    const payableTotal = getBookingTotal(booking)
    const paid = getBookingPaidAmount(booking)
    return Math.max(0, payableTotal - paid)
}

export const getBookingGuestTotals = (booking = {}) => {
    return getBookingRooms(booking).reduce((totals, room) => {
        const kids = Number(room.children !== undefined ? room.children : (room.babies || 0))
        return {
            adults: totals.adults + Number(room.adults || 0),
            babies: totals.babies + kids,
            children: totals.children + kids
        }
    }, { adults: 0, babies: 0, children: 0 })
}

export const getBookingDateSummary = (booking = {}) => {
    const rooms = getBookingRooms(booking).filter(room => room.checkIn && room.checkOut)
    if (!rooms.length) {
        if (booking.checkIn && booking.checkOut) {
            return `${formatDate(booking.checkIn)} to ${formatDate(booking.checkOut)}`
        }
        return ""
    }

    const checkIns = rooms.map(room => room.checkIn).sort()
    const checkOuts = rooms.map(room => room.checkOut).sort()
    return `${formatDate(checkIns[0])} to ${formatDate(checkOuts[checkOuts.length - 1])}`
}

export const getEffectivePaymentHistory = (booking = {}) => {
    if (Array.isArray(booking.paymentHistory) && booking.paymentHistory.length > 0) {
        return booking.paymentHistory
    }
    const paid = Number(booking.paidAmount !== undefined && booking.paidAmount !== null ? booking.paidAmount : (booking.advanceAmount || 0))
    if (paid > 0) {
        return [{
            amount: paid,
            paymentMethod: booking.paymentMethod || "Advance / Direct",
            transactionId: booking.transactionId || (booking.paymentMethod === "Cash" ? "Cash / Direct" : ""),
            reference: booking.reference || "",
            note: "Initial payment recorded",
            date: booking.createdAt || booking.statusUpdatedAt || new Date(),
            collectedBy: booking.bookedBy || booking.createdBy || { name: booking.reference || "Staff / Admin" }
        }]
    }
    return []
}
