import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DataMode } from '../types';
import { 
  riskApi, assetApi, serviceApi, vulnApi, controlApi, 
  evidenceApi, scenarioApi, investmentApi, optimizationApi, 
  aiApi, complianceApi 
} from '../services/api';
import { socketService } from '../services/socket';

export interface SimulationState {
  isActive: boolean;
  scenarioName?: string;
  appliedControls: string[];
  resolvedVulnIds: string[];
  simulatedRiskScore?: number;
  simulatedReduction?: number;
  estimatedCost?: number;
}

interface DataModeContextType {
  mode: DataMode;
  dataMode: DataMode;
  setMode: (mode: DataMode) => void;
  simulation: SimulationState;
  startSimulation: (
    scenario: { name: string; controls?: string[]; vulns?: string[]; riskScore?: number; reduction?: number; cost?: number },
    switchToSimulationMode?: boolean
  ) => void;
  clearSimulation: () => void;
  getBadgeLabel: () => string;
  refreshAll: () => Promise<void>;
  lastUpdated: string;
}

const DataModeContext = createContext<DataModeContextType | undefined>(undefined);

export const DataModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<DataMode>(() => {
    return (localStorage.getItem('cybr_data_mode') as DataMode) || 'DEMO';
  });

  const [simulation, setSimulation] = useState<SimulationState>({
    isActive: false,
    appliedControls: [],
    resolvedVulnIds: [],
  });

  const getTimestamp = () => new Date().toLocaleTimeString() + '.' + String(new Date().getMilliseconds()).padStart(3, '0');

  const [lastUpdated, setLastUpdated] = useState<string>(() => getTimestamp());

  const setMode = (newMode: DataMode) => {
    setModeState(newMode);
    localStorage.setItem('cybr_data_mode', newMode);
    setLastUpdated(getTimestamp());
  };

  const startSimulation = (
    scenario: {
      name: string;
      controls?: string[];
      vulns?: string[];
      riskScore?: number;
      reduction?: number;
      cost?: number;
    },
    switchToSimulationMode: boolean = false
  ) => {
    setSimulation({
      isActive: true,
      scenarioName: scenario.name,
      appliedControls: scenario.controls || ['CTL-MFA', 'CTL-NET-SEG'],
      resolvedVulnIds: scenario.vulns || [],
      simulatedRiskScore: scenario.riskScore ?? 52.0,
      simulatedReduction: scenario.reduction ?? 32.0,
      estimatedCost: scenario.cost ?? 1200000.0,
    });
    if (switchToSimulationMode) {
      setMode('SIMULATION');
    }
  };

  const clearSimulation = () => {
    setSimulation({
      isActive: false,
      appliedControls: [],
      resolvedVulnIds: [],
    });
    const saved = (localStorage.getItem('cybr_data_mode') as DataMode) || 'LIVE';
    setMode(saved === 'SIMULATION' ? 'LIVE' : saved);
  };

  const getBadgeLabel = useCallback(() => {
    if (mode === 'SIMULATION') return 'SIMULATION';
    if (mode === 'LIVE') return 'LIVE DATA';
    return 'DEMO DATA';
  }, [mode]);

  const refreshAll = async () => {
    setLastUpdated(getTimestamp());
  };

  useEffect(() => {
    const unsub = socketService.subscribe('*', () => {
      setLastUpdated(getTimestamp());
    });
    return () => unsub();
  }, []);

  return (
    <DataModeContext.Provider
      value={{
        mode,
        dataMode: mode,
        setMode,
        simulation,
        startSimulation,
        clearSimulation,
        getBadgeLabel,
        refreshAll,
        lastUpdated,
      }}
    >
      {children}
    </DataModeContext.Provider>
  );
};

export const useDataMode = () => {
  const context = useContext(DataModeContext);
  if (!context) {
    throw new Error('useDataMode must be used within a DataModeProvider');
  }
  return context;
};

