import asyncio
import ipaddress
import socket
import subprocess
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Callable, Optional

try:
    from scapy.all import sniff, IP, TCP, UDP, DNS, DNSQR, AsyncSniffer, conf
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False

import psutil


@dataclass
class Packet:
    src_ip: str
    dst_ip: str
    src_port: Optional[int]
    dst_port: Optional[int]
    protocol: str
    size: int
    timestamp: str
    direction: str  # "out" | "in"
    pid: Optional[int] = None
    process_name: Optional[str] = None


def get_local_ips() -> set[str]:
    ips = set()
    for iface_addrs in psutil.net_if_addrs().values():
        for addr in iface_addrs:
            if addr.family == socket.AF_INET:
                ips.add(addr.address)
    return ips


_PORT_CACHE_TTL = 1.0
_port_cache: dict[str, dict[int, tuple[int, Optional[str]]]] = {"tcp": {}, "udp": {}}
_port_cache_at: dict[str, float] = {"tcp": 0.0, "udp": 0.0}


def _refresh_port_cache(kind: str) -> None:
    table: dict[int, tuple[int, Optional[str]]] = {}
    try:
        for conn in psutil.net_connections(kind=kind):
            if conn.laddr and conn.pid and conn.laddr.port not in table:
                try:
                    name = psutil.Process(conn.pid).name()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    name = None
                table[conn.laddr.port] = (conn.pid, name)
    except Exception:
        pass
    _port_cache[kind] = table
    _port_cache_at[kind] = time.monotonic()


def get_capture_ifaces() -> list[str]:
    """Active Ethernet/Wi-Fi interfaces plus VPN tunnels (utun*) that carry an IPv4 address.
    Scapy's default is the default-route interface, which is the tunnel when a VPN is up."""
    stats = psutil.net_if_stats()
    ifaces = []
    for name, addrs in psutil.net_if_addrs().items():
        if not name.startswith(("en", "utun")) or name not in stats or not stats[name].isup:
            continue
        if any(a.family == socket.AF_INET and not a.address.startswith("169.254.") for a in addrs):
            ifaces.append(name)
    return ifaces


def get_vpn_endpoints() -> set[str]:
    """Public hosts reached through a host route on a physical interface: the VPN servers.
    With a tunnel up, packets to them are the encrypted copy of traffic we already see decrypted on utun*."""
    try:
        out = subprocess.run(["netstat", "-rn", "-f", "inet"], capture_output=True, text=True, timeout=5).stdout
    except Exception:
        return set()
    endpoints = set()
    for line in out.splitlines():
        cols = line.split()
        if len(cols) < 4 or not cols[3].startswith("en") or not ("G" in cols[2] and "H" in cols[2]):
            continue
        try:
            ip = ipaddress.ip_address(cols[0])
        except ValueError:
            continue
        if ip.is_global:
            endpoints.add(cols[0])
    return endpoints


def get_process_for_port(port: int, proto: str) -> tuple[Optional[int], Optional[str]]:
    # Scanning the socket table per packet pegs a CPU core; refresh it at most once per TTL.
    kind = "tcp" if proto == "TCP" else "udp"
    if time.monotonic() - _port_cache_at[kind] > _PORT_CACHE_TTL:
        _refresh_port_cache(kind)
    return _port_cache[kind].get(port, (None, None))


class PacketSniffer:
    def __init__(self, callback: Callable[[Packet], None], ports: list[int] | None = None):
        self.callback = callback
        self.ports = ports or []
        self.local_ips = get_local_ips()
        self._sniffer: Optional[AsyncSniffer] = None
        self._running = False
        self._vpn_endpoints: set[str] = set()

    def _process_packet(self, pkt) -> None:
        if not pkt.haslayer(IP):
            return

        ip = pkt[IP]
        src, dst = ip.src, ip.dst

        if src not in self.local_ips and dst not in self.local_ips:
            return
        if src in self._vpn_endpoints or dst in self._vpn_endpoints:
            return

        proto = "OTHER"
        src_port = dst_port = None

        if pkt.haslayer(TCP):
            proto = "TCP"
            src_port = pkt[TCP].sport
            dst_port = pkt[TCP].dport
        elif pkt.haslayer(UDP):
            proto = "UDP"
            src_port = pkt[UDP].sport
            dst_port = pkt[UDP].dport

        # Filter here, not with a BPF filter: those are compiled for Ethernet and match nothing on utun*.
        if self.ports and src_port not in self.ports and dst_port not in self.ports:
            return

        direction = "out" if src in self.local_ips else "in"
        local_port = src_port if direction == "out" else dst_port

        pid, process_name = None, None
        if local_port and proto in ("TCP", "UDP"):
            pid, process_name = get_process_for_port(local_port, proto)

        packet = Packet(
            src_ip=src,
            dst_ip=dst,
            src_port=src_port,
            dst_port=dst_port,
            protocol=proto,
            size=len(pkt),
            timestamp=datetime.utcnow().isoformat(),
            direction=direction,
            pid=pid,
            process_name=process_name,
        )
        self.callback(packet)

    def start(self) -> None:
        if not SCAPY_AVAILABLE:
            print("[sniffer] scapy not available - packet capture disabled", flush=True)
            return
        self._running = True
        try:
            ifaces = get_capture_ifaces()
            if any(i.startswith("utun") for i in ifaces):
                self._vpn_endpoints = get_vpn_endpoints()
            self._sniffer = AsyncSniffer(
                iface=ifaces or None,
                prn=self._process_packet,
                store=False,
            )
            self._sniffer.start()
            print(f"[sniffer] capturing on {ifaces or conf.iface}, ignoring VPN endpoints {sorted(self._vpn_endpoints)}", flush=True)
            # Keep thread alive so the daemon thread doesn't exit prematurely.
            # AsyncSniffer swallows capture errors (e.g. no BPF access), so surface them here.
            reported = False
            ticks = 0
            while self._running:
                time.sleep(1)
                ticks += 1
                if ticks % 30 == 0 and any(i.startswith("utun") for i in ifaces):
                    self._vpn_endpoints = get_vpn_endpoints()
                exc = getattr(self._sniffer, "exception", None)
                if exc and not reported:
                    reported = True
                    print(f"[sniffer] capture failed on {ifaces or conf.iface}: {exc}", flush=True)
        except Exception as exc:
            print(f"[sniffer] failed to start: {exc}", flush=True)

    def stop(self) -> None:
        self._running = False
        if self._sniffer:
            self._sniffer.stop()
