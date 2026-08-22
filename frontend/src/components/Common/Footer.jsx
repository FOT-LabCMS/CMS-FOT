import React from "react";
import { Sparkles, GitBranch } from "lucide-react";

const DEVELOPER_PROFILES = [
  {
    name: "Hasala Perera",
    href: "https://github.com/Hasalapera",
  },
  {
    name: "Sadeepa Dinakara",
    href: "https://github.com/Sadeepa-D",
  },
];

const Footer = () => {
  return (
    <footer className="w-full border-t border-[rgba(214,170,94,0.34)] bg-[var(--color-primary-dark)] text-[var(--color-text-inverse)]">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-[rgba(214,170,94,0.45)] bg-[rgba(246,244,236,0.08)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
              <Sparkles size={14} />
              FOTCMS
            </span>
            <h2 className="text-base font-extrabold leading-tight sm:text-lg">
              Faculty Laboratory Chemical Management System
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--color-primary-tint)] sm:text-sm">
              Built to support safer chemical visibility, organised storage, and clear laboratory stock access for the Department Of Biosystem Technology, Faculty of Technology, University of Ruhuna.
            </p>
          </div>

          <div className="shrink-0">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent-light)] lg:text-right">
              Developed By
            </p>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {DEVELOPER_PROFILES.map((developer) => (
                <a
                  key={developer.name}
                  href={developer.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[rgba(214,170,94,0.42)] bg-[rgba(246,244,236,0.07)] px-3.5 text-xs font-bold text-[var(--color-text-inverse)] color-transition hover:border-[var(--color-accent-light)] hover:bg-[var(--color-accent)] hover:text-[var(--color-primary-dark)]"
                >
                  <GitBranch size={14} />
                  {developer.name}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1 border-t border-[rgba(246,244,236,0.12)] pt-3 text-[11px] text-[var(--color-primary-tint)] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 FOTCMS · Faculty Laboratory Chemical Management System</p>
          <a href="https://www.tec.ruh.ac.lk/departments/biosystems-technology" target="_blank" className="hover:text-[var(--color-accent-light)] color-transition"><p>Department of Biosystem Technology</p></a>
          <a href="https://www.tec.ruh.ac.lk/" target="_blank" className="hover:text-[var(--color-accent-light)] color-transition"><p>Faculty Of Technology</p></a>
          <a href="https://ruh.ac.lk/" target="_blank" className="hover:text-[var(--color-accent-light)] color-transition"><p>University of Ruhuna</p></a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;