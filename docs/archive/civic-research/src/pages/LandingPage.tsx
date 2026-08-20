import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Shield, UserX, Lock, UploadCloud, ArrowRight, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function LandingPage() {
  const [zipCode, setZipCode] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  const handleZipSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (zipCode.length === 5) {
      navigate('/chat');
    }
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="px-6 pt-16 pb-20 max-w-4xl mx-auto w-full">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tighter text-on-surface mb-6"
        >
          Your Ballot, Your Research, Your Privacy.
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl text-on-surface-variant mb-10 leading-relaxed max-w-2xl"
        >
          The Modern Archivist's approach to democracy. Unbiased data, locally curated, and strictly anonymous. No accounts, no cookies, just the facts.
        </motion.p>

        {/* ZIP Code Input */}
        <motion.form 
          onSubmit={handleZipSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-2 border-b-2 border-primary flex items-end gap-2 shadow-sm mb-8 max-w-xl"
        >
          <div className="flex-grow">
            <label className="block text-xs font-bold uppercase tracking-widest text-primary mb-1 px-1">Enter Zip Code</label>
            <input 
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              className="w-full bg-transparent border-none focus:ring-0 text-2xl font-bold p-1 placeholder:text-surface-highest" 
              placeholder="10001" 
              type="text"
            />
          </div>
          <button 
            type="submit"
            disabled={zipCode.length !== 5}
            className="bg-primary text-white px-6 py-4 font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            View Ballot
          </button>
        </motion.form>

        {/* Trust Signals */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-6 text-[13px] font-medium text-on-surface-variant"
        >
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-primary" />
            No data stored.
          </div>
          <div className="flex items-center gap-2">
            <UserX size={16} className="text-primary" />
            No accounts.
          </div>
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-primary" />
            100% private.
          </div>
        </motion.div>
      </section>

      {/* Returning User Section */}
      <section className="bg-surface-low py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            <span className="inline-block px-4 py-1 bg-secondary/10 text-secondary rounded-full text-[10px] font-bold uppercase tracking-widest">Efficiency</span>
            <h2 className="text-3xl font-bold text-on-surface leading-tight">Returning User? Jumpstart your Personalized Ballot.</h2>
            <p className="text-base text-on-surface-variant">
              If you have a Voter Profile from a previous session, upload below to get a quick start on your ballot.
            </p>
            <p className="text-sm text-on-surface-variant leading-relaxed opacity-80">
              Note: We do NOT store any data. Our unique encryption protocol allows you to save progress locally. When you return, simply reload your file.
            </p>
            
            <div className="bg-white p-8 border-l-4 border-tertiary mt-8 shadow-sm">
              <h3 className="text-xl font-bold text-on-surface mb-4">Upload Your Voter Profile</h3>
              <p className="text-on-surface-variant mb-6 text-sm leading-relaxed">
                Drag and drop your encrypted <span className="font-mono font-bold text-primary">.CIVIC</span> file here.
              </p>
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); alert('File upload simulation: In a real app, this would decrypt your profile locally.'); }}
                className={cn(
                  "border-2 border-dashed p-8 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group rounded-lg",
                  isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-outline-variant hover:border-primary hover:bg-primary/5"
                )}
              >
                <UploadCloud size={40} className={cn("transition-colors", isDragging ? "text-primary" : "text-outline group-hover:text-primary")} />
                <div className="text-center">
                  <span className="block text-xs font-bold uppercase tracking-widest text-on-surface group-hover:text-primary transition-colors">Select File</span>
                  <span className="text-[10px] text-outline">or drag and drop here</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="px-6 py-12 max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-high p-8 flex flex-col justify-between min-h-[200px]">
          <div>
            <h3 className="text-xl font-bold mb-3">Polling Places</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">Real-time data on wait times and locations for the 2024 Election cycle.</p>
          </div>
          <Link to="/polling" className="text-primary text-sm font-bold flex items-center gap-2 group mt-6">
            Locate Now <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="bg-primary p-8 text-white min-h-[200px] flex flex-col justify-between">
          <Calendar size={32} className="mb-4" />
          <div>
            <h3 className="text-xl font-bold mb-2">Election Dates</h3>
            <p className="opacity-80 text-xs leading-relaxed">Check registration deadlines, early voting schedules, and key dates.</p>
          </div>
          <Link to="/deadlines" className="text-white text-sm font-bold flex items-center gap-2 group mt-6">
            View Roadmap <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="bg-white p-8 border border-outline-variant/30 flex flex-col justify-between min-h-[200px]">
          <div>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-widest text-primary">ID Rules</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">Detailed breakdown of state-specific requirements. Don't be surprised at the door.</p>
          </div>
          <Link to="/id-rules" className="text-primary text-sm font-bold flex items-center gap-2 group mt-6">
            Learn More <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-high py-16 px-6 border-t border-outline-variant/20">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between gap-10">
          <div className="max-w-xs">
            <div className="text-xl font-black text-primary mb-4">Civic Research</div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              A non-partisan digital archive dedicated to civic clarity. Produced by Civic Research. © 2024.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                <li><a className="hover:text-primary transition-colors" href="#">Ballot Data</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">API Access</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">Source Code</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                <li><a className="hover:text-primary transition-colors" href="#">Privacy Policy</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">Terms of Use</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