// Reusable Hooks consuming the unified data mode context
export function useRiskOverview() {
  const { mode, simulation, lastUpdated } = useDataMode();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await riskApi.getOverview();
      let overviewData = res.data;

      // In simulation mode, apply what-if delta non-destructively to preview metrics
      if (mode === 'SIMULATION' && simulation.isActive && simulation.simulatedRiskScore !== undefined) {
        overviewData = {
          ...overviewData,
          kpi: {
            ...overviewData.kpi,
            total_risk: simulation.simulatedRiskScore,
            delta_pct: -simulation.simulatedReduction!,
            risk_category: simulation.simulatedRiskScore < 50 ? 'MODERATE' : 'HIGH',
            expected_annual_loss: Math.round(overviewData.kpi.expected_annual_loss * 0.58),
            risk_reduction_opportunity: simulation.simulatedReduction!,
          },
          highest_risk_services: overviewData.highest_risk_services.map((s: any) =>
            s.name === 'Payment Gateway'
              ? { ...s, risk_score: simulation.simulatedRiskScore, trend: 'down', top_driver: 'MFA + Segmentation Active' }
              : s
          ),
        };
      }

      setData(overviewData);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch risk overview');
    } finally {
      setLoading(false);
    }
  }, [mode, simulation]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview, lastUpdated]);

  return { data, loading, error, refetch: fetchOverview };
}

export function useAssets(params?: any) {
  const { mode, simulation, lastUpdated } = useDataMode();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await assetApi.list(params);
      let list = res.data;

      if (mode === 'SIMULATION' && simulation.isActive) {
        list = list.map((a: any) => {
          if (a.asset_id_code === 'pay-api-gw-01') {
            return {
              ...a,
              current_risk_score: simulation.simulatedRiskScore ?? 52.0,
              control_coverage: 95.0,
            };
          }
          return a;
        });
      }

      setAssets(list);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  }, [mode, simulation, JSON.stringify(params)]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets, lastUpdated]);

  return { assets, loading, error, refetch: fetchAssets };
}

export function useServices() {
  const { lastUpdated } = useDataMode();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await serviceApi.list();
      setServices(res.data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch business services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices, lastUpdated]);

  return { services, loading, error, refetch: fetchServices };
}

export function useVulnerabilities(params?: any) {
  const { lastUpdated } = useDataMode();
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVulns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await vulnApi.list(params);
      setVulnerabilities(res.data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch vulnerabilities');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetchVulns();
  }, [fetchVulns, lastUpdated]);

  return { vulnerabilities, loading, error, refetch: fetchVulns };
}

export function useControls(params?: any) {
  const { lastUpdated } = useDataMode();
  const [controls, setControls] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchControls = useCallback(async () => {
    try {
      setLoading(true);
      const res = await controlApi.list(params);
      setControls(res.data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch security controls');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetchControls();
  }, [fetchControls, lastUpdated]);

  return { controls, loading, error, refetch: fetchControls };
}

export function useEvidence() {
  const { lastUpdated } = useDataMode();
  const [sources, setSources] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvidence = useCallback(async () => {
    try {
      setLoading(true);
      const [srcRes, recRes] = await Promise.all([
        evidenceApi.getSources(),
        evidenceApi.getRecords({ limit: 50 }),
      ]);
      setSources(srcRes.data);
      setRecords(recRes.data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch evidence telemetry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence, lastUpdated]);

  return { sources, records, loading, error, refetch: fetchEvidence };
}

export function useScenarios() {
  const { lastUpdated } = useDataMode();
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScenarios = useCallback(async () => {
    try {
      setLoading(true);
      const res = await scenarioApi.list();
      setScenarios(res.data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch scenarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios, lastUpdated]);

  return { scenarios, loading, error, refetch: fetchScenarios };
}

export function useInvestments(params?: any) {
  const { lastUpdated } = useDataMode();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvestments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await investmentApi.list(params);
      setInvestments(res.data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch investment catalog');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments, lastUpdated]);

  return { investments, loading, error, refetch: fetchInvestments };
}

export function useAIInsights() {
  const { lastUpdated } = useDataMode();
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      const res = await aiApi.getInsights();
      setInsights(res.data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch AI insights');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights, lastUpdated]);

  return { insights, loading, error, refetch: fetchInsights };
}

export function useLiveUpdates(onEvent?: (event: any) => void) {
  useEffect(() => {
    const unsub = socketService.subscribe('*', (event: any) => {
      if (onEvent) onEvent(event);
    });
    return () => unsub();
  }, [onEvent]);
}
