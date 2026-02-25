import React from 'react';
import { Link } from 'react-router-dom';
import { MdWorkspacePremium, MdLock } from 'react-icons/md';

/**
 * PremiumLock – wraps premium-only content.
 * If the user doesn't have an 'author' subscription, shows an upsell overlay.
 *
 * Props:
 *   - user          : the user object from AuthContext
 *   - feature       : short label for the feature, e.g. "Interactive Stories"
 *   - description   : one-line description shown in the upsell card
 *   - children      : the actual premium content (rendered normally when unlocked)
 *   - compact       : if true, renders a small inline badge instead of a full card
 */
export default function PremiumLock({ user, feature, description, children, compact = false }) {
    const isAuthor = user?.subscriptionType === 'author';

    if (isAuthor) return <>{children}</>;

    if (compact) {
        return (
            <div className="relative inline-flex">
                <div className="opacity-40 pointer-events-none select-none">{children}</div>
                <Link
                    to="/subscription"
                    className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg group"
                    title={`${feature} – Author Plan required`}
                >
                    <span className="flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-900/80 border border-purple-500/50 px-2 py-1 rounded-full group-hover:bg-purple-800 transition-colors">
                        <MdLock size={10} /> Author Plan
                    </span>
                </Link>
            </div>
        );
    }

    return (
        <div className="relative rounded-2xl overflow-hidden border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e]/80 via-[#1f1f2f]/80 to-[#2a1f2a]/80">
            {/* Blurred preview */}
            <div className="opacity-20 pointer-events-none select-none blur-[2px]">
                {children}
            </div>

            {/* Upsell overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shadow-lg shadow-purple-900/30">
                    <MdWorkspacePremium size={32} className="text-purple-400" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">{feature}</h3>
                    <p className="text-gray-400 text-sm max-w-xs">{description}</p>
                </div>
                <Link
                    to="/subscription"
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-purple-900/40 hover:shadow-purple-700/40"
                >
                    <MdWorkspacePremium size={18} /> Upgrade to Author Plan
                </Link>
                <p className="text-gray-600 text-xs">$5/mo · Unlock all creator features</p>
            </div>
        </div>
    );
}
