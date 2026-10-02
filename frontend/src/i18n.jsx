import { createContext, useContext, useState } from 'react'

const en = {
  // Navigation
  nav_graph: 'Graph',
  nav_map: 'Map',

  // Status badge
  status_connected: 'Live',
  status_connecting: 'Connecting…',
  status_disconnected: 'Disconnected',
  status_error: 'Error',
  lan_devices: n => `${n} device${n > 1 ? 's' : ''} LAN`,

  // Legend
  legend_alert: 'Alert',
  legend_unknown: 'Unknown',

  // Sidebar header + stats
  tagline: 'Map the invisible.',
  stat_lan: 'LAN Devices',
  stat_ext: 'Ext. hosts',
  stat_traffic: 'Traffic',

  // Sidebar sections
  section_lan: n => `LAN Devices (${n})`,
  section_ext: (n, total) => total ? `External hosts (${n}/${total})` : `External hosts (${n})`,
  section_packets: 'Recent traffic',

  // Node detail field labels
  field_ip: 'IP',
  field_mac: 'MAC',
  field_hostname: 'Hostname',
  field_vendor: 'Vendor',
  field_type: 'Type',
  field_country: 'Country',
  field_city: 'City',
  field_org: 'Org',
  field_category: 'Category',
  field_traffic: 'Traffic',
  field_packets: 'Packets',
  processes: 'Processes',
  online: 'online',
  offline: 'offline',

  // Search
  search_placeholder: 'Search host, IP, country…',
  cat_all: 'All',
  cat_unknown: 'Unknown',

  // Alert panel
  alerts_title: 'Alerts',
  alerts_total: 'total',
  alerts_empty: 'No alerts yet',
  alert_NEW_HOST: 'New host',
  alert_SUSPICIOUS_PROCESS: 'Suspicious process',
  alert_SUSPICIOUS_PORT: 'Suspicious port',
  alert_BEACON: 'Regular beacon',
  alert_VOLUME_SPIKE: 'Traffic spike',
  alert_NEW_LAN_DEVICE: 'New device',
  alert_DEVICE_OFFLINE: 'Device offline',
  alert_MEDIA_EXFIL: 'Media exfiltration',
  alertmsg_NEW_HOST: d => `New host contacted: ${d.label}`,
  alertmsg_SUSPICIOUS_PROCESS: d => `Suspicious process: ${d.process} → ${d.label}`,
  alertmsg_SUSPICIOUS_PORT: d => `Suspicious port ${d.port} (${d.reason}) → ${d.label}`,
  alertmsg_BEACON: d => `Beacon behaviour detected: one connection every ${Math.round(d.interval)}s to ${d.label}`,
  alertmsg_VOLUME_SPIKE: d => `Traffic spike to ${d.label} (${Math.floor(d.size / 1024)} KB in one packet)`,
  alertmsg_NEW_LAN_DEVICE: d => `New device on the network: ${d.label}`,
  alertmsg_DEVICE_OFFLINE: d => `Device offline: ${d.label}`,
  alertmsg_MEDIA_EXFIL: d => `Suspected ${d.device} exfiltration: ${d.process} → ${d.label}`,
  time_just_now: 'just now',
  time_seconds: n => `${n}s ago`,
  time_minutes: n => `${n}min ago`,
  time_hours: n => `${n}h ago`,

  // Privacy score
  ai_explain_btn: 'Explain with AI',
  ai_ask_host_btn: 'Ask AI about this host',
  ai_explaining: 'Analyzing…',
  ai_close: 'Close',
  ai_failed: 'AI request failed. Try again.',
  ai_no_key: path => `Add a Claude credential to enable this: add ANTHROPIC_API_KEY=... or CLAUDE_CODE_OAUTH_TOKEN=... to ${path}`,
  privacy_title: 'Privacy Score',
  privacy_critical_label: 'Critical',
  privacy_excellent_label: 'Excellent',
  privacy_risk_factors: n => `${n} risk factor${n !== 1 ? 's' : ''}`,
  privacy_more_factors: n => `+${n} more factor${n > 1 ? 's' : ''}`,
  privacy_label_excellent: 'Excellent',
  privacy_label_good: 'Good',
  privacy_label_average: 'Average',
  privacy_label_weak: 'Weak',
  privacy_label_critical: 'Critical',

  // Timeline
  timeline_packets: n => `${n.toLocaleString()} packets`,
  timeline_alerts: n => `${n} alert${n > 1 ? 's' : ''}`,

  // Capture toggle
  capture_stop: 'Stop',
  capture_start: 'Start',
  capture_stopping: 'Stopping…',
  capture_starting: 'Starting…',

  // Port filter
  port_filter: 'Ports',
  port_all: 'All ports',
  port_placeholder: 'Add port (e.g. 443)',
  port_invalid: 'Invalid port',

  // Export
  export_btn: 'Export',
  export_graph_json: 'Graph (JSON)',
  export_graph_csv: 'Graph (CSV)',
  export_alerts_json: 'Alerts (JSON)',
  export_alerts_csv: 'Alerts (CSV)',

  // Process filter
  process_filter: 'Apps',
  process_filter_hint: 'Click to hide app from graph',
  process_none: 'No processes detected yet',
  process_clear: 'Show all apps',

  // IP whitelist
  ip_whitelist: 'Trusted',
  ip_whitelist_hint: 'Trusted IPs are no longer captured or shown',
  ip_placeholder: 'Add IP (e.g. 1.1.1.1)',
  ip_invalid: 'Invalid IP address',
  ip_clear: 'Clear whitelist',
  whitelist_action: 'Mark as trusted',

  // Map
  map_you: 'You',
  map_located: n => `${n} located host${n !== 1 ? 's' : ''}`,
  map_no_geo: 'no geo',

  // Scoring factor labels (key + args)
  score_trackers: n => `${n} tracker${n > 1 ? 's' : ''} contacted`,
  score_tracker_traffic: pct => `${pct}% traffic to trackers`,
  score_ad_networks: n => `${n} ad network${n > 1 ? 's' : ''}`,
  score_beacons: n => `${n} beacon behavior${n > 1 ? 's' : ''}`,
  score_susp_proc: n => `${n} suspicious process${n > 1 ? 'es' : ''}`,
  score_susp_ports: n => `${n} dangerous port${n > 1 ? 's' : ''}`,
  score_critical_alerts: n => `${n} critical alert${n > 1 ? 's' : ''}`,
  score_warnings: n => `${n} warnings`,
  score_https_ratio: pct => `${pct}% HTTPS traffic`,
  score_no_trackers: 'No trackers detected',
}

