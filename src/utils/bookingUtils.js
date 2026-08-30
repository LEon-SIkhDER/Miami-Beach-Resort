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

    return [{
        roomId: booking.roomId,
        categoryId: booking.categoryId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        adults: Number(booking.adults || 1),
        babies: Number(booking.babies || 0),
        pricePerNight: Number(booking.pricePerNight || booking.price || 0),
        room: {
            name: booking.roomName,
            category: booking.roomCategory
        }
    }]
}

export const getRoomName = (roomItem = {}) => {
    return roomItem.room?.name || roomItem.roomName || roomItem.room?.category || roomItem.roomCategory || "Room"
}

export const getRoomTotal = (roomItem = {}) => {
    return getNightCount(roomItem.checkIn, roomItem.checkOut) * Number(roomItem.pricePerNight || 0)
}

export const getBookingTotal = (booking = {}) => {
    const total = getBookingRooms(booking).reduce((sum, room) => sum + getRoomTotal(room), 0)
    return total || Number(booking.totalAmount || booking.calculatedTotalAmount || 0)
}

export const getBookingGuestTotals = (booking = {}) => {
    return getBookingRooms(booking).reduce((totals, room) => ({
        adults: totals.adults + Number(room.adults || 0),
        babies: totals.babies + Number(room.babies || 0)
    }), { adults: 0, babies: 0 })
}

export const getBookingDateSummary = (booking = {}) => {
    const rooms = getBookingRooms(booking).filter(room => room.checkIn && room.checkOut)
    if (!rooms.length) return ""

    const checkIns = rooms.map(room => room.checkIn).sort()
    const checkOuts = rooms.map(room => room.checkOut).sort()
    return `${checkIns[0]} to ${checkOuts[checkOuts.length - 1]}`
}
