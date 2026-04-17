import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Database, Package, LogOut, ArrowLeft } from 'lucide-react';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20">
        <div className="p-5 flex items-center gap-3 border-b border-slate-800 bg-slate-950/50">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Database size={18} />
          </div>
          <h1 className="font-bold text-lg text-white tracking-tight">Admin <span className="text-indigo-400">Panel</span></h1>
        </div>
        
        <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar p-3 gap-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-4 px-3">
            Menu Utama
          </div>
          <NavLink 
            to="/admin/database" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${isActive ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'hover:bg-slate-800 hover:text-white border border-transparent'}`
            }
          >
            <Database size={18} />
            Database Editor
          </NavLink>

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-6 px-3">
            Paket Pekerjaan
          </div>
          <NavLink 
            to="/admin/paket-pekerjaan/2025" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${isActive ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'hover:bg-slate-800 hover:text-white border border-transparent'}`
            }
          >
            <Package size={18} />
            Tahun 2025
          </NavLink>
          <NavLink 
            to="/admin/paket-pekerjaan/2026" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${isActive ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'hover:bg-slate-800 hover:text-white border border-transparent'}`
            }
          >
            <Package size={18} />
            Tahun 2026
          </NavLink>
          <NavLink 
            to="/admin/paket-pekerjaan/2027" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${isActive ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'hover:bg-slate-800 hover:text-white border border-transparent'}`
            }
          >
            <Package size={18} />
            Tahun 2027
          </NavLink>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors w-full p-2 rounded-lg hover:bg-slate-800"
          >
            <ArrowLeft size={16} />
            Kembali ke Peta
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
