import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Calendar, 
  BadgeCheck, 
  MapPin, 
  FileText, 
  HelpCircle, 
  Menu, 
  User,
  Search,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  const navItems = [
    { name: 'Dates', path: '/deadlines', icon: Calendar },
    { name: 'ID Rules', path: '/id-rules', icon: BadgeCheck },
    { name: 'Polling', path: '/polling', icon: MapPin },
    { name: 'Ballot', path: '/portfolio', icon: FileText },
    { name: 'Research', path: '/chat', icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-outline-variant/20 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-2xl font-black text-primary tracking-tighter uppercase">
            Civic Research
          </Link>
          {!isLanding && (
            <nav className="hidden md:flex gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "text-sm font-bold uppercase tracking-wider transition-colors py-1",
                    location.pathname === item.path 
                      ? "text-primary border-b-2 border-primary" 
                      : "text-on-surface-variant hover:text-primary"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-on-surface-variant hover:bg-surface-low rounded-full transition-colors">
            <HelpCircle size={20} />
          </button>
          {!isLanding && (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              ML
            </div>
          )}
          <button className="md:hidden p-2 text-on-surface-variant">
            <Menu size={20} />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar for desktop (non-landing) */}
        {!isLanding && (
          <aside className="hidden md:flex flex-col w-64 border-r border-outline-variant/20 bg-surface-low p-6 shrink-0 sticky top-16 h-[calc(100vh-4rem)]">
            <div className="mb-8 px-2">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-1">Election Guide</h2>
              <p className="text-[10px] text-on-surface-variant opacity-70">LOCAL CIVIC UTILITY</p>
            </div>
            <nav className="flex flex-col gap-1 flex-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center justify-between py-3 px-3 transition-all group rounded-sm",
                    location.pathname === item.path
                      ? "text-primary bg-white shadow-sm border-l-2 border-primary font-bold"
                      : "text-on-surface-variant hover:text-primary hover:bg-surface-high font-medium"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={18} fill={location.pathname === item.path ? "currentColor" : "none"} />
                    <span className="text-sm uppercase tracking-wider">{item.name}</span>
                  </div>
                </Link>
              ))}
            </nav>
            <div className="mt-auto pt-4 border-t border-outline-variant/20">
              <button className="w-full bg-primary text-white py-3 px-4 font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
                Check Registration
              </button>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav (non-landing) */}
      {!isLanding && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-outline-variant/20 flex justify-around py-3 px-2 z-50">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 transition-colors",
                location.pathname === item.path ? "text-primary" : "text-outline"
              )}
            >
              <item.icon size={20} fill={location.pathname === item.path ? "currentColor" : "none"} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.name}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
