export const parseFacilityList = (facility = "") => {
    if (Array.isArray(facility)) {
        return facility.map(item => String(item).trim()).filter(Boolean)
    }

    return String(facility)
        .split(",")
        .map(item => item.trim())
        .filter(Boolean)
}

export const getRoomDisplayName = (room = {}) => {
    return room?.name || "Room"
}


export const parseRoomNumbers = (roomNumbers = "") => {
    if (Array.isArray(roomNumbers)) {
        return roomNumbers.map(item => String(item).trim()).filter(Boolean)
    }

    return String(roomNumbers)
        .split(",")
        .map(item => item.trim())
        .filter(Boolean)
}

export const getYouTubeEmbedUrl = (video = "") => {
    const value = String(video || "").trim()
    if (!value) return ""

    try {
        const url = new URL(value)
        const host = url.hostname.replace(/^www\./, "")
        let videoId = ""

        if (host === "youtu.be") {
            videoId = url.pathname.split("/").filter(Boolean)[0]
        } else if (host.endsWith("youtube.com")) {
            if (url.pathname.startsWith("/embed/")) {
                videoId = url.pathname.split("/").filter(Boolean)[1]
            } else if (url.pathname.startsWith("/shorts/")) {
                videoId = url.pathname.split("/").filter(Boolean)[1]
            } else {
                videoId = url.searchParams.get("v")
            }
        }

        return videoId ? `https://www.youtube.com/embed/${videoId}` : ""
    } catch (_) {
        return ""
    }
}
