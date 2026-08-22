import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axiosInstance";
import PasswordReset from "../PasswordReset";
import {
  LayoutDashboard,
  FlaskConical,
  Activity,
  Warehouse,
  MapPin,
  FileText,
  Bell as BellIcon,
  ChartNoAxesCombined,
  Truck,
  Users,
  Settings,
  ClipboardList,
  Menu,
  X,
  ChevronRight,
  LogOut,
  ShieldCheck,
  Pencil,
} from "lucide-react";

const ROLE_LABELS = {
  ADMIN: "Admin",
  TECHNICAL_OFFICER: "Technical Officer",
  LECTURER: "Lecturer",
  STUDENT: "Student",
};

const MAIN_MENU_ITEMS = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "TECHNICAL_OFFICER", "LECTURER"],
  },
  {
    label: "Chemicals",
    icon: FlaskConical,
    pathPrefix: "/chemicals",
    roles: ["ADMIN", "TECHNICAL_OFFICER", "LECTURER"],
    children: [
      {
        label: "View All Chemicals",
        path: "/chemicals/list",
        roles: ["ADMIN", "TECHNICAL_OFFICER", "LECTURER"],
      },
      {
        label: "Add New Chemical",
        path: "/chemicals/add-chemical",
        roles: ["ADMIN", "TECHNICAL_OFFICER"],
      },
      {
        label: "Deactivated Chemicals",
        path: "/chemicals/deactivated",
        roles: ["ADMIN", "TECHNICAL_OFFICER"],
      },
    ],
  },
  {
    label: "Usage Status",
    icon: Activity,
    pathPrefix: "/usage",
    roles: ["ADMIN", "TECHNICAL_OFFICER", "LECTURER"],
    children: [
      {
        label: "Show Usage Batch Wise",
        path: "/usage/batchwise",
        roles: ["ADMIN", "TECHNICAL_OFFICER", "LECTURER"],
      },
      {
        label: "Show Usage Chemical Wise",
        path: "/usage/chemicalwise",
        roles: ["ADMIN", "TECHNICAL_OFFICER", "LECTURER"],
      },
    ],
  },
  {
    label: "Update Usage",
    icon: Pencil,
    pathPrefix: "/disposals",
    roles: ["ADMIN", "TECHNICAL_OFFICER"],
    children: [
      {
        label: "Chemical Requests",
        path: "/disposal/request",
        roles: ["ADMIN", "TECHNICAL_OFFICER"],
      },
      {
        label: "Return Chemicals",
        path: "/disposal/return",
        roles: ["ADMIN", "TECHNICAL_OFFICER"],
      },
    ],
  },
  {
    label: "Locations",
    icon: MapPin,
    pathPrefix: "/locations",
    roles: ["ADMIN", "TECHNICAL_OFFICER"],
    children: [
      {
        label: "View All Locations",
        path: "/locations",
        roles: ["ADMIN", "TECHNICAL_OFFICER"],
      },
      {
        label: "Add New Location",
        path: "/locations/add",
        roles: ["ADMIN", "TECHNICAL_OFFICER"],
      },
    ],
  },
  {
    label: "SDS Library",
    pathPrefix: "/sds",
    icon: FileText,
    roles: ["ADMIN", "TECHNICAL_OFFICER", "LECTURER"],
    children: [
      {
        label: "View SDS",
        path: "/sds/library",
        roles: ["ADMIN", "TECHNICAL_OFFICER", "LECTURER"],
      },
    ],
  },
  {
    label: "Procurement & Stock",
    icon: Truck,
    pathPrefix: "/stock",
    roles: ["ADMIN", "TECHNICAL_OFFICER"],
    children: [
      {
        label: "Add New Batch",
        path: "/stock/add",
        roles: ["ADMIN", "TECHNICAL_OFFICER"],
      },
      {
        label: "View All Batches",
        path: "/stock/batches",
        roles: ["ADMIN", "TECHNICAL_OFFICER", "LECTURER"],
      },
    ],
  },
  {
    label: "Alerts & Notifications",
    path: "/notifications",
    icon: BellIcon,
    roles: ["ADMIN", "TECHNICAL_OFFICER"],
  },
  {
    label: "Reports",
    icon: ChartNoAxesCombined,
    pathPrefix: "/reports",
    roles: ["ADMIN", "TECHNICAL_OFFICER"],
    children: [
      {
        label: "Chemical Status Report",
        path: "/reports/chemicalwise",
        roles: ["ADMIN", "TECHNICAL_OFFICER"],
      },
      {
        label: "Usage Report",
        path: "/reports/usage",
        roles: ["ADMIN", "TECHNICAL_OFFICER"],
      },
    ],
  },
];

