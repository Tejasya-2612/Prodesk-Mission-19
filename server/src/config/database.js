import dns from 'node:dns';

export function configureMongoDns() {
  if (process.env.MONGODB_DNS_SERVER) dns.setServers([process.env.MONGODB_DNS_SERVER]);
}

