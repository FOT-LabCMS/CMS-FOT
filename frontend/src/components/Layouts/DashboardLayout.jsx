import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../Common/SideBar";

const DashboardLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("fotcms-sidebar-collapsed") === "true";
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem("fotcms-sidebar-collapsed", String(newValue));
      return newValue;
    });
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />

      <main className={`min-h-screen transition-[margin-left] duration-300 ease-in-out ${isCollapsed ? "lg:ml-20" : "lg:ml-72"}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;