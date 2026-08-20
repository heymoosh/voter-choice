import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Paperclip, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  User,
  HelpCircle,
  Info,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function ChatPage() {
  const [isSelectionsOpen, setIsSelectionsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="flex-1 flex flex-col bg-background relative min-h-0">
      {/* Persistent Progress & Selections Tracker */}
      <div className="sticky top-0 z-40 bg-background border-b border-outline-variant/10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Progress: 25%</span>
              <div className="h-1.5 w-32 bg-surface-high overflow-hidden rounded-full">
                <div className="h-full bg-primary w-[25%] transition-all"></div>
              </div>
            </div>
            <button 
              onClick={() => setIsSelectionsOpen(!isSelectionsOpen)}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
            >
              Selections (2) <ChevronDown size={12} className={cn("transition-transform", isSelectionsOpen && "rotate-180")} />
            </button>
          </div>
          
          <AnimatePresence>
            {isSelectionsOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 overflow-x-auto pb-2 pt-1 hide-scrollbar">
                  <div className="flex-shrink-0 px-3 py-1 bg-primary/5 border border-primary/20 rounded-full flex items-center gap-2">
                    <span className="text-[10px] font-bold text-primary">Mayor:</span>
                    <span className="text-[10px] font-bold">Thomas Miller</span>
                    <CheckCircle2 size={10} className="text-primary" fill="currentColor" />
                  </div>
                  <div className="flex-shrink-0 px-3 py-1 bg-primary/5 border border-primary/20 rounded-full flex items-center gap-2">
                    <span className="text-[10px] font-bold text-primary">Prop 104:</span>
                    <span className="text-[10px] font-bold">YES</span>
                    <CheckCircle2 size={10} className="text-primary" fill="currentColor" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {!isSelectionsOpen && (
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              <div className="flex-shrink-0 px-3 py-1 bg-primary/5 border border-primary/20 rounded-full flex items-center gap-2">
                <span className="text-[10px] font-bold text-primary">Mayor:</span>
                <span className="text-[10px] font-bold">Thomas Miller</span>
                <CheckCircle2 size={10} className="text-primary" fill="currentColor" />
              </div>
              <div className="flex-shrink-0 px-3 py-1 bg-primary/5 border border-primary/20 rounded-full flex items-center gap-2">
                <span className="text-[10px] font-bold text-primary">Prop 104:</span>
                <span className="text-[10px] font-bold">YES</span>
                <CheckCircle2 size={10} className="text-primary" fill="currentColor" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-12 pb-40">
        {/* AI Research Memo */}
        <article className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Info size={14} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">RESEARCH MEMO #0241 • BALLOT SELECTIONS</span>
          </div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-l-4 border-primary p-6 md:p-10 shadow-sm space-y-6"
          >
            <h1 className="text-3xl font-black text-on-surface tracking-tight leading-none">City Council: District 4 Overview</h1>
            <p className="text-sm md:text-lg text-on-surface-variant font-medium leading-relaxed">
              Based on your criteria for fiscal responsibility and urban transit focus, there are three candidates currently polling within the top margin for District 4. Each has provided official statements regarding the 2024 General Fund.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="bg-surface-low p-6 border-b-2 border-transparent hover:border-primary transition-all group cursor-pointer">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">Incumbent</span>
                <h3 className="text-xl font-extrabold text-on-surface">Sarah Jenkins</h3>
                <p className="text-sm text-on-surface-variant mt-3 leading-snug">Focus: Infrastructure maintenance and small business tax credits.</p>
                <div className="mt-6 flex items-center text-primary font-black text-[10px] uppercase tracking-widest gap-1 group-hover:translate-x-1 transition-transform">
                  View Full Ledger <ArrowRight size={12} />
                </div>
              </div>
              <div className="bg-surface-low p-6 border-b-2 border-transparent hover:border-tertiary transition-all group cursor-pointer">
                <span className="text-[10px] font-black uppercase tracking-widest text-tertiary mb-2 block">Challenger</span>
                <h3 className="text-xl font-extrabold text-on-surface">Marcus Thorne</h3>
                <p className="text-sm text-on-surface-variant mt-3 leading-snug">Focus: Public transit expansion and high-density zoning reform.</p>
                <div className="mt-6 flex items-center text-tertiary font-black text-[10px] uppercase tracking-widest gap-1 group-hover:translate-x-1 transition-transform">
                  Compare Stances <ArrowRight size={12} />
                </div>
              </div>
            </div>
            <div className="pt-8 border-t border-outline-variant/20 flex flex-col gap-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-outline">Verified Sources</h4>
              <div className="flex flex-wrap gap-2">
                {['[1] Municipal Archives 2023', '[2] Transit Authority Report', '[3] Board of Elections'].map((source, i) => (
                  <span key={i} className="px-3 py-1 bg-surface-low text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">{source}</span>
                ))}
              </div>
            </div>
          </motion.div>
        </article>

        {/* User Input Focus */}
        <article className="max-w-3xl mx-auto pt-4">
          <div className="flex gap-4 items-start">
            <div className="bg-primary p-2 text-white shrink-0">
              <User size={18} />
            </div>
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">CURRENT RESEARCH FOCUS</h2>
              <p className="text-2xl md:text-3xl font-bold text-on-surface leading-tight tracking-tight">
                Show me how Sarah Jenkins voted on the 2022 Highway Extension Bill compared to her recent campaign promises.
              </p>
            </div>
          </div>
        </article>

        {/* AI Typing State */}
        <article className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 py-6 px-4 bg-surface-low/30 border border-outline-variant/10">
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-primary animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-primary animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-primary animate-bounce [animation-delay:0.4s]"></div>
            </div>
            <span className="text-sm font-black italic text-primary uppercase tracking-widest">Cross-referencing legislative records from 2022...</span>
          </div>
        </article>
      </div>

      {/* Sticky Chat Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-background via-background/95 to-transparent z-50">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white border-2 border-primary/20 focus-within:border-primary transition-colors shadow-xl">
            <div className="p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={12} className="text-primary" />
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Deep Search Prompt</label>
              </div>
              <div className="flex items-end gap-4">
                <textarea 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-on-surface placeholder:text-outline/60 text-sm font-medium resize-none h-12 leading-relaxed" 
                  placeholder="Ask about candidate history, voting records, or ballot measures..."
                ></textarea>
                <button 
                  disabled={!inputValue.trim()}
                  className="bg-primary text-white p-3 hover:bg-primary-dark transition-colors active:scale-95 shrink-0 disabled:opacity-50 disabled:active:scale-100"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-center mt-4 text-outline font-bold uppercase tracking-wider opacity-60">
            Verified Non-Partisan Database • Educational Use Only
          </p>
        </div>
      </div>
    </div>
  );
}


