export const CATEGORY_ICONS: Record<string, string> = {
    Makan: "🍜",
    Jajan: "🧋",
    Transport: "🚌",
    Bensin: "⛽",
    "Kuota/Pulsa": "📱",
    "Kebutuhan Rumah": "🏠",
    Belanja: "🛒",
    Hiburan: "🎮",
    Kesehatan: "💊",
    Lainnya: "💸",
};

export const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
    Makan: { bg: "#FF6B6B", border: "rgba(255, 107, 107, 0.3)", text: "#FF6B6B", gradient: "from-[#FF6B6B] to-[#FF8E8E]" },
    Jajan: { bg: "#4ECDC4", border: "rgba(78, 205, 196, 0.3)", text: "#4ECDC4", gradient: "from-[#4ECDC4] to-[#6FE0DC]" },
    Transport: { bg: "#45B7D1", border: "rgba(69, 183, 209, 0.3)", text: "#45B7D1", gradient: "from-[#45B7D1] to-[#7CD5E1]" },
    Bensin: { bg: "#F7B731", border: "rgba(247, 183, 49, 0.3)", text: "#F7B731", gradient: "from-[#F7B731] to-[#FCC96F]" },
    "Kuota/Pulsa": { bg: "#5F27CD", border: "rgba(95, 39, 205, 0.3)", text: "#5F27CD", gradient: "from-[#5F27CD] to-[#8B5CF6]" },
    "Kebutuhan Rumah": { bg: "#96CEB4", border: "rgba(150, 206, 180, 0.3)", text: "#96CEB4", gradient: "from-[#96CEB4] to-[#B8E5D5]" },
    Belanja: { bg: "#FF85A1", border: "rgba(255, 133, 161, 0.3)", text: "#FF85A1", gradient: "from-[#FF85A1] to-[#FFB3C6]" },
    Hiburan: { bg: "#A29BFE", border: "rgba(162, 155, 254, 0.3)", text: "#A29BFE", gradient: "from-[#A29BFE] to-[#C8B9FF]" },
    Kesehatan: { bg: "#00B894", border: "rgba(0, 184, 148, 0.3)", text: "#00B894", gradient: "from-[#00B894] to-[#55D19F]" },
    Lainnya: { bg: "#636E72", border: "rgba(99, 110, 114, 0.3)", text: "#636E72", gradient: "from-[#636E72] to-[#95A5A6]" },
};

export function getCategoryIcon(cat: string) {
    return CATEGORY_ICONS[cat] ?? "💸";
}

export function getCategoryColor(cat: string) {
    return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS["Lainnya"];
}

export const CATEGORIES = Object.keys(CATEGORY_ICONS);
