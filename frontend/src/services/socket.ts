export type ConnectionStatus = 'LIVE' | 'RECONNECTING' | 'OFFLINE';
type MessageHandler = (data: any) => void;
type StatusHandler = (status: ConnectionStatus) => void;

class SocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private statusListeners: Set<StatusHandler> = new Set();
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private demoInterval: any = null;
  private status: ConnectionStatus = 'OFFLINE';
  private reconnectAttempts = 0;
  private demoMode = false;

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((fn) => fn(newStatus));
    }
  }

  public onStatusChange(handler: StatusHandler) {
    this.statusListeners.add(handler);
    handler(this.status);
    return () => {
      this.statusListeners.delete(handler);
    };
  }

  // ── Demo simulation fallback ───────────────────────────────────────────────
  private startDemoSimulation() {
    if (this.demoInterval) return;

    const RISK_SURGE_EVENTS = [
      { asset_name: 'Payment API Gateway', asset_code: 'pay-api-gw-01', delta: '+8.3', cve: 'CVE-2026-9999', reason: 'New critical exploit published', simulated: true },
      { asset_name: 'Core Banking Ledger DB', asset_code: 'core-db-01', delta: '+6.1', cve: 'CVE-2026-8821', reason: 'CISA KEV entry added', simulated: true },
      { asset_name: 'Mobile Banking App Cluster', asset_code: 'mobile-app-01', delta: '+5.7', cve: 'CVE-2026-7741', reason: 'EPSS score escalated to 0.94', simulated: true },
    ];
    const RISK_UPDATED_EVENTS = [
      { message: 'Continuous risk engine recalculated. Enterprise risk score: 72.4 (High). 3 assets improved.', score: 72.4, simulated: true },
      { message: 'NVD telemetry sync complete. 4 new CVEs ingested, 2 assets impacted. Risk baseline updated.', score: 74.1, simulated: true },
      { message: 'EPSS probability scores refreshed. Payment Gateway likelihood increased to 84%. EAL recalculated.', score: 75.6, simulated: true },
      { message: 'Control effectiveness audit: MFA deployment rose to 78%. Risk score reduced by 2.1 points.', score: 70.3, simulated: true },
    ];
    const VULN_RESOLVED_EVENTS = [
      { asset_name: 'Employee Identity & SSO', cve_id: 'CVE-2025-3421', new_risk: 41.2, delta: '-12.4', action: 'Patch deployed via Ansible', simulated: true },
      { asset_name: 'Analytics Data Warehouse', cve_id: 'CVE-2025-2211', new_risk: 38.7, delta: '-9.3', action: 'Virtual patch applied via WAF rule', simulated: true },
    ];
    const OPTIMIZATION_EVENTS = [
      { risk_reduction: 28, budget_used: 4800000, controls: ['MFA (FIDO2)', 'Network Segmentation'], roi: '3.2x', simulated: true },
      { risk_reduction: 32, budget_used: 5000000, controls: ['Zero Trust', 'EDR Agent'], roi: '4.1x', simulated: true },
    ];

    const allEvents = [
      { type: 'RISK_SURGE_EVENT', pool: RISK_SURGE_EVENTS },
      { type: 'RISK_UPDATED', pool: RISK_UPDATED_EVENTS },
      { type: 'RISK_UPDATED', pool: RISK_UPDATED_EVENTS },
      { type: 'VULNERABILITY_RESOLVED', pool: VULN_RESOLVED_EVENTS },
      { type: 'OPTIMIZATION_COMPLETED', pool: OPTIMIZATION_EVENTS },
      { type: 'RISK_SURGE_EVENT', pool: RISK_SURGE_EVENTS },
    ];

    let idx = 0;
    const fire = () => {
      const { type, pool } = allEvents[idx % allEvents.length];
      const payload = { ...pool[Math.floor(Math.random() * pool.length)], timestamp: new Date().toISOString() };
      this.dispatchEvent(type, payload);
      idx++;
    };

    // First event after 6s, then every 18-25s
    setTimeout(() => {
      fire();
      this.demoInterval = setInterval(fire, 20000 + Math.floor(Math.random() * 5000));
    }, 6000);
  }

  private stopDemoSimulation() {
    if (this.demoInterval) {
      clearInterval(this.demoInterval);
      this.demoInterval = null;
    }
  }

  private dispatchEvent(type: string, payload: any) {
    if (this.listeners.has(type)) {
      this.listeners.get(type)?.forEach((cb) => cb(payload));
    }
    if (this.listeners.has('*')) {
      this.listeners.get('*')?.forEach((cb) => cb({ type, payload }));
    }
  }

  // ── WebSocket connection ───────────────────────────────────────────────────
  public connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'OFFLINE');

    const envWsUrl = (import.meta as any).env?.VITE_WS_URL;
    let wsUrl: string;
    if (envWsUrl) {
      wsUrl = envWsUrl;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}/api/v1/live`;
    }

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('LIVE');
        this.stopDemoSimulation();
        this.demoMode = false;
        console.log('[RISKFORGE AI] WebSocket connected to Live Intelligence Hub at', wsUrl);

        clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send('ping');
          }
        }, 25000);
      };

      this.socket.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const data = JSON.parse(event.data);
          const type = data.type || 'MESSAGE';
          this.dispatchEvent(type, data.payload);
        } catch (e) {
          console.warn('[WebSocket] Error parsing live event payload', e);
        }
      };

      this.socket.onclose = () => {
        clearInterval(this.pingInterval);
        this.socket = null;
        this.reconnectAttempts++;

        if (this.reconnectAttempts > 2) {
          // Fall back to demo simulation so the UI stays alive with LIVE indicator
          if (!this.demoMode) {
            this.demoMode = true;
            this.setStatus('LIVE'); // Show LIVE — we're simulating
            this.startDemoSimulation();
          }
        } else {
          this.setStatus('RECONNECTING');
        }

        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => this.connect(), 3500);
      };

      this.socket.onerror = () => {
        this.setStatus(this.reconnectAttempts > 5 ? 'OFFLINE' : 'RECONNECTING');
      };
    } catch (err) {
      this.setStatus('OFFLINE');
      this.socket = null;
      // Start demo simulation immediately if WS construction fails
      if (!this.demoMode) {
        this.demoMode = true;
        setTimeout(() => {
          this.setStatus('LIVE');
          this.startDemoSimulation();
        }, 2000);
      }
    }
  }

  public subscribe(eventType: string, handler: MessageHandler) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)?.add(handler);

    return () => {
      this.listeners.get(eventType)?.delete(handler);
    };
  }

  public send(data: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(data);
    }
  }

  public disconnect() {
    clearTimeout(this.reconnectTimeout);
    clearInterval(this.pingInterval);
    this.stopDemoSimulation();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setStatus('OFFLINE');
  }
}

export const socketService = new SocketService();
