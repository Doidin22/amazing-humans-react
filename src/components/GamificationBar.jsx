import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { MdMenuBook } from 'react-icons/md';

export default function GamificationBar({ mobile = false }) {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  const totalReads = user.leituras || 0;

  if (mobile) {
    return (
      <div className="w-full bg-[#111] p-3 rounded-lg border border-[#333] mb-4 shadow-inner">
        <div className="flex justify-between items-center text-xs font-bold text-gray-400">
            <span className="text-blue-400 flex items-center gap-1"><MdMenuBook /> {totalReads} Reads</span>
        </div>
      </div>
    );
  }

  // Desktop
  return (
    <div className="hidden lg:flex items-center gap-4 mr-4">
        {/* Badge de Leituras */}
        <div className="flex flex-col items-center justify-center bg-[#222] w-10 h-10 rounded-full border border-[#333] shadow-sm" title="Total Chapters Read">
            <MdMenuBook className="text-blue-500 text-xs" />
            <span className="text-[10px] font-bold text-gray-300 leading-none mt-0.5">{totalReads}</span>
        </div>
    </div>
  );
}