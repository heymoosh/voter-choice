import { motion } from 'motion/react';
import { 
  Search, 
  Navigation, 
  ShieldCheck, 
  Clock, 
  Accessibility, 
  CalendarPlus, 
  Map as MapIcon, 
  Bookmark,
  BookmarkPlus,
  ArrowRight
} from 'lucide-react';

export default function PollingPlacePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 pt-12 pb-32 w-full">
      {/* Hero Search Section */}
      <section className="mb-10">
        <h2 className="text-4xl font-black tracking-tighter text-primary mb-6 leading-none">Find Your Precinct.</h2>
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 ml-1">Enter Zip Code or Address</label>
            <div className="flex gap-2">
              <div className="flex-grow relative">
                <input 
                  className="w-full bg-surface-highest border-0 border-b-2 border-outline-variant/20 focus:border-primary focus:ring-0 text-lg font-bold py-3 px-4 transition-colors" 
                  placeholder="90210" 
                  type="text"
                />
                <Navigation size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
              </div>
              <button className="bg-primary text-white px-6 py-3 font-bold uppercase text-xs tracking-widest hover:opacity-90 active:scale-95 transition-all flex items-center gap-2">
                <Search size={16} />
                Search
              </button>
            </div>
          </div>
          <div className="p-4 bg-surface-low flex items-start gap-3">
            <ShieldCheck className="text-primary shrink-0" size={20} />
            <p className="text-xs leading-relaxed text-on-surface-variant font-medium">
              Zero tracking. Your location is used only to find your nearest precinct and is never stored.
            </p>
          </div>
        </div>
      </section>

      {/* Primary Recommendation */}
      <section className="mb-10">
        <div className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-4 flex justify-between items-center">
          <span>Primary Recommendation</span>
          <span className="text-tertiary flex items-center gap-1">
            <Clock size={12} /> Live Wait Times
          </span>
        </div>
        
        <div className="bg-white border border-outline-variant/20 overflow-hidden shadow-sm">
          {/* Map Placeholder */}
          <div className="h-48 w-full bg-surface-highest relative overflow-hidden">
            <img 
              className="w-full h-full object-cover opacity-80 grayscale" 
              src="https://picsum.photos/seed/map/800/400" 
              alt="Map"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            <div className="absolute bottom-4 left-4 bg-primary text-white px-3 py-1 text-[10px] font-black uppercase tracking-tighter">
              0.8 miles away
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 bg-primary rounded-full border-4 border-white shadow-lg animate-pulse"></div>
            </div>
          </div>

          {/* Info Body */}
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-2xl font-black text-on-surface leading-tight">Central Library</h3>
                  <button className="text-outline hover:text-primary transition-colors">
                    <Bookmark size={20} />
                  </button>
                </div>
                <p className="text-on-surface-variant text-sm font-medium">801 K St NW, Washington, DC 20001</p>
                <div className="flex items-center gap-1.5 mt-1 text-on-surface-variant/80 font-medium">
                  <Accessibility size={14} />
                  <span className="text-[11px] uppercase tracking-wide">ADA Accessible</span>
                </div>
              </div>
              <div className="text-right">
                <span className="block text-3xl font-black text-primary">10 min</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Est. Wait Time</span>
              </div>
            </div>

            {/* Detailed Schedule */}
            <div className="grid grid-cols-2 gap-4 mb-8 bg-surface-low p-4">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Election Day</span>
                <p className="text-xs font-black">Nov 5: 7AM — 8PM</p>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Early Voting</span>
                <p className="text-xs font-black">Oct 28—Nov 3: 8AM — 6PM</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button className="w-full py-4 bg-primary text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                <CalendarPlus size={18} />
                Add to Calendar (Incl. Address & Hours)
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button className="py-3 bg-surface-high text-on-surface font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-surface-highest transition-colors">
                  <Navigation size={18} />
                  Directions
                </button>
                <button className="py-3 bg-surface-high text-on-surface font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-surface-highest transition-colors">
                  <BookmarkPlus size={18} />
                  Save Location
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Alternative Locations */}
      <section className="space-y-6">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/20 pb-2">Alternative Locations</h4>
        
        {[
          { name: 'Community Center West', address: '1435 P St NW, Washington, DC', dist: '1.4 miles', wait: '45 min', traffic: 'Heavy Traffic', color: 'text-tertiary' },
          { name: "St. Jude's Parish Hall", address: '1720 17th St NW, Washington, DC', dist: '2.1 miles', wait: '15 min', traffic: 'Moderate', color: 'text-on-surface' }
        ].map((loc, i) => (
          <motion.div 
            key={i}
            whileHover={{ x: 4 }}
            className="p-6 bg-surface-low hover:bg-white transition-all group border-l-4 border-transparent hover:border-primary shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h5 className="text-lg font-black group-hover:text-primary transition-colors">{loc.name}</h5>
                <p className="text-sm text-on-surface-variant">{loc.address}</p>
                <div className="flex items-center gap-1 text-on-surface-variant/80 font-medium">
                  <Accessibility size={13} />
                  <span className="text-[10px] uppercase tracking-wide">ADA Accessible</span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-tighter">{loc.dist}</span>
                  <span className="text-[10px] font-black bg-surface-high text-on-surface-variant px-2 py-0.5 rounded-full uppercase tracking-tighter">7AM—8PM</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`block text-xl font-black ${loc.color}`}>{loc.wait}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">{loc.traffic}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Footer Info */}
      <footer className="mt-16 mb-8 text-center px-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 leading-relaxed">
          Poll data updated every 5 minutes. <br/> Powered by Civic Archive API.
        </p>
      </footer>
    </div>
  );
}