const fr = {
  // Navigation
  nav_graph: 'Graphe',
  nav_map: 'Carte',

  // Status badge
  status_connected: 'Live',
  status_connecting: 'Connexion…',
  status_disconnected: 'Déconnecté',
  status_error: 'Erreur',
  lan_devices: n => `${n} device${n > 1 ? 's' : ''} LAN`,

  // Legend
  legend_alert: 'Alerte',
  legend_unknown: 'Inconnu',

  // Sidebar header + stats
  tagline: 'Map the invisible.',
  stat_lan: 'Devices LAN',
  stat_ext: 'Hôtes ext.',
  stat_traffic: 'Trafic',

  // Sidebar sections
  section_lan: n => `Devices LAN (${n})`,
  section_ext: (n, total) => total ? `Hôtes externes (${n}/${total})` : `Hôtes externes (${n})`,
  section_packets: 'Flux récents',

  // Node detail field labels
  field_ip: 'IP',
  field_mac: 'MAC',
  field_hostname: 'Hostname',
  field_vendor: 'Vendor',
  field_type: 'Type',
  field_country: 'Pays',
  field_city: 'Ville',
  field_org: 'Org',
  field_category: 'Catégorie',
  field_traffic: 'Trafic',
  field_packets: 'Paquets',
  processes: 'Processus',
  online: 'online',
  offline: 'offline',

  // Search
  search_placeholder: 'Rechercher hôte, IP, pays…',
  cat_all: 'Tout',
  cat_unknown: 'Inconnu',

  // Alert panel
  alerts_title: 'Alertes',
  alerts_total: 'total',
  alerts_empty: "Aucune alerte pour l'instant",
  alert_NEW_HOST: 'Nouvel hôte',
  alert_SUSPICIOUS_PROCESS: 'Processus suspect',
  alert_SUSPICIOUS_PORT: 'Port suspect',
  alert_BEACON: 'Regular beacon',
  alert_VOLUME_SPIKE: 'Pic de trafic',
  alert_NEW_LAN_DEVICE: 'Nouveau device',
  alert_DEVICE_OFFLINE: 'Device hors ligne',
  alert_MEDIA_EXFIL: 'Exfiltration média',
  alertmsg_NEW_HOST: d => `Nouvel hôte contacté : ${d.label}`,
  alertmsg_SUSPICIOUS_PROCESS: d => `Processus suspect : ${d.process} → ${d.label}`,
  alertmsg_SUSPICIOUS_PORT: d => `Port suspect ${d.port} (${d.reason}) → ${d.label}`,
  alertmsg_BEACON: d => `Comportement beacon détecté : une connexion toutes les ${Math.round(d.interval)}s vers ${d.label}`,
  alertmsg_VOLUME_SPIKE: d => `Pic de trafic vers ${d.label} (${Math.floor(d.size / 1024)} Ko en un paquet)`,
  alertmsg_NEW_LAN_DEVICE: d => `Nouveau device sur le réseau : ${d.label}`,
  alertmsg_DEVICE_OFFLINE: d => `Device hors ligne : ${d.label}`,
  alertmsg_MEDIA_EXFIL: d => `Exfiltration ${d.device === 'microphone' ? 'du microphone' : 'de la caméra'} suspectée : ${d.process} → ${d.label}`,
  time_just_now: "à l'instant",
  time_seconds: n => `il y a ${n}s`,
  time_minutes: n => `il y a ${n}min`,
  time_hours: n => `il y a ${n}h`,

  // Privacy score
  ai_explain_btn: "Expliquer avec l'IA",
  ai_ask_host_btn: "Demander à l'IA (cet hôte)",
  ai_explaining: 'Analyse…',
  ai_close: 'Fermer',
  ai_failed: 'La requête IA a échoué. Réessayez.',
  ai_no_key: path => `Ajoutez un identifiant Claude pour activer ceci : ajoutez ANTHROPIC_API_KEY=... ou CLAUDE_CODE_OAUTH_TOKEN=... dans ${path}`,
  privacy_title: 'Privacy Score',
  privacy_critical_label: 'Critique',
  privacy_excellent_label: 'Excellent',
  privacy_risk_factors: n => `${n} facteur${n !== 1 ? 's' : ''} de risque`,
  privacy_more_factors: n => `+${n} autre${n > 1 ? 's' : ''} facteur${n > 1 ? 's' : ''}`,
  privacy_label_excellent: 'Excellente',
  privacy_label_good: 'Bonne',
  privacy_label_average: 'Moyenne',
  privacy_label_weak: 'Faible',
  privacy_label_critical: 'Critique',

  // Timeline
  timeline_packets: n => `${n.toLocaleString('fr-FR')} paquets`,
  timeline_alerts: n => `${n} alerte${n > 1 ? 's' : ''}`,

  // Capture toggle
  capture_stop: 'Stop',
  capture_start: 'Démarrer',
  capture_stopping: 'Arrêt…',
  capture_starting: 'Démarrage…',

  // Port filter
  port_filter: 'Ports',
  port_all: 'Tous les ports',
  port_placeholder: 'Ajouter un port (ex: 443)',
  port_invalid: 'Port invalide',

  // Export
  export_btn: 'Exporter',
  export_graph_json: 'Graphe (JSON)',
  export_graph_csv: 'Graphe (CSV)',
  export_alerts_json: 'Alertes (JSON)',
  export_alerts_csv: 'Alertes (CSV)',

  // Process filter
  process_filter: 'Apps',
  process_filter_hint: 'Cliquer pour masquer une app du graphe',
  process_none: 'Aucun processus détecté pour l\'instant',
  process_clear: 'Tout afficher',

  // IP whitelist
  ip_whitelist: 'Confiance',
  ip_whitelist_hint: 'Les IPs de confiance ne sont plus capturées ni affichées',
  ip_placeholder: 'Ajouter une IP (ex: 1.1.1.1)',
  ip_invalid: 'Adresse IP invalide',
  ip_clear: 'Vider la liste',
  whitelist_action: 'Marquer comme fiable',

  // Map
  map_you: 'Vous',
  map_located: n => `${n} hôte${n !== 1 ? 's' : ''} localisé${n !== 1 ? 's' : ''}`,
  map_no_geo: 'sans géo',

  // Scoring factor labels
  score_trackers: n => `${n} tracker${n > 1 ? 's' : ''} contacté${n > 1 ? 's' : ''}`,
  score_tracker_traffic: pct => `${pct}% trafic vers trackers`,
  score_ad_networks: n => `${n} régie${n > 1 ? 's' : ''} publicitaire${n > 1 ? 's' : ''}`,
  score_beacons: n => `${n} comportement${n > 1 ? 's' : ''} beacon`,
  score_susp_proc: n => `${n} processus suspect${n > 1 ? 's' : ''}`,
  score_susp_ports: n => `${n} port${n > 1 ? 's' : ''} dangereux`,
  score_critical_alerts: n => `${n} alerte${n > 1 ? 's' : ''} critique${n > 1 ? 's' : ''}`,
  score_warnings: n => `${n} alertes`,
  score_https_ratio: pct => `${pct}% trafic HTTPS`,
  score_no_trackers: 'Aucun tracker détecté',
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('en')
  const dict = lang === 'fr' ? fr : en

  function t(key, ...args) {
    const val = dict[key]
    if (val === undefined) return key
    if (typeof val === 'function') return val(...args)
    return val
  }

  return (
    <I18nContext.Provider value={{ lang, t, setLang }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useT = () => useContext(I18nContext)