const ADMIN_MENU_ITEMS = [
  {
    label: "Users & Roles",
    icon: Users,
    pathPrefix: "/admin/users",
    roles: ["ADMIN"],
    children: [
      {
        label: "View System Users",
        path: "/admin/users/view",
        roles: ["ADMIN"],
      },
      {
        label: "Add User",
        path: "/admin/users/add",
        roles: ["ADMIN"],
      },
    ],
  },
  {
    label: "Audit Logs",
    path: "/admin/audit-logs",
    icon: ClipboardList,
    roles: ["ADMIN", "TECHNICAL_OFFICER"],
  },
];

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "US";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const SidebarLink = ({ item, closeMobileMenu, notificationCount = 0 }) => {
  const Icon = item.icon;
  const showNotificationBadge =
    item.path === "/notifications" && notificationCount > 0;

  return (
    <NavLink
      to={item.path}
      onClick={closeMobileMenu}
      className={({ isActive }) =>
        [
          "group flex items-center gap-3 rounded-[var(--radius-sm)] px-3.5 py-3",
          "text-sm font-semibold color-transition",
          isActive
            ? "bg-[var(--color-primary-light)] text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)]"
            : "text-[var(--color-text-inverse)]/80 hover:bg-[var(--color-primary-light)] hover:text-[var(--color-text-inverse)]",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={[
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] color-transition",
              isActive
                ? "bg-[var(--color-primary-dark)] text-[var(--color-accent-light)]"
                : "bg-[var(--color-text-inverse)]/5 text-[var(--color-text-inverse)] group-hover:bg-[var(--color-primary-dark)] group-hover:text-[var(--color-accent-light)]",
            ].join(" ")}
          >
            <Icon size={18} strokeWidth={2} />
          </span>

          <span className="min-w-0 flex-1 truncate">{item.label}</span>

          {showNotificationBadge && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] px-1.5 text-[10px] font-bold text-[var(--color-primary-dark)]">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}

          {isActive && (
            <ChevronRight
              size={16}
              className="shrink-0 text-[var(--color-accent-light)]"
            />
          )}
        </>
      )}
    </NavLink>
  );
};

