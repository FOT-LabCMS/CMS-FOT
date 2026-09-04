import { Sparkles } from "lucide-react";
import appConfig from "../../config/appConfig";

const Footer = () => {
  return (
    <footer className="w-full border-t border-[rgba(214,170,94,0.34)] bg-[var(--color-primary-dark)] text-[var(--color-text-inverse)]">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          
          <div className="max-w-2xl">
            <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-[rgba(214,170,94,0.45)] bg-[rgba(246,244,236,0.08)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
              <Sparkles size={14} />
              {appConfig.appName}
            </span>
            <h2 className="text-base font-extrabold leading-tight sm:text-lg">
              Faculty Laboratory Chemical Management System
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--color-primary-tint)] sm:text-sm">
              Supporting safer chemical management, organized storage, and clear laboratory stock visibility for the Department of Biosystem Technology, Faculty of Technology, University of Ruhuna.            </p>
          </div>

          {/* Updated Developer Section */}
          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            <a
              href="https://cms-fot-developer-static-page.vercel.app/"
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-2.5 rounded-lg border border-[rgba(214,170,94,0.2)] bg-[rgba(246,244,236,0.03)] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-inverse)] transition-all duration-300 hover:border-[var(--color-accent-light)]/60 hover:bg-[rgba(246,244,236,0.08)] hover:text-[var(--color-accent-light)]"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent-light)] opacity-60"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-accent-light)]"></span>
              </span>
              Developed By
            </a>
            <div className="flex items-center gap-3 px-1">
              <p className="cursor-default text-[12px] font-medium tracking-wide text-[var(--color-primary-tint)] transition-colors duration-300 hover:text-[var(--color-text-inverse)]">
                Hasala Perera
              </p>
              
              {/* Styled Text Pipe */}
              <span className="select-none text-[11px] font-light text-[var(--color-accent-light)] opacity-40"> 
                | 
              </span>
              
              <p className="cursor-default text-[12px] font-medium tracking-wide text-[var(--color-primary-tint)] transition-colors duration-300 hover:text-[var(--color-text-inverse)]">
                Sadeepa Dinakara
              </p>
            </div>
          </div>

        </div>

        <div className="mt-4 flex flex-col gap-1 border-t border-[rgba(246,244,236,0.12)] pt-3 text-[11px] text-[var(--color-primary-tint)] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {appConfig.appName} · Faculty Laboratory Chemical Management System</p>
          <a href="https://www.tec.ruh.ac.lk/departments/biosystems-technology" target="_blank" className="hover:text-[var(--color-accent-light)] color-transition"><p>Department of Biosystem Technology</p></a>
          <a href="https://www.tec.ruh.ac.lk/" target="_blank" className="hover:text-[var(--color-accent-light)] color-transition"><p>Faculty Of Technology</p></a>
          <a href="https://ruh.ac.lk/" target="_blank" className="hover:text-[var(--color-accent-light)] color-transition"><p>University of Ruhuna</p></a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;