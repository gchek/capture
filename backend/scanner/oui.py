# Partial OUI table  first 6 hex chars of MAC (uppercase, no colons)
OUI_TABLE: dict[str, tuple[str, str]] = {
    # Apple
    "A4C138": ("Apple", "phone"), "F0DCE2": ("Apple", "phone"),
    "3C0754": ("Apple", "phone"), "8C8590": ("Apple", "phone"),
    "ACBC32": ("Apple", "phone"), "F82793": ("Apple", "phone"),
    # Samsung
    "8CCE4E": ("Samsung", "phone"), "A0CBFD": ("Samsung", "phone"),
    "5425EA": ("Samsung", "phone"), "D87D76": ("Samsung", "tv"),
    # Cisco / Linksys
    "000C29": ("Cisco", "router"), "001A2F": ("Cisco", "router"),
    "1C1B0D": ("Cisco", "router"), "44D9E7": ("Cisco", "router"),
    # Netgear
    "20E52A": ("Netgear", "router"), "A021B7": ("Netgear", "router"),
    "C03F0E": ("Netgear", "router"),
    # TP-Link
    "50C7BF": ("TP-Link", "router"), "B0487A": ("TP-Link", "router"),
    "E894F6": ("TP-Link", "router"), "F4F26D": ("TP-Link", "router"),
    # ASUS
    "10BF48": ("ASUS", "router"), "107B44": ("ASUS", "router"),
    "2C4D54": ("ASUS", "router"),
    # Raspberry Pi
    "B827EB": ("Raspberry Pi", "iot"), "DC8E95": ("Raspberry Pi", "iot"),
    "E45F01": ("Raspberry Pi", "iot"),
    # Intel (usually PC/laptop)
    "8086F2": ("Intel", "pc"), "A4C3F0": ("Intel", "pc"),
    # Realtek (PC)
    "00E04C": ("Realtek", "pc"),
    # Google (Chromecast, Home, etc.)
    "54600A": ("Google", "iot"), "F88FCA": ("Google", "iot"),
    "A47733": ("Google", "iot"),
    # Amazon (Echo, Fire TV)
    "A002DC": ("Amazon", "iot"), "FC65DE": ("Amazon", "iot"),
    "B47C9C": ("Amazon", "iot"),
    # Sonos
    "5CAAFD": ("Sonos", "iot"), "B8E937": ("Sonos", "iot"),
    # Xbox / Microsoft
    "7C1E52": ("Microsoft", "pc"), "28184D": ("Microsoft", "pc"),
    # PlayStation / Sony
    "00D9D1": ("Sony", "iot"), "F8D0AC": ("Sony", "iot"),
}


DEVICE_TYPE_COLORS: dict[str, str] = {
    "router":  "#f97316",
    "phone":   "#a855f7",
    "pc":      "#06b6d4",
    "tv":      "#ec4899",
    "iot":     "#84cc16",
    "unknown": "#64748b",
}


# macOS ships the full IEEE OUI registry (~35k vendors); the table above is the fallback elsewhere.
_SYSTEM_OUI = "/System/Library/Frameworks/AudioVideoBridging.framework/Versions/A/Resources/oui.plist"
_system_oui: dict[str, str] | None = None

_TYPE_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("router", ("technicolor", "tp-link", "netgear", "cisco", "linksys", "asus", "zyxel", "huawei",
                "ubiquiti", "mikrotik", "sagemcom", "arris", "d-link", "avm", "sercomm", "compal")),
    ("phone",  ("apple", "samsung", "xiaomi", "oneplus", "oppo", "vivo", "motorola")),
    ("tv",     ("lg electronics", "vizio", "tcl", "hisense", "roku")),
    ("iot",    ("espressif", "raspberry", "amazon", "google", "sonos", "ezviz", "hikvision", "tuya",
                "shelly", "philips", "signify", "sony", "nintendo", "ring", "nest")),
    ("pc",     ("intel", "realtek", "microsoft", "dell", "lenovo", "hewlett", "liteon", "azurewave")),
]


def _load_system_oui() -> dict[str, str]:
    global _system_oui
    if _system_oui is None:
        try:
            import plistlib
            with open(_SYSTEM_OUI, "rb") as f:
                _system_oui = {k: v for k, v in plistlib.load(f).items() if v}
        except Exception:
            _system_oui = {}
    return _system_oui


def _guess_type(vendor: str) -> str:
    v = vendor.lower()
    for device_type, words in _TYPE_KEYWORDS:
        if any(w in v for w in words):
            return device_type
    return "unknown"


def lookup(mac: str) -> tuple[str, str]:
    """Return (vendor, device_type) from a MAC address string."""
    key = mac.upper().replace(":", "").replace("-", "")[:6]
    if len(key) < 6:
        return "Unknown", "unknown"
    # Locally-administered bit set → randomized "private" Wi-Fi address (modern phones/laptops).
    if int(key[:2], 16) & 0x02:
        return "Private address", "phone"
    if key in OUI_TABLE:
        return OUI_TABLE[key]
    vendor = _load_system_oui().get(key)
    if vendor:
        return vendor, _guess_type(vendor)
    return "Unknown", "unknown"
