import { motion } from 'motion/react';
import { 
  Printer, 
  Download, 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  FileText, 
  CheckCircle2,
  Share2,
  Vote
} from 'lucide-react';

export default function ResearchPortfolioPage() {
  return (
    <div className="px-4 py-8 md:px-12 lg:px-20 bg-background min-h-screen w-full">
      <div className="max-w-xl mx-auto space-y-12">
        {/* Page Header */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">Verified Research</span>
            <span className="text-outline text-[10px] uppercase tracking-widest font-bold">November 2024 Election</span>
          </div>
          <h1 className="text-5xl font-black text-on-surface tracking-tighter leading-none">Your Research Portfolio</h1>
          <p className="text-lg text-on-surface-variant leading-relaxed">
            Review your curated selections. These materials are prepared for your personal reference when you head to the polls.
          </p>
        </header>

        {/* Primary Actions */}
        <div className="flex flex-col gap-4">
          <button className="w-full bg-primary text-white flex items-center justify-between p-6 group active:scale-[0.98] transition-all rounded-sm shadow-sm">
            <div className="text-left">
              <span className="block text-[10px] uppercase tracking-[0.2em] font-bold mb-1 opacity-80">Primary Action</span>
              <span className="text-2xl font-black">Print My Ballot</span>
            </div>
            <Printer size={32} />
          </button>

          <div className="w-full bg-surface-low border border-outline-variant/30 p-6 relative overflow-hidden flex flex-col gap-6">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <span className="bg-tertiary text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest">Verified</span>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 bg-white p-3 shadow-sm border border-outline-variant/20">
                  <FileText size={32} className="text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Encrypted Data Manifest</span>
                  <h3 className="text-lg font-black text-on-surface mb-0.5 break-all">voter_profile_nov_5_2024.txt</h3>
                  <p className="text-xs font-mono text-on-surface-variant opacity-70">12.4 KB • TXT Format</p>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed w-full">
                Download this file to your device. You can upload it next election to skip the basic research and pick up right where you left off.
              </p>
            </div>
            <div className="space-y-4">
              <button className="w-full py-4 bg-primary text-white font-black text-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                <Download size={20} />
                Download Profile (.txt)
              </button>
              <div className="flex items-start gap-3 pt-2 border-t border-outline-variant/20">
                <ShieldCheck size={18} className="text-primary shrink-0" fill="currentColor" />
                <p className="text-[11px] leading-relaxed text-on-surface-variant">
                  <span className="font-black text-on-surface uppercase tracking-wider">Privacy Protocol:</span> This file is generated locally on your device. We never receive, store, or transmit your personal data to any external server.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Polling Location */}
        <div className="space-y-8">
          <div className="flex items-baseline justify-between border-b border-outline-variant/30 pb-4">
            <h3 className="text-2xl font-black tracking-tight uppercase">Your Voting Destination</h3>
          </div>
          <div className="bg-surface-low p-6 rounded-sm space-y-6 border border-outline-variant/20">
            <div className="space-y-4">
              <h3 className="text-2xl font-black">Central Library Community Hall</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin size={20} className="text-primary shrink-0" />
                  <div>
                    <p className="font-bold">201 W Washington St.</p>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Metro District, Suite 100</p>
                  </div>
                </div>
                <div className="flex items-center justify-between group cursor-pointer hover:bg-surface-high/50 p-2 -ml-2 rounded transition-colors">
                  <div className="flex items-start gap-3">
                    <Calendar size={20} className="text-primary shrink-0" />
                    <div>
                      <p className="font-bold">7:00 AM — 8:00 PM</p>
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Tuesday, November 5th</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-48 bg-surface-highest relative overflow-hidden rounded-sm border border-outline-variant/30">
              <img 
                alt="Map" 
                className="w-full h-full object-cover grayscale opacity-80" 
                src="https://picsum.photos/seed/map2/800/400"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 bg-primary rounded-full border-4 border-white shadow-lg"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Candidates */}
        <div className="space-y-8">
          <div className="flex items-baseline justify-between border-b border-outline-variant/30 pb-4">
            <h3 className="text-2xl font-black tracking-tight uppercase">Selected Candidates</h3>
            <span className="text-outline text-[10px] font-bold uppercase tracking-widest">3 Selections</span>
          </div>
          <div className="flex flex-col gap-10">
            {[
              { role: 'Presidential', name: 'Elena Vance', party: 'Independent Civic Party', quote: 'Infrastructure reform focused on metropolitan transit and digital privacy rights.', img: 'https://picsum.photos/seed/elena/400/400', color: 'border-primary' },
              { role: 'State Senate', name: 'Marcus Thorne', party: 'Liberty & Union', quote: 'Proponent of educational tax credits and local small business grants.', img: 'https://picsum.photos/seed/marcus/400/400', color: 'border-outline-variant' }
            ].map((cand, i) => (
              <div key={i} className={`bg-white border-l-4 ${cand.color} p-6 space-y-6 shadow-sm`}>
                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-tertiary mb-2 block">{cand.role}</span>
                  <h4 className="text-3xl font-black leading-tight mb-1">{cand.name}</h4>
                  <p className="text-[10px] text-outline uppercase font-bold tracking-wider">{cand.party}</p>
                </div>
                <div className="space-y-4">
                  <p className="text-sm italic text-on-surface-variant leading-relaxed">"{cand.quote}"</p>
                  <div className="aspect-square bg-surface-highest overflow-hidden rounded-sm">
                    <img 
                      alt={cand.name} 
                      className="w-full h-full object-cover grayscale brightness-90 contrast-110" 
                      src={cand.img}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ballot Measures */}
        <div className="space-y-8">
          <div className="flex items-baseline justify-between border-b border-outline-variant/30 pb-4">
            <h3 className="text-2xl font-black tracking-tight uppercase">Ballot Measures</h3>
            <span className="text-outline text-[10px] font-bold uppercase tracking-widest">2 Decisions</span>
          </div>
          <div className="flex flex-col gap-6">
            <div className="bg-surface-low p-6 rounded-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xl font-black mb-1">Proposition 104</h4>
                  <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Public Safety Funding</p>
                </div>
                <span className="bg-primary text-white px-4 py-1 text-[10px] font-black uppercase">Yes</span>
              </div>
              <p className="text-on-surface-variant text-sm leading-relaxed">Allocates 0.5% of county sales tax to modernize emergency response infrastructure and paramedic training centers.</p>
            </div>
            <div className="bg-surface-low p-6 rounded-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xl font-black mb-1">Measure B</h4>
                  <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Municipal Zoning Reform</p>
                </div>
                <span className="bg-on-surface-variant text-white px-4 py-1 text-[10px] font-black uppercase">No</span>
              </div>
              <p className="text-on-surface-variant text-sm leading-relaxed">Proposed changes to residential height limits in historic corridors. You selected 'No' based on preservation impact assessments.</p>
            </div>
          </div>
        </div>

        {/* Footer Content */}
        <div className="pt-12 pb-24 border-t-2 border-on-surface space-y-8">
          <div className="bg-surface-high/50 p-6 border-l-4 border-primary">
            <h5 className="text-[10px] font-black uppercase mb-2">Civic Integrity Notice</h5>
            <p className="text-[10px] text-on-surface-variant leading-relaxed">This research profile is for personal use and is not an official ballot. Ensure your registration is active before Election Day.</p>
          </div>
          
          <div className="flex flex-col gap-4">
            <button className="flex items-center gap-3 font-bold text-primary active:opacity-60 py-2">
              <Share2 size={18} />
              <span>Share Research Template</span>
            </button>
            <div className="w-full bg-white border border-outline-variant/30 p-8 rounded-sm space-y-6 shadow-sm">
              <div className="flex items-center gap-6">
                <div className="bg-surface-low p-5 rounded-xl flex items-center justify-center border border-outline-variant/10">
                  <Vote size={32} className="text-primary" />
                </div>
                <h2 className="text-3xl font-black text-on-surface tracking-tighter uppercase">Ready to Vote?</h2>
              </div>
              <p className="text-lg text-on-surface-variant leading-relaxed">
                Print your 1-page ballot summary now. Remember, most Texas polling locations do not allow phones.
              </p>
              <button className="w-full bg-primary text-white py-6 flex items-center justify-center gap-3 shadow-md hover:opacity-90 active:scale-[0.98] transition-all">
                <Printer size={24} />
                <span className="text-2xl font-black uppercase tracking-tight">Print My Ballot</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
