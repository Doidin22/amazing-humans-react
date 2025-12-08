import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MdMenuBook, MdCreate, MdPeople, MdDevices, 
  MdNotificationsActive, MdFavorite 
} from 'react-icons/md';

export default function HowItWorks() {
  return (
    <div className="min-h-screen pb-20 pt-10 px-4 max-w-6xl mx-auto">
      
      {/* HERO SECTION */}
      <div className="text-center mb-20">
        <h1 className="text-4xl md:text-6xl font-black text-white mb-6">
          How <span className="text-primary">Amazing Humans</span> Works
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          A completely free platform for readers and writers. No paywalls, no coins, just pure storytelling.
        </p>
      </div>

      {/* CARDS STEPS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        
        {/* STEP 1 */}
        <div className="bg-[#1f1f1f] border border-[#333] p-8 rounded-2xl relative overflow-hidden group hover:border-primary transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <MdMenuBook size={100} className="text-primary" />
          </div>
          <div className="w-14 h-14 bg-primary/20 text-primary rounded-xl flex items-center justify-center mb-6 text-2xl font-bold border border-primary/30">
            1
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Read for Free</h3>
          <p className="text-gray-400 leading-relaxed">
            Dive into a growing library of original fiction. From Fantasy to Sci-Fi, read as much as you want without spending a dime. Customize your reader with fonts, dark mode, and more.
          </p>
        </div>

        {/* STEP 2 */}
        <div className="bg-[#1f1f1f] border border-[#333] p-8 rounded-2xl relative overflow-hidden group hover:border-green-500 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <MdCreate size={100} className="text-green-500" />
          </div>
          <div className="w-14 h-14 bg-green-500/20 text-green-500 rounded-xl flex items-center justify-center mb-6 text-2xl font-bold border border-green-500/30">
            2
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Share Your Story</h3>
          <p className="text-gray-400 leading-relaxed">
            Have a story to tell? Use our powerful editor to write and publish your own books. Build an audience, get feedback, and join a community of creators.
          </p>
        </div>

        {/* STEP 3 */}
        <div className="bg-[#1f1f1f] border border-[#333] p-8 rounded-2xl relative overflow-hidden group hover:border-purple-500 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <MdPeople size={100} className="text-purple-500" />
          </div>
          <div className="w-14 h-14 bg-purple-500/20 text-purple-500 rounded-xl flex items-center justify-center mb-6 text-2xl font-bold border border-purple-500/30">
            3
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Connect</h3>
          <p className="text-gray-400 leading-relaxed">
            Follow your favorite authors to get notified when they update. Comment on chapters, discuss theories, and support the community with your feedback.
          </p>
        </div>
      </div>

      {/* FEATURES LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20 bg-white/5 rounded-3xl p-8 md:p-12 border border-white/10">
        <div>
          <h2 className="text-3xl font-bold text-white mb-6">Why Amazing Humans?</h2>
          <ul className="space-y-6">
            <li className="flex gap-4">
              <div className="bg-blue-500/20 p-3 rounded-lg text-blue-400 h-fit"><MdDevices size={24} /></div>
              <div>
                <h4 className="text-white font-bold text-lg">Cross-Platform</h4>
                <p className="text-gray-400 text-sm">Read comfortably on your desktop, tablet, or mobile phone. Your library syncs everywhere.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="bg-yellow-500/20 p-3 rounded-lg text-yellow-400 h-fit"><MdNotificationsActive size={24} /></div>
              <div>
                <h4 className="text-white font-bold text-lg">Instant Updates</h4>
                <p className="text-gray-400 text-sm">Never miss a chapter. Follow authors and get instant notifications when new content drops.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="bg-pink-500/20 p-3 rounded-lg text-pink-400 h-fit"><MdFavorite size={24} /></div>
              <div>
                <h4 className="text-white font-bold text-lg">Community Driven</h4>
                <p className="text-gray-400 text-sm">Built for lovers of fiction. Rate stories, leave reviews, and help others find hidden gems.</p>
              </div>
            </li>
          </ul>
        </div>
        
        <div className="bg-gradient-to-br from-primary/20 to-purple-900/20 rounded-2xl p-8 border border-white/10 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to start?</h3>
            <p className="text-gray-300 mb-8">Join thousands of readers and writers today.</p>
            <div className="flex flex-col gap-4">
                <Link to="/login" className="btn-primary py-4 text-lg shadow-xl shadow-primary/20">Create Free Account</Link>
                <Link to="/" className="text-gray-400 hover:text-white font-bold text-sm">Browse Library First</Link>
            </div>
        </div>
      </div>

    </div>
  );
}