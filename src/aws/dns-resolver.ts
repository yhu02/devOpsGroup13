// Define interface for Cloudflare DNS response
interface DnsResponse {
    Status: number;
    Answer?: {
      name: string;
      type: number;
      TTL: number;
      data: string;
    }[];
  }
  
  // A simple DNS resolver for browser environments
  class DnsResolver {
    private static instance: DnsResolver;
    private cache: Map<string, string> = new Map();
    private pendingRequests: Map<string, Promise<string>> = new Map();
    
    // Public DNS service URL
    private dnsApiUrl = 'https://cloudflare-dns.com/dns-query';
    
    private constructor() {}
    
    public static getInstance(): DnsResolver {
      if (!DnsResolver.instance) {
        DnsResolver.instance = new DnsResolver();
      }
      return DnsResolver.instance;
    }
    
    // Attempt to resolve an IP to a hostname
    public async resolveIp(ip: string): Promise<string> {
      // Check if we already have this information cached
      if (this.cache.has(ip)) {
        return this.cache.get(ip)!;
      }
      
      // Check if there's a pending request for this IP
      if (this.pendingRequests.has(ip)) {
        return this.pendingRequests.get(ip)!;
      }
      
      // Create a new request
      const requestPromise = this._fetchPtrRecord(ip);
      this.pendingRequests.set(ip, requestPromise);
      
      try {
        const hostname = await requestPromise;
        // Store in cache
        this.cache.set(ip, hostname);
        return hostname;
      } finally {
        // Clean up pending request
        this.pendingRequests.delete(ip);
      }
    }
    
    // Format IP for reverse DNS lookup
    private _formatReverseIp(ip: string): string {
      // Convert IP address to reverse pointer format
      // Example: 8.8.8.8 becomes 8.8.8.8.in-addr.arpa
      return `${ip.split('.').reverse().join('.')}.in-addr.arpa`;
    }
  
    // Fetch PTR record using DNS-over-HTTPS
    private async _fetchPtrRecord(ip: string): Promise<string> {
      try {
        const reversedIp = this._formatReverseIp(ip);
        
        // Using Cloudflare's DNS-over-HTTPS API
        const response = await fetch(`${this.dnsApiUrl}?name=${reversedIp}&type=PTR`, {
          headers: {
            'Accept': 'application/dns-json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`DNS query failed: ${response.statusText}`);
        }
        
        const data: DnsResponse = await response.json();
        
        // Check if we got a valid answer
        if (data.Answer && data.Answer.length > 0) {
          // Return the first PTR record
          return data.Answer[0].data;
        } else {
          // No PTR record found
          return ip;
        }
      } catch (error) {
        console.error(`Error resolving hostname for IP ${ip}:`, error);
        // Return the original IP if resolution fails
        return ip;
      }
    }
    
    // Suggest a better name for a resource based on its IP
    public getResourceName(ip: string, hostname: string): string {
      if (hostname && hostname !== ip) {
        // Extract domain name from hostname
        // e.g., "server-1.example.com" -> "example.com"
        const parts: string[] = hostname.split('.');
        if (parts.length >= 2) {
          const domainParts: string[] = parts.slice(-2);
          if (domainParts[0].length > 3) { // Avoid things like "co.uk"
            return domainParts.join('.');
          } else if (parts.length >= 3) {
            return parts.slice(-3).join('.');
          }
        }
        return hostname;
      }
      return `IP ${ip}`;
    }
  }
  
  export { DnsResolver };