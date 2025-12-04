import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { MdBolt, MdMenuBook } from 'react-icons/md';

export default function GamificationBar({ mobile = false }) {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  const currentLevel = user.nivel || 0;
  const currentXP = user.xp || 0;
  const totalReads = user.leituras || 0;
  
  // Regra do backend: Cost = nextLevel * 10. 
  // Mas para a barra de progresso visual, podemos simplificar ou replicar a lógica exata.
  // Vamos assumir que cada nível precisa de (Nível + 1) * 10 XP total para ser alcançado.
  // Ou simplificar: Barra % = (XP Atual / Próximo Meta).
  const xpNeeded = (currentLevel + 1) * 10;
  const progress = Math.min((currentXP / xpNeeded) * 100, 100);

  if (mobile) {
    return (
      <div className="w-full bg-[#111] p-3 rounded-lg border border-[#333] mb-4 shadow-inner">
        <div className="flex justify-between items-center mb-2 text-xs font-bold text-gray-400">
            <span className="text-yellow-500 flex items-center gap-1"><MdBolt /> LVL {currentLevel}</span>
            <span className="text-blue-400 flex items-center gap-1"><MdMenuBook /> {totalReads} Reads</span>
        </div>
        <div className="w-full h-1.5 bg-[#333] rounded-full overflow-hidden">
            <div 
                className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
            ></div>
        </div>
        <div className="text-[10px] text-right text-gray-600 mt-1">{currentXP.toFixed(1)} / {xpNeeded} XP</div>
      </div>
    );
  }

  // Desktop
  return (
    <div className="hidden lg:flex items-center gap-4 mr-4">
        <div className="flex flex-col w-32" title={`${currentXP.toFixed(1)} / ${xpNeeded} XP to Level Up`}>
            <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                <span className="text-yellow-500">LVL {currentLevel}</span>
                <span>{Math.floor(progress)}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden border border-white/5">
                <div 
                    className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
        
        {/* Badge de Leituras no Desktop */}
        <div className="flex flex-col items-center justify-center bg-[#222] w-10 h-10 rounded-full border border-[#333] shadow-sm" title="Total Chapters Read">
            <MdMenuBook className="text-blue-500 text-xs" />
            <span className="text-[10px] font-bold text-gray-300 leading-none mt-0.5">{totalReads}</span>
        </div>
    </div>
  );
}