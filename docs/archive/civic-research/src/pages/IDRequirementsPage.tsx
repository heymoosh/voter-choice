import { motion } from 'motion/react';
import { 
  AlertTriangle, 
  CreditCard, 
  Vote, 
  Contact, 
  Award, 
  Landmark, 
  ScrollText, 
  Plane,
  Gavel,
  CheckCircle2,
  Download
} from 'lucide-react';

export default function IDRequirementsPage() {
  const ids = [
    { title: 'TX Driver License', icon: CreditCard, desc: 'Issued by the Texas Department of Public Safety (DPS).' },
    { title: 'Election Identification Certificate', icon: Vote, desc: 'Issued by DPS for voting purposes only.' },
    { title: 'Personal ID card', icon: Contact, desc: 'Personal identification card issued by DPS.' },
    { title: 'Handgun License', icon: Award, desc: 'Texas Handgun License issued by DPS.' },
    { title: 'US Military ID', icon: Landmark, desc: 'United States Military Identification Card containing a photograph.' },
    { title: 'Citizenship Certificate', icon: ScrollText, desc: 'United States Citizenship Certificate containing a photograph.' },
    { title: 'US Passport', icon: Plane, desc: 'United States Passport book or card.', fullWidth: true },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 pt-12 pb-32 w-full">
      {/* Editorial Header */}
      <section className="mb-16 border-l-8 border-primary pl-8">
        <span className="text-tertiary font-bold tracking-widest text-xs uppercase mb-2 block">State of Texas Election Laws</span>
        <h2 className="text-6xl md:text-8xl font-black text-on-surface tracking-tighter leading-none mb-6">ID Requirements</h2>
        <p className="text-xl text-on-surface-variant max-w-2xl font-medium leading-relaxed">
          To vote in person in Texas, you must present an acceptable form of photo identification or follow specific procedures if you do not possess one.
        </p>
      </section>

      {/* Warning Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-tertiary/10 text-tertiary p-6 mb-16 flex items-start gap-4 border-l-4 border-tertiary"
      >
        <AlertTriangle className="shrink-0 mt-1" />
        <div>
          <h3 className="font-black tracking-tight text-lg mb-1 uppercase">Critical Expiration Rule</h3>
          <p className="text-base leading-relaxed">
            IDs can be expired up to 4 years. For voters aged 70 or older, an acceptable photo ID may be expired for any length of time if it is otherwise valid.
          </p>
        </div>
      </motion.div>

      {/* Accepted IDs Grid */}
      <section className="mb-24">
        <div className="flex items-baseline justify-between mb-8">
          <h3 className="text-3xl font-black text-on-surface tracking-tight uppercase">Accepted Photo IDs</h3>
          <span className="h-px flex-grow mx-6 bg-outline-variant opacity-20"></span>
          <span className="text-primary font-bold text-sm">7 APPROVED FORMS</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-outline-variant/20 border border-outline-variant/20 overflow-hidden">
          {ids.map((id, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white p-8 hover:bg-surface transition-colors group ${id.fullWidth ? 'md:col-span-2 flex items-start gap-6' : ''}`}
            >
              <id.icon size={32} className="text-primary mb-4 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="font-bold text-xl mb-2 text-on-surface">{id.title}</h4>
                <p className="text-on-surface-variant text-sm leading-relaxed">{id.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* No ID Section */}
      <section className="mb-24 bg-surface-low p-10 relative overflow-hidden">
        <Gavel size={120} className="absolute top-0 right-0 p-4 opacity-5 rotate-12 pointer-events-none" />
        <div className="relative z-10">
          <h3 className="text-4xl font-black text-on-surface tracking-tighter mb-4">No ID? No Problem</h3>
          <p className="text-lg text-on-surface-variant mb-10 max-w-xl leading-relaxed">
            If a voter does not possess one of the seven acceptable forms of photo ID and cannot reasonably obtain one, they may still vote by signing a <span className="font-bold text-primary">Reasonable Impediment Declaration</span> and providing a supporting document.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <h5 className="text-xs font-black uppercase tracking-widest text-primary mb-4">Supporting Documents</h5>
              <ul className="space-y-3">
                {['Certified Birth Certificate', 'Current Utility Bill', 'Bank Statement', 'Government Check'].map((doc, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 size={16} className="text-primary" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-black uppercase tracking-widest text-primary mb-4 md:block hidden">&nbsp;</h5>
              <ul className="space-y-3">
                {['Paycheck', 'Voter Registration Certificate', 'Other Govt. Document with Name'].map((doc, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 size={16} className="text-primary" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="mt-12">
            <button className="bg-primary text-white px-8 py-4 font-bold tracking-tight hover:opacity-90 transition-opacity flex items-center gap-2">
              <Download size={18} />
              DOWNLOAD DECLARATION FORM (PDF)
            </button>
          </div>
        </div>
      </section>

      {/* Footer Note */}
      <footer className="py-12 border-t border-outline-variant/20 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-on-surface-variant font-medium text-sm italic">Non-partisan educational resource.</p>
        <div className="flex gap-8">
          <span className="text-xs font-bold uppercase tracking-widest opacity-40">Privacy Policy</span>
          <span className="text-xs font-bold uppercase tracking-widest opacity-40">Contact Support</span>
          <span className="text-xs font-bold uppercase tracking-widest opacity-40">Official Portal</span>
        </div>
      </footer>
    </div>
  );
}
