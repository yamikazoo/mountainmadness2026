import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import {
  Calendar,
  Upload,
  Users,
  TrendingUp,
  Play,
  Plus,
  FileText,
  ChevronRight,
  Wallet,
  ArrowUpRight,
  Trophy,
  Volume2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { predictEventCosts, parseFinancialDocument, generateBriefingText, FinancialEvent } from '../services/geminiService';

// --- Components ---

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string, key?: React.Key }) => (
  <div className={`bg-white rounded-3xl p-6 shadow-sm border border-black/5 ${className}`}>
    {children}
  </div>
);

const Stat = ({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) => (
  <div className="flex items-center gap-4">
    <div className={`p-3 rounded-2xl ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className="text-xs font-medium text-black/40 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'docs' | 'social'>('calendar');
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBriefing, setIsBriefing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [socialData, setSocialData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchEvents();
    fetchSocial();
  }, []);

  const fetchEvents = async () => {
    const res = await fetch('/api/events');
    const data = await res.json();
    setEvents(data);
  };

  const fetchSocial = async () => {
    const res = await fetch('/api/social');
    const data = await res.json();
    setSocialData(data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const parsedEvents = await parseFinancialDocument(base64, file.type);

        // Save to DB
        for (const event of parsedEvents) {
          await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
          });
        }
        fetchEvents();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBriefing = async () => {
    if (isBriefing) return;
    setIsBriefing(true);
    try {
      const text = await generateBriefingText(events.slice(0, 3));
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        const audio = new Audio(url);
        audio.play();
        audio.onended = () => setIsBriefing(false);
      } else {
        alert("ElevenLabs API key missing or invalid. Check .env");
        setIsBriefing(false);
      }
    } catch (err) {
      console.error(err);
      setIsBriefing(false);
    }
  };

  const totalUpcoming = events.reduce((sum, e) => sum + e.estimated_cost, 0);

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    events.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.estimated_cost;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [events]);

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="min-h-screen max-w-md mx-auto bg-[#F9F9F7] pb-24 relative overflow-hidden">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-serif italic font-bold tracking-tight">FinSync</h1>
          <p className="text-black/40 font-medium text-sm mt-1">Your Temporal Wealth Agent</p>
        </div>
        <button
          onClick={handleBriefing}
          disabled={isBriefing}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg transition-all active:scale-95 ${isBriefing ? 'bg-emerald-500 animate-pulse' : 'bg-black text-white hover:bg-black/90'}`}
        >
          {isBriefing ? <Volume2 className="text-white" size={18} /> : <Play className="text-white fill-white" size={18} />}
          <span className="text-sm font-bold tracking-wide">{isBriefing ? "Playing..." : "Daily Report"}</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="px-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="bg-white text-black border-black/10">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-black/5 rounded-xl">
                  <Wallet size={18} className="text-black" />
                </div>
                <h3 className="font-bold text-sm tracking-widest uppercase text-black/80">Quick Stats</h3>
              </div>
              <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg mt-1">ON TRACK</span>
            </div>

            <div className="relative z-10 w-full flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <p className="text-black/60 text-xs font-medium uppercase tracking-widest">Upcoming Outflow (30d)</p>
                <h2 className="text-4xl font-bold mt-1">${totalUpcoming.toLocaleString()}</h2>
                <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold">
                  <ArrowUpRight size={14} />
                  <span>Predicted from {events.length} events</span>
                </div>
              </div>

              {events.length > 0 && (
                <div className="h-32 w-32 mt-6 sm:mt-0 sm:ml-6 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        innerRadius={36}
                        outerRadius={48}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', color: '#fff', fontSize: '10px', padding: '4px 8px' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        formatter={(value: number) => `$${value.toLocaleString()}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-black/5 p-1 rounded-2xl">
          {(['calendar', 'docs', 'social'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === tab ? 'bg-white shadow-sm text-black' : 'text-black/40'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'calendar' && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Financial Time-Machine</h3>
                <button className="p-2 bg-black/5 rounded-full text-black/40">
                  <Plus size={20} />
                </button>
              </div>
              {events.map((event, idx) => (
                <Card key={idx} className="flex items-center justify-between group hover:border-black/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${event.source === 'calendar' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                      {event.source === 'calendar' ? <Calendar size={20} /> : <FileText size={20} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{event.title}</h4>
                      <p className="text-xs text-black/40 font-medium"> {new Date((event as any).start_time ?? event.date).toLocaleDateString('en-US', {month: 'short',day: 'numeric',})} • {event.category}
</p>                 </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">-${event.estimated_cost}</p>
                    <p className="text-[10px] font-bold text-black/20 uppercase tracking-tighter">ESTIMATED</p>
                  </div>
                </Card>
              ))}
            </motion.div>
          )}

          {activeTab === 'docs' && (
            <motion.div
              key="docs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center py-8 border-2 border-dashed border-black/10 rounded-3xl bg-black/[0.02]">
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4">
                  {loading ? <Loader2 className="animate-spin text-black" /> : <Upload className="text-black" />}
                </div>
                <h3 className="font-bold">Paper-to-Plan</h3>
                <p className="text-xs text-black/40 mt-1 px-12">Upload leases, bills, or receipts. Gemini will extract the dates and costs.</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="image/*,application/pdf"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-6 px-6 py-3 bg-black text-white text-xs font-bold rounded-2xl uppercase tracking-widest active:scale-95 transition-transform"
                >
                  Select Document
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-black/40 uppercase tracking-widest">Recent Extractions</h4>
                <Card className="flex items-center gap-4 opacity-50">
                  <div className="w-10 h-10 bg-black/5 rounded-xl flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">utility_bill_feb.pdf</p>
                    <p className="text-[10px] font-medium text-black/40">Processed 2h ago</p>
                  </div>
                  <ChevronRight size={16} className="text-black/20" />
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'social' && (
            <motion.div
              key="social"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Savings Circles</h3>
                {socialData?.circles.map((circle: any) => (
                  <Card key={circle.id} className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                          <Users size={20} />
                        </div>
                        <h4 className="font-bold">{circle.name}</h4>
                      </div>
                      <p className="text-xs font-bold text-emerald-600">${circle.current_savings} / ${circle.goal_amount}</p>
                    </div>
                    <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(circle.current_savings / circle.goal_amount) * 100}%` }}
                      />
                    </div>
                  </Card>
                ))}

                <div className="flex gap-4 pt-2">
                  <button className="flex-1 bg-black text-white py-4 rounded-2xl text-sm font-bold active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <Plus size={18} /> Create Circle
                  </button>
                  <button className="flex-1 bg-white border border-black/10 py-4 rounded-2xl text-sm font-bold active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <Users size={18} /> Join Circle
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold">Leaderboard</h3>
                <div className="space-y-3">
                  {socialData?.leaderboard.map((user: any, idx: number) => {
                    const goalAmount = socialData?.circles?.[0]?.goal_amount || 5000;
                    const savePercent = Math.min((user.savings_score / goalAmount) * 100, 100);

                    return (
                      <div key={user.id} className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 relative overflow-hidden group hover:border-black/20 transition-all">
                        {/* Progress Background */}
                        <div className="absolute top-0 left-0 h-full bg-emerald-500/10 transition-all duration-500" style={{ width: `${savePercent}%` }} />

                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className={`text-sm font-bold w-4 ${idx === 0 ? 'text-amber-500' : 'text-black/30'}`}>{idx + 1}</span>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-black/5 text-black/60'}`}>
                              {user.user_name[0]}
                            </div>
                            <div>
                              <p className="font-bold">{user.user_name}</p>
                              {idx === 0 && <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md uppercase tracking-wider">Leader</span>}
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Saved</span>
                              <span className="font-bold text-emerald-600">${user.savings_score.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">Predicted Spend</span>
                              <span className="text-xs font-bold text-black/60">${user.predicted_spending.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!socialData?.leaderboard.length && (
                    <Card className="p-8 text-center text-black/40 text-xs font-medium">
                      Join a circle to see the leaderboard
                    </Card>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav (Mobile Style) */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-xl border-t border-black/5 px-8 py-4 flex justify-between items-center z-50">
        <button className="p-2 text-black"><Calendar size={24} /></button>
        <button className="p-2 text-black/20"><TrendingUp size={24} /></button>
        <div className="relative -top-8">
          <button
            onClick={() => setActiveTab('docs')}
            className="w-14 h-14 bg-black rounded-full shadow-xl flex items-center justify-center text-white active:scale-90 transition-transform"
          >
            <Plus size={28} />
          </button>
        </div>
        <button className="p-2 text-black/20"><Users size={24} /></button>
        <button className="p-2 text-black/20"><FileText size={24} /></button>
      </nav>
    </div>
  );
}
