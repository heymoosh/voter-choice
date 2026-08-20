import { motion } from 'motion/react';
import { ChevronDown, ExternalLink, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DeadlinesPage() {
  const deadlines = [
    {
      date: 'April 02',
      title: 'Voter Registration Deadline',
      tag: 'Strict Deadline',
      status: 'past',
      content: 'Texas law requires voters to be registered at least 30 days before an election. This is the last day to postmark or deliver your application.'
    },
    {
      date: 'April 20',
      title: 'Early Voting Begins',
      tag: 'Period Starts',
      status: 'active',
      content: 'Avoid Election Day crowds. Registered voters may cast ballots at any designated early voting site in their county.'
    },
    {
      date: 'April 25',
      title: 'Mail Ballot Application Deadline',
      tag: 'Action Required',
      status: 'upcoming',
      content: "Applications must be received by the clerk's office by close of business. Eligibility includes age 65+, disability, or county absence."
    },
    {
      date: 'April 28',
      title: 'Early Voting Ends',
      tag: null,
      status: 'upcoming',
      content: 'Last day to vote early. Polls typically stay open until 7:00 PM. No voting occurs between this date and Election Day.'
    }
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 pt-12 pb-32 w-full">
      {/* Hero Section */}
      <div className="mb-20 text-center md:text-left">
        <div className="inline-block bg-tertiary/10 text-tertiary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">
          Official Voter Guide
        </div>
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-on-surface leading-[0.95] mb-8">
          The May 2nd <br/><span className="text-primary italic">Election Roadmap.</span>
        </h2>
        <p className="text-base md:text-lg text-on-surface-variant max-w-xl leading-relaxed">
          Essential dates for the upcoming municipal and school board elections. Tap any date for detailed requirements and instructions.
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-outline-variant/40"></div>
        
        <div className="space-y-4">
          {deadlines.map((item, index) => (
            <motion.details 
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative pl-12"
            >
              <summary className="cursor-pointer list-none flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-white border border-outline-variant/30 hover:border-primary/50 transition-all shadow-sm">
                <div className="absolute left-[-24px] top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 bg-background">
                  <div className={`w-3 h-3 ${item.status === 'active' ? 'bg-primary' : 'bg-outline'} rounded-none`}></div>
                </div>
                <div className="flex flex-col">
                  <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${item.status === 'active' ? 'text-primary' : 'text-outline'}`}>
                    {item.date}
                  </span>
                  <h3 className="text-lg font-bold text-on-surface">{item.title}</h3>
                </div>
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  {item.tag && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${item.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-surface-high text-outline'}`}>
                      {item.tag}
                    </span>
                  )}
                  <ChevronDown size={18} className="text-outline group-open:rotate-180 transition-transform duration-300" />
                </div>
              </summary>
              <div className="mt-px p-6 bg-white border-x border-b border-outline-variant/30 text-on-surface-variant leading-relaxed animate-in fade-in slide-in-from-top-1 duration-300">
                {item.content}
                {item.title.includes('Registration') && (
                  <a className="inline-flex items-center gap-1 text-primary font-bold mt-4 text-sm underline decoration-2 underline-offset-4" href="#">
                    Check status <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </motion.details>
          ))}

          {/* Election Day Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative pl-12 pt-8"
          >
            <div className="absolute left-[10px] top-12 flex items-center justify-center w-5 h-5 bg-primary rotate-45 z-10"></div>
            <div className="bg-primary p-8 text-white shadow-2xl overflow-hidden relative group">
              {/* Background Icon */}
              <CheckCircle2 size={192} className="absolute -right-8 -bottom-8 opacity-10 rotate-12 pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-baseline gap-2 mb-6">
                  <span className="text-6xl font-black tracking-tighter">May 02</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 bg-white/20">Election Day</span>
                </div>
                <h3 className="text-2xl font-bold mb-6">Polls Open 7am – 7pm</h3>
                <p className="text-lg leading-relaxed mb-8 opacity-90 max-w-lg">
                  The culmination of the local civic process. Ensure you have your Photo ID ready and know your precinct polling place.
                </p>
                <Link to="/polling" className="inline-flex items-center gap-3 px-6 py-3 bg-white text-primary font-bold uppercase tracking-widest text-sm hover:bg-surface-low transition-colors">
                  <MapPin size={18} />
                  Find Your POLLING PLACE
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Resources */}
      <section className="mt-24 pt-16 border-t border-outline-variant/20">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-outline mb-12 text-center">Quick Access Resources</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a className="flex items-center gap-4 p-5 bg-white border border-outline-variant/20 hover:border-primary transition-all" href="#">
            <CheckCircle2 size={24} className="text-primary" />
            <span className="font-bold text-sm uppercase tracking-wide">Voter ID Guide</span>
          </a>
          <a className="flex items-center gap-4 p-5 bg-white border border-outline-variant/20 hover:border-primary transition-all" href="#">
            <Calendar size={24} className="text-primary" />
            <span className="font-bold text-sm uppercase tracking-wide">Sample Ballot</span>
          </a>
          <a className="flex items-center gap-4 p-5 bg-white border border-outline-variant/20 hover:border-primary transition-all" href="#">
            <MapPin size={24} className="text-primary" />
            <span className="font-bold text-sm uppercase tracking-wide">Polling Map</span>
          </a>
        </div>
      </section>
    </div>
  );
}