const CollapsibleSidebarLink = ({ item, closeMobileMenu, userRole }) => {
  const { pathname } = useLocation();
  const isParentActive = pathname.startsWith(item.pathPrefix);
  const [isOpen, setIsOpen] = useState(isParentActive);

  useEffect(() => {
    if (isParentActive) {
      setIsOpen(true);
    }
  }, [pathname, isParentActive]);

  const Icon = item.icon;

  const filteredChildren = useMemo(
    () => item.children.filter((child) => child.roles.includes(userRole)),
    [item.children, userRole],
  );

  if (filteredChildren.length === 0) {
    return null;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={[
          "group flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3.5 py-3",
          "text-sm font-semibold color-transition text-left",
          isParentActive
            ? "text-[var(--color-text-inverse)]"
            : "text-[var(--color-text-inverse)]/80 hover:bg-[var(--color-primary-light)] hover:text-[var(--color-text-inverse)]",
        ].join(" ")}
      >
        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] color-transition",
            isParentActive
              ? "bg-[var(--color-primary-dark)] text-[var(--color-accent-light)]"
              : "bg-[var(--color-text-inverse)]/5 text-[var(--color-text-inverse)] group-hover:bg-[var(--color-primary-dark)] group-hover:text-[var(--color-accent-light)]",
          ].join(" ")}
        >
          <Icon size={18} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <ChevronRight
          size={16}
          className={[
            "shrink-0 text-[var(--color-text-inverse)]/60 transition-transform",
            isOpen && "rotate-90",
          ].join(" ")}
        />
      </button>
      {isOpen && (
        <div className="mt-1.5 space-y-1.5 pl-8">
          {filteredChildren.map((child) => (
            <NavLink
              key={child.path}
              to={child.path}
              end
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                [
                  "group flex items-center gap-3 rounded-[var(--radius-sm)] px-3.5 py-2.5",
                  "text-sm font-medium color-transition",
                  isActive
                    ? "bg-[var(--color-primary-light)] text-[var(--color-text-inverse)]"
                    : "text-[var(--color-text-inverse)]/70 hover:bg-[var(--color-primary-light)]/50 hover:text-[var(--color-text-inverse)]",
                ].join(" ")
              }
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              <span className="min-w-0 flex-1 truncate">{child.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

const SidebarContent = ({
  user,
  mainItems,
  adminItems,
  closeMobileMenu,
  handleLogout,
  notificationCount,
  openPasswordReset,
}) => {
  const navigate = useNavigate();

  const userName = user?.fullName || "FOTCMS User";
  const userRole = user?.role || "STUDENT";
  const department = user?.department || "Department of Biosystem Technology";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Logo */}
      <div className="border-b border-[var(--color-text-inverse)]/10 px-5 py-5">
        <button
          type="button"
          onClick={() => {
            navigate("/dashboard");
            closeMobileMenu();
          }}
          className="flex w-full items-center gap-3 text-left"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-accent)] bg-[var(--color-primary-dark)] text-[var(--color-accent-light)] shadow-[var(--shadow-sm)]">
            <img
              src="/faculty_logo.png"
              alt="Faculty Logo"
              className="h-full w-full rounded-[var(--radius-md)] object-cover"
            />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold tracking-wide text-[var(--color-text-inverse)]">
              FOTCMS
            </h1>

            <p className="mt-0.5 text-[10px] leading-4 text-[var(--color-text-inverse)]/65">
              Faculty Laboratory
              <br />
              Chemical Management System
            </p>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div>
          <p className="mb-3 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent-light)]">
            Main Navigation
          </p>

          <nav className="space-y-1.5">
            {mainItems.map((item) =>
              item.children ? (
                <CollapsibleSidebarLink
                  key={item.label}
                  item={item}
                  closeMobileMenu={closeMobileMenu}
                  userRole={userRole}
                />
              ) : (
                <SidebarLink
                  key={item.path}
                  item={item}
                  closeMobileMenu={closeMobileMenu}
                  notificationCount={notificationCount}
                />
              ),
            )}
          </nav>
        </div>

        {adminItems.length > 0 && (
          <div className="mt-6 border-t border-[var(--color-text-inverse)]/10 pt-5">
            <p className="mb-3 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent-light)]">
              Administration
            </p>

            <nav className="space-y-1.5">
              {adminItems.map((item) =>
                item.children ? (
                  <CollapsibleSidebarLink
                    key={item.label}
                    item={item}
                    closeMobileMenu={closeMobileMenu}
                    userRole={userRole}
                  />
                ) : (
                  <SidebarLink
                    key={item.path}
                    item={item}
                    closeMobileMenu={closeMobileMenu}
                    notificationCount={notificationCount}
                  />
                ),
              )}
            </nav>
          </div>
        )}
      </div>

      {/* User panel */}
      <div className="border-t border-[var(--color-text-inverse)]/10 p-4">
        <div className="rounded-[var(--radius-md)] bg-[var(--color-text-inverse)]/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-sm font-extrabold text-[var(--color-text-inverse)]">
              {getInitials(userName)}
            </div>

            <div
              // type="button"
              // onClick={openPasswordReset}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-sm font-bold text-[var(--color-text-inverse)]">
                {userName}
              </p>

              <p className="mt-0.5 truncate text-xs text-[var(--color-text-inverse)]/60">
                {department}
              </p>

              <span className="mt-2 inline-flex rounded-full border border-[var(--color-accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent-light)]">
                {ROLE_LABELS[userRole] || userRole}
              </span>
            </div>
            
            <button
              type="button"
              onClick={openPasswordReset}
              aria-label="Open password reset"
              className="shrink-0 rounded-full p-1 text-[var(--color-accent-light)] transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-light)]"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-text-inverse)]/10 px-3 py-2.5 text-sm font-semibold text-[var(--color-text-inverse)]/80 color-transition hover:border-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-text-inverse)]"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const { data: countData } = useQuery({
    queryKey: ["notificationCount"],
    queryFn: () => api.get("/notifications/count"),
    select: (res) => res.data.count,
    enabled:
      !!user && (user.role === "ADMIN" || user.role === "TECHNICAL_OFFICER"),
    refetchInterval: 15000,
  });

  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role || "STUDENT";

  const mainItems = useMemo(
    () => MAIN_MENU_ITEMS.filter((item) => item.roles.includes(role)),
    [role],
  );

  const adminItems = useMemo(
    () => ADMIN_MENU_ITEMS.filter((item) => item.roles.includes(role)),
    [role],
  );

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  const openPasswordReset = () => {
    closeMobileMenu();
    setIsPasswordResetOpen(true);
  };

  const closePasswordReset = () => {
    setIsPasswordResetOpen(false);
  };

  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeMobileMenu();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    closeMobileMenu();
    navigate("/", { replace: true });
    logout();
  };

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 shadow-[var(--shadow-sm)] lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-primary)] color-transition hover:bg-[var(--color-primary-tint)]"
        >
          <Menu size={23} />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-[var(--color-accent-light)]">
            <FlaskConical size={20} />
          </div>

          <div>
            <p className="font-[var(--font-display)] text-base font-extrabold text-[var(--color-primary)]">
              FLCMS
            </p>
            <p className="text-[9px] text-[var(--color-text-muted)]">
              Chemical Management System
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/notifications")}
          className="relative flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-primary)] color-transition hover:bg-[var(--color-primary-tint)]"
          aria-label="Open notifications"
        >
          <BellIcon size={21} />
          {countData > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[9px] font-bold text-[var(--color-primary-dark)] ring-1 ring-[var(--color-surface)]">
              {countData > 9 ? "9+" : countData}
            </span>
          )}
        </button>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/10 bg-[var(--color-primary-dark)] shadow-[var(--shadow-lg)] lg:block">
        <SidebarContent
          user={user}
          mainItems={mainItems}
          adminItems={adminItems}
          closeMobileMenu={closeMobileMenu}
          handleLogout={handleLogout}
          notificationCount={countData || 0}
          openPasswordReset={openPasswordReset}
        />
      </aside>

      {/* Mobile overlay */}
      <div
        className={[
          "fixed inset-0 z-50 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={closeMobileMenu}
          className={[
            // Overlay
            "absolute inset-0 bg-[var(--color-primary-dark)]/75 backdrop-blur-[2px] transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className={[
            "absolute inset-y-0 left-0 w-[86%] max-w-[330px]",
            "bg-[var(--color-primary-dark)] shadow-[var(--shadow-lg)]",
            "transition-transform duration-300 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={closeMobileMenu}
            aria-label="Close navigation menu"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-text-inverse)]/10 text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-text-inverse)]/20"
          >
            <X size={20} />
          </button>

          <SidebarContent
            user={user}
            mainItems={mainItems}
            adminItems={adminItems}
            closeMobileMenu={closeMobileMenu}
            handleLogout={handleLogout}
            notificationCount={countData || 0}
            openPasswordReset={openPasswordReset}
          />
        </aside>
      </div>
      {isPasswordResetOpen && <PasswordReset onClose={closePasswordReset} />}
    </>
  );
};

export default Sidebar;
