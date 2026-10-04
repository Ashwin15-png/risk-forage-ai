import React, { useState, useEffect } from 'react';
import { 
  Database, RefreshCw, Upload, CheckCircle2, AlertTriangle, 
  ExternalLink, Shield, Server, Cpu, FileText, ArrowRight, X, 
  CloudLightning, Layers, Check, Search, Download
} from 'lucide-react';
import { sourcesApi } from '../services/api';
import { DataModeBadge } from '../components/DataModeBadge';
import { useDataMode } from '../context/DataModeContext';

export const DataSources: React.FC = () => {
  const { dataMode, lastUpdated } = useDataMode();
  const [statusData, setStatusData] = useState<any>(null);
  const [softwareList, setSoftwareList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Sync state
  const [syncingSource, setSyncingSource] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'asset' | 'software'>('asset');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, swRes] = await Promise.all([
        sourcesApi.getStatus(),
        sourcesApi.getSoftware({ limit: 50 })
      ]);
      setStatusData(statusRes.data);
      setSoftwareList(swRes.data);
    } catch (e) {
      console.error('Failed to load data sources status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [lastUpdated]);

  const handleSyncNvd = async () => {
    setSyncingSource('nvd');
    setSyncMessage(null);
    try {
      const res = await sourcesApi.syncNvd();
      setSyncMessage(`✓ NIST NVD synchronized: ${res.data.synced_count} CVEs enriched with CVSS v3.1 & CPE criteria.`);
      fetchData();
    } catch (e) {
      setSyncMessage('Failed to synchronize NIST NVD API.');
    } finally {
      setSyncingSource(null);
    }
  };

  const handleSyncKev = async () => {
    setSyncingSource('cisa_kev');
    setSyncMessage(null);
    try {
      const res = await sourcesApi.syncKev();
      setSyncMessage(`✓ CISA KEV catalog synchronized: ${res.data.total_catalog_records} records fetched (${res.data.matched_in_environment} matched in environment).`);
      fetchData();
    } catch (e) {
      setSyncMessage('Failed to synchronize CISA KEV catalog.');
    } finally {
      setSyncingSource(null);
    }
  };

  const handleSyncEpss = async () => {
    setSyncingSource('epss');
    setSyncMessage(null);
    try {
      const res = await sourcesApi.syncEpss();
      setSyncMessage(`✓ FIRST EPSS synchronized: Updated ${res.data.updated_records} CVE predictive exploitation probabilities.`);
      fetchData();
    } catch (e) {
      setSyncMessage('Failed to synchronize FIRST EPSS API.');
    } finally {
      setSyncingSource(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadLoading(true);
    setUploadResult(null);

    try {
      if (uploadType === 'asset') {
        if (uploadFile) {
          const fd = new FormData();
          fd.append('file', uploadFile);
          const res = await sourcesApi.uploadAssets(fd);
          setUploadResult(res.data);
        } else if (jsonText.trim()) {
          const parsed = JSON.parse(jsonText.trim());
          const res = await sourcesApi.uploadAssetsJson(Array.isArray(parsed) ? parsed : [parsed]);
          setUploadResult(res.data);
        }
      } else {
        if (uploadFile) {
          const fd = new FormData();
          fd.append('file', uploadFile);
          const res = await sourcesApi.uploadSoftware(fd);
          setUploadResult(res.data);
        } else if (jsonText.trim()) {
          const parsed = JSON.parse(jsonText.trim());
          const res = await sourcesApi.uploadSoftwareJson(Array.isArray(parsed) ? parsed : [parsed]);
          setUploadResult(res.data);
        }
      }
      fetchData();
    } catch (err: any) {
      setUploadResult({
        success: false,
        error: err.response?.data?.detail || err.message || 'Upload processing error'
      });
    } finally {
      setUploadLoading(false);
    }
  };

  const sampleAssetCsv = `hostname,ip,exposure,criticality,business_service,owner,data_classification
pay-api-gw-02,104.22.45.15,Internet-Facing,Critical,Payment Gateway,Infrastructure Operations,Restricted
core-auth-node-01,10.150.4.55,Internal,High,Core Banking Ledger (CBS),Security Team,Restricted
retail-frontend-03,104.18.23.95,Internet-Facing,High,Customer Internet Banking,Web Team,Confidential`;

  const sampleSoftwareCsv = `hostname,vendor,product,version,package_type
pay-api-gw-01,nginx,nginx,1.24.0,deb
pay-api-gw-01,openssl,openssl,3.0.2,deb
pay-auth-srv-01,apache,http_server,2.4.52,rpm
cbs-app-primary,oracle,exadata,19.3.0,binary`;

  const filteredSources = statusData?.sources?.filter((s: any) => {
    if (activeCategory === 'ALL') return true;
    return s.category === activeCategory;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[rgba(74,222,128,0.12)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-[#4ADE80]" />
              CYBER THREAT & ASSET DATA SOURCES
            </h1>
            <DataModeBadge mode={dataMode} />
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Public Vulnerability Intelligence • Authorized CMDB Ingestion • Continuous CVE Correlation
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setIsUploadOpen(true);
              setUploadResult(null);
              setUploadFile(null);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-[#0D1B12] border border-[rgba(74,222,128,0.3)] hover:border-[#22C55E] text-slate-200 hover:text-white text-xs flex items-center gap-1.5 transition-all font-mono"
          >
            <Upload className="w-4 h-4 text-[#4ADE80]" />
            Upload Inventory
          </button>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] text-slate-400 hover:text-[#4ADE80] transition-all"
            title="Refresh All Data Sources"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sync Alert Banner */}
      {syncMessage && (
        <div className="p-3.5 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 text-xs text-[#4ADE80] font-mono flex items-center justify-between animate-fadeIn">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#22C55E]" />
            {syncMessage}
          </span>
          <button onClick={() => setSyncMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-[rgba(74,222,128,0.15)] text-xs overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'All Pipelines (6)' },
          { id: 'PUBLIC INTELLIGENCE', label: 'Public Threat Intelligence (3)' },
          { id: 'LIVE DATA', label: 'Live Authorized Data (2)' },
          { id: 'SYNTHETIC BUSINESS ASSUMPTIONS', label: 'Business Assumptions (1)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={`pb-2 px-3 font-mono font-medium whitespace-nowrap transition-all ${
              activeCategory === tab.id
                ? 'text-[#4ADE80] border-b-2 border-[#22C55E] font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pipeline Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 py-20 text-center font-mono text-xs text-slate-400">
            <div className="inline-block w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin mb-4" />
            <div>Verifying telemetry pipeline connections...</div>
          </div>
        ) : (
          filteredSources.map((source: any) => (
            <div
              key={source.id}
              className="rounded-xl p-5 bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] flex flex-col justify-between space-y-4 hover:border-[#22C55E]/40 transition-all shadow-lg relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102417] text-[#4ADE80] border border-[rgba(74,222,128,0.2)]">
                      {source.category}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1.5 flex items-center gap-1.5">
                      {source.name}
                    </h3>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1.5 border font-bold ${
                    source.status === 'CONNECTED'
                      ? 'bg-[#22C55E]/10 text-[#4ADE80] border-[#22C55E]/30'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${source.status === 'CONNECTED' ? 'bg-[#22C55E] animate-pulse' : 'bg-rose-500'}`} />
                    {source.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {source.description}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-[#102417] border border-[rgba(74,222,128,0.12)] text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Total Records</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">
                      {source.records_count?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Freshness SLA</span>
                    <span className="text-sm font-bold text-[#4ADE80] mt-0.5 block">
                      {source.freshness_pct}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Last Sync</span>
                    <span className="text-xs text-slate-300 mt-0.5 block truncate">
                      {source.last_sync}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Ingestion Errors</span>
                    <span className="text-xs text-slate-300 mt-0.5 block">
                      {source.errors_count}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-[rgba(74,222,128,0.1)] flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500 truncate max-w-[150px]">
                  {source.endpoint}
                </span>

                {source.id === 'nvd' && (
                  <button
                    onClick={handleSyncNvd}
                    disabled={syncingSource === 'nvd'}
                    className="px-3 py-1 rounded bg-[#102417] hover:bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]/30 font-mono text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    {syncingSource === 'nvd' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Sync NVD
                  </button>
                )}

                {source.id === 'cisa_kev' && (
                  <button
                    onClick={handleSyncKev}
                    disabled={syncingSource === 'cisa_kev'}
                    className="px-3 py-1 rounded bg-[#102417] hover:bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]/30 font-mono text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    {syncingSource === 'cisa_kev' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Sync KEV
                  </button>
                )}

                {source.id === 'epss' && (
                  <button
                    onClick={handleSyncEpss}
                    disabled={syncingSource === 'epss'}
                    className="px-3 py-1 rounded bg-[#102417] hover:bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]/30 font-mono text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    {syncingSource === 'epss' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Sync EPSS
                  </button>
                )}

                {source.id === 'asset_inventory' && (
                  <button
                    onClick={() => {
                      setUploadType('asset');
                      setIsUploadOpen(true);
                      setUploadResult(null);
                    }}
                    className="px-3 py-1 rounded bg-[#102417] hover:bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]/30 font-mono text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload CSV
                  </button>
                )}

                {source.id === 'software_inventory' && (
                  <button
                    onClick={() => {
                      setUploadType('software');
                      setIsUploadOpen(true);
                      setUploadResult(null);
                    }}
                    className="px-3 py-1 rounded bg-[#102417] hover:bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]/30 font-mono text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Packages
                  </button>
                )}

                {source.id === 'manual_evidence' && (
                  <a
                    href="/evidence"
                    className="px-3 py-1 rounded bg-[#102417] hover:bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]/30 font-mono text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    Evidence Center
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Software Inventory & CVE Correlation Table */}
      <div className="rounded-xl overflow-hidden bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] shadow-xl space-y-3 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#4ADE80]" />
              Software Inventory & CPE/CVE Correlation Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Authorized host packages, derived CPE 2.3 identifiers, and automated vulnerability correlations
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#102417] text-[#4ADE80] border border-[rgba(74,222,128,0.2)] self-start sm:self-auto">
            {softwareList.length} monitored packages
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#102417] text-slate-400 border-b border-[rgba(74,222,128,0.15)] font-mono">
                <th className="py-2.5 px-3 font-semibold">Asset Target</th>
                <th className="py-2.5 px-3 font-semibold">Vendor / Product</th>
                <th className="py-2.5 px-3 font-semibold">Version</th>
                <th className="py-2.5 px-3 font-semibold">Derived CPE 2.3</th>
                <th className="py-2.5 px-3 font-semibold">Correlation Status</th>
                <th className="py-2.5 px-3 font-semibold">Matched CVEs</th>
                <th className="py-2.5 px-3 font-semibold text-right">Scanned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(74,222,128,0.1)] font-mono text-[11px]">
              {softwareList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                    No software inventory items ingested yet. Click "Upload Packages" to ingest.
                  </td>
                </tr>
              ) : (
                softwareList.map((sw) => (
                  <tr key={sw.id} className="hover:bg-[#102417] transition-colors">
                    <td className="py-2.5 px-3 font-medium text-white">{sw.asset_name}</td>
                    <td className="py-2.5 px-3 text-[#4ADE80]">{sw.vendor} / {sw.product}</td>
                    <td className="py-2.5 px-3 text-slate-300">{sw.version}</td>
                    <td className="py-2.5 px-3 text-slate-400 text-[10px] truncate max-w-xs">{sw.cpe_uri}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        sw.correlation_status === 'CORRELATED'
                          ? 'bg-[#22C55E]/10 text-[#4ADE80] border-[#22C55E]/30'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}>
                        {sw.correlation_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      {sw.matched_cves_count > 0 ? (
                        <span className="text-rose-400">{sw.matched_cves_count} CVEs</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">{sw.last_scanned}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inventory Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="rounded-xl p-6 bg-[#0D1B12] border border-[rgba(74,222,128,0.4)] max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[rgba(74,222,128,0.2)] pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#4ADE80]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Authorized Inventory Ingestion Pipeline
                </h3>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#102417]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type Switcher */}
            <div className="flex rounded-lg bg-[#06110B] p-1 border border-[rgba(74,222,128,0.15)] text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  setUploadType('asset');
                  setUploadResult(null);
                }}
                className={`flex-1 py-1.5 rounded transition-all ${
                  uploadType === 'asset' ? 'bg-[#22C55E] text-[#06110B] font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Asset Inventory (CMDB)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadType('software');
                  setUploadResult(null);
                }}
                className={`flex-1 py-1.5 rounded transition-all ${
                  uploadType === 'software' ? 'bg-[#22C55E] text-[#06110B] font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Installed Software & Packages
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* File Upload input */}
              <div className="space-y-1">
                <label className="block text-slate-300 font-mono">Upload CSV or JSON File:</label>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="w-full p-2 bg-[#102417] border border-[rgba(74,222,128,0.2)] rounded-lg text-slate-300 font-mono text-xs"
                />
              </div>

              {/* Or JSON Text area */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-mono">Or Paste JSON Dataset:</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (uploadType === 'asset') {
                        setJsonText(JSON.stringify([
                          {
                            hostname: "pay-gw-edge-03",
                            ip: "104.22.45.99",
                            exposure: "Internet-Facing",
                            criticality: "Critical",
                            business_service: "Payment Gateway",
                            owner: "Infrastructure Team"
                          }
                        ], null, 2));
                      } else {
                        setJsonText(JSON.stringify([
                          {
                            hostname: "pay-api-gw-01",
                            vendor: "openssl",
                            product: "openssl",
                            version: "3.0.2",
                            package_type: "deb"
                          }
                        ], null, 2));
                      }
                    }}
                    className="text-[10px] font-mono text-[#4ADE80] hover:underline"
                  >
                    Insert Example
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder={`[ { "hostname": "..." } ]`}
                  className="w-full p-2 bg-[#102417] border border-[rgba(74,222,128,0.2)] rounded-lg text-slate-200 font-mono text-xs"
                />
              </div>

              {/* Sample Template Callout */}
              <div className="p-3 rounded-lg bg-[#06110B] border border-[rgba(74,222,128,0.15)] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Expected CSV Format:</span>
                <pre className="text-[10px] font-mono text-[#4ADE80] overflow-x-auto whitespace-pre">
                  {uploadType === 'asset' ? sampleAssetCsv : sampleSoftwareCsv}
                </pre>
              </div>

              {/* Result Callout */}
              {uploadResult && (
                <div className={`p-3 rounded-lg border font-mono text-xs ${
                  uploadResult.success !== false
                    ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#4ADE80]'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  {uploadResult.success !== false ? (
                    <div>
                      ✓ Ingestion complete! Created: {uploadResult.created_count ?? uploadResult.total_software_items}, Updated: {uploadResult.updated_count ?? 0}.
                    </div>
                  ) : (
                    <div>✕ Error: {uploadResult.error}</div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#102417] text-slate-300 hover:text-white font-mono text-xs"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading || (!uploadFile && !jsonText.trim())}
                  className="px-5 py-2 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-[#06110B] font-bold font-mono text-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploadLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Ingest & Correlate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
