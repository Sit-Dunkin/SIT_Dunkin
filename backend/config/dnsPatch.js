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
    
    // Forzamos IPv4 si no se especificó familia
    if (!options.family) {
        options.family = 4;
    }
    
    return originalLookup(hostname, options, callback);
};

console.log("🌍 DNS Patch aplicado: Sistema forzado a IPv4 globalmente.");
