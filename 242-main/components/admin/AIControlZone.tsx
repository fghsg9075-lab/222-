import React, { useState, useEffect } from 'react';
import { AIOperatingSystem } from '../../services/ai/AIOperatingSystem';
import { AIProviderConfig } from '../../services/ai/types';
import { Save, Plus, Trash2, Zap, AlertTriangle, Server } from 'lucide-react';

export const AIControlZone: React.FC = () => {
    const [providers, setProviders] = useState<AIProviderConfig[]>([]);
    const [mapping, setMapping] = useState<any>({});
    const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
    const [testPrompt, setTestPrompt] = useState('');
    const [testResult, setTestResult] = useState('');
    const [isTesting, setIsTesting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        const os = AIOperatingSystem.getInstance();
        setProviders(os.getProviders().map(p => p.config));
        setMapping(os.getConfig().canonicalMapping);
    };

    const saveChanges = () => {
        const os = AIOperatingSystem.getInstance();
        providers.forEach(p => os.updateProviderConfig(p));
        os.updateCanonicalMapping(mapping);
        alert("AI Configuration Saved!");
        loadData();
    };

    const handleAddKey = (providerId: string) => {
        const key = prompt("Enter new API Key:");
        if (!key) return;
        const newProviders = [...providers];
        const p = newProviders.find(x => x.id === providerId);
        if (p) {
            p.apiKeys.push({ key, isActive: true, usageCount: 0, errorCount: 0 });
            setProviders(newProviders);
        }
    };

    const handleToggleProvider = (id: string) => {
        const newProviders = providers.map(p =>
            p.id === id ? { ...p, enabled: !p.enabled } : p
        );
        setProviders(newProviders);
    };

    const runTest = async (providerId: string) => {
        setIsTesting(true);
        setTestResult('Running...');
        try {
            const os = AIOperatingSystem.getInstance();
            // Force save temp config for test if needed, but currently we use OS state.
            // OS state is updated via UI state only on Save.
            // So we might need to push current UI state to OS temporarily or just warn user to save first.
            // For now, let's assume user saved.

            const res = await os.execute({
                type: 'TEXT',
                prompt: testPrompt || 'Hello, world!',
                modelPreference: providerId
            });
            setTestResult(`SUCCESS (${res.modelUsed}):\n${res.text}`);
        } catch (e: any) {
            setTestResult(`FAILED:\n${e.message}`);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="space-y-8 pb-20 animate-in fade-in">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Zap className="text-amber-500 fill-amber-500" /> AI Operating System
                    </h2>
                    <p className="text-slate-500 mt-1">Manage AI Providers, Models, and Routing Logic.</p>
                </div>
                <button onClick={saveChanges} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 flex items-center gap-2">
                    <Save size={20} /> Save Config
                </button>
            </div>

            {/* Canonical Mapping (The Brain) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['NOTES_ENGINE', 'MCQ_ENGINE', 'CHAT_ENGINE'].map(engine => (
                    <div key={engine} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Server size={100} />
                        </div>
                        <h4 className="font-bold text-slate-700 uppercase text-xs mb-2 tracking-wider">{engine.replace('_', ' ')}</h4>
                        <div className="flex flex-col gap-2 relative z-10">
                            <select
                                value={mapping[engine]?.providerId}
                                onChange={e => setMapping({ ...mapping, [engine]: { ...mapping[engine], providerId: e.target.value } })}
                                className="p-2 border rounded-lg font-bold text-sm bg-slate-50"
                            >
                                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <select
                                value={mapping[engine]?.modelId}
                                onChange={e => setMapping({ ...mapping, [engine]: { ...mapping[engine], modelId: e.target.value } })}
                                className="p-2 border rounded-lg text-xs"
                            >
                                {providers.find(p => p.id === mapping[engine]?.providerId)?.models.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                ))}
            </div>

            {/* Providers List */}
            <div className="space-y-4">
                <h3 className="font-bold text-xl text-slate-800 ml-2">Active Providers</h3>
                {providers.map(p => (
                    <div key={p.id} className={`bg-white rounded-2xl border transition-all ${!p.enabled ? 'opacity-75 grayscale' : 'border-slate-200 shadow-sm'}`}>
                        <div className="p-6 flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${p.enabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {p.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-slate-800">{p.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${p.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {p.enabled ? 'Online' : 'Disabled'}
                                        </span>
                                        <span className="text-xs text-slate-400">{p.models.length} Models • {p.apiKeys.length} Keys</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setActiveProviderId(activeProviderId === p.id ? null : p.id)} className="px-4 py-2 border rounded-lg text-sm font-bold hover:bg-slate-50">
                                    {activeProviderId === p.id ? 'Close' : 'Configure'}
                                </button>
                                <div className={`w-14 h-8 rounded-full cursor-pointer relative transition-colors ${p.enabled ? 'bg-green-500' : 'bg-slate-300'}`} onClick={() => handleToggleProvider(p.id)}>
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${p.enabled ? 'left-7' : 'left-1'}`} />
                                </div>
                            </div>
                        </div>

                        {/* Expanded Config */}
                        {activeProviderId === p.id && (
                            <div className="border-t bg-slate-50 p-6 rounded-b-2xl space-y-6 animate-in slide-in-from-top-2">
                                {/* API Keys */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h5 className="font-bold text-slate-700 text-sm uppercase">API Key Rotation</h5>
                                        <button onClick={() => handleAddKey(p.id)} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-indigo-700">
                                            <Plus size={14} /> Add Key
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {p.apiKeys.map((k, idx) => (
                                            <div key={idx} className={`bg-white p-3 rounded-xl border flex flex-col justify-between ${k.isExhausted ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-mono text-xs font-bold text-slate-600">...{k.key.slice(-6)}</span>
                                                    <button onClick={() => {
                                                        const newProviders = [...providers];
                                                        const provider = newProviders.find(x => x.id === p.id);
                                                        if(provider) {
                                                            provider.apiKeys.splice(idx, 1);
                                                            setProviders(newProviders);
                                                        }
                                                    }} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold">
                                                    <span className={`px-1.5 py-0.5 rounded ${k.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {k.isActive ? 'ACTIVE' : 'INACTIVE'}
                                                    </span>
                                                    <span className="text-slate-400">{k.usageCount} Calls</span>
                                                    {k.isExhausted && <AlertTriangle size={12} className="text-red-500" />}
                                                </div>
                                            </div>
                                        ))}
                                        {p.apiKeys.length === 0 && <div className="text-center p-4 text-slate-400 text-xs italic border-2 border-dashed rounded-xl">No keys added.</div>}
                                    </div>
                                </div>

                                {/* Testing */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <h5 className="font-bold text-slate-700 text-sm uppercase mb-2">Test Connectivity</h5>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={testPrompt}
                                            onChange={e => setTestPrompt(e.target.value)}
                                            placeholder="Enter prompt..."
                                            className="flex-1 p-2 border rounded-lg text-sm"
                                        />
                                        <button onClick={() => runTest(p.id)} disabled={isTesting} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-slate-900 disabled:opacity-50">
                                            {isTesting ? 'Running...' : 'Test'}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 italic">Note: Save configuration before testing if you just added keys.</p>
                                    {testResult && (
                                        <div className="mt-2 p-2 bg-slate-100 rounded text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                                            {testResult}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
