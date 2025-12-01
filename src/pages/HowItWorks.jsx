import React from 'react';
import { Link } from 'react-router-dom';
import { MdMenuBook, MdEdit, MdMonetizationOn, MdEmojiEvents, MdArrowForward } from 'react-icons/md';

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-[#121212] text-gray-200 font-sans pb-20">
      
      {/* Hero Section */}
      <div className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] -z-10"></div>
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-serif tracking-tight">
          How <span className="text-primary">Amazing Humans</span> Works
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          A platform built for imagination. Read thousands of stories for free, publish your own worlds, and earn rewards as you grow.
        </p>
        <div className="flex justify-center gap-4">
            <Link to="/escrever" className="btn-primary px-8 py-3 text-lg rounded-full shadow-xl hover:scale-105 transition-transform">Start Writing</Link>
            <Link to="/" className="px-8 py-3 rounded-full border border-[#333] hover:bg-[#222] font-bold transition-colors">Browse Library</Link>
        </div>
      </div>

      {/* Grid de Funcionalidades */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
        
        {/* 1. Para Leitores */}
        <div className="bg-[#1f1f1f] border border-[#333] p-8 rounded-2xl hover:border-primary/30 transition-colors group">
            <div className="w-14 h-14 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MdMenuBook size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">For Readers</h3>
            <ul className="space-y-4 text-gray-400">
                <li className="flex items-start gap-3">
                    <span className="mt-1 w-2 h-2 bg-blue-500 rounded-full shrink-0"></span>
                    <span><strong>Free Reading:</strong> Access thousands of chapters without paywalls.</span>
                </li>
                <li className="flex items-start gap-3">
                    <span className="mt-1 w-2 h-2 bg-blue-500 rounded-full shrink-0"></span>
                    <span><strong>Custom Library:</strong> Track your progress, save favorites, and get notifications for new updates.</span>
                </li>
                <li className="flex items-start gap-3">
                    <span className="mt-1 w-2 h-2 bg-blue-500 rounded-full shrink-0"></span>
                    <span><strong>Community:</strong> Comment, review, and interact directly with authors.</span>
                </li>
            </ul>
        </div>

        {/* 2. Para Escritores */}
        <div className="bg-[#1f1f1f] border border-[#333] p-8 rounded-2xl hover:border-green-500/30 transition-colors group">
            <div className="w-14 h-14 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MdEdit size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">For Writers</h3>
            <ul className="space-y-4 text-gray-400">
                <li className="flex items-start gap-3">
                    <span className="mt-1 w-2 h-2 bg-green-500 rounded-full shrink-0"></span>
                    <span><strong>Easy Publishing:</strong> Our editor is simple and powerful. Publish chapters in seconds.</span>
                </li>
                <li className="flex items-start gap-3">
                    <span className="mt-1 w-2 h-2 bg-green-500 rounded-full shrink-0"></span>
                    <span><strong>Audience Growth:</strong> Get discovered by readers looking for your specific genre tags.</span>
                </li>
                <li className="flex items-start gap-3">
                    <span className="mt-1 w-2 h-2 bg-green-500 rounded-full shrink-0"></span>
                    <span><strong>Analytics:</strong> Track views, ratings, and engagement on your dashboard.</span>
                </li>
            </ul>
        </div>

      </div>

      {/* Seção de Gamificação (Futuro) */}
      <div className="max-w-4xl mx-auto px-6 mb-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-12">Level Up Your Experience</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 bg-[#1a1a1a] rounded-xl border border-[#333] hover:-translate-y-2 transition-transform">
                <MdEmojiEvents size={40} className="text-yellow-500 mx-auto mb-4" />
                <h4 className="font-bold text-white mb-2">Earn Badges</h4>
                <p className="text-sm text-gray-500">Unlock special badges by reading streaks or publishing milestones.</p>
            </div>
            <div className="p-6 bg-[#1a1a1a] rounded-xl border border-[#333] hover:-translate-y-2 transition-transform">
                <MdMonetizationOn size={40} className="text-emerald-400 mx-auto mb-4" />
                <h4 className="font-bold text-white mb-2">Collect Coins</h4>
                <p className="text-sm text-gray-500">Read daily to earn coins (Coming Soon) to support authors.</p>
            </div>
            <div className="p-6 bg-[#1a1a1a] rounded-xl border border-[#333] hover:-translate-y-2 transition-transform">
                <MdMenuBook size={40} className="text-purple-400 mx-auto mb-4" />
                <h4 className="font-bold text-white mb-2">Discover</h4>
                <p className="text-sm text-gray-500">Our algorithm suggests books based on what you actually read.</p>
            </div>
        </div>
      </div>

      {/* CTA Final */}
      <div className="max-w-3xl mx-auto px-6 text-center bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-white/10 p-10 rounded-2xl">
        <h2 className="text-2xl font-bold text-white mb-4">Ready to begin?</h2>
        <p className="text-gray-400 mb-8">Join thousands of amazing humans creating and consuming stories.</p>
        <Link to="/login" className="inline-flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors">
            Get Started <MdArrowForward />
        </Link>
      </div>

    </div>
  );
}