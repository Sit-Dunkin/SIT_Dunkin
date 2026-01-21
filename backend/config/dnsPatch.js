import dns from 'dns';

// --- PARCHE DE RED PARA RENDER ---
// Este archivo debe importarse PRIMERO en index.js
// Fuerza a todo el sistema a usar IPv4, evitando bloqueos de Gmail con IPv6

if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const originalLookup = dns.lookup;

dns.lookup = (hostname, options, callback) => {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    } else if (typeof options === 'number') {
        options = { family: options };
    }
    
    options = options || {};
    
    // FORZADO AGRESIVO: Usar IPv4 SIEMPRE (Sobrescribe cualquier intento de usar IPv6)
    options.family = 4;

    if (hostname === 'smtp.gmail.com') {
        console.log(`🛡️ DNS Patch: Interceptando conexión a ${hostname} -> Forzando IPv4`);
    }
    
    return originalLookup(hostname, options, callback);
};

console.log("🌍 DNS Patch aplicado: Sistema forzado a IPv4 globalmente.");
