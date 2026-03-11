import React, { useContext, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Login() {
  const { signed, signInGoogle, registerEmail, loginEmail } = useContext(AuthContext);
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  if (signed) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Email and password are required.');
      return;
    }

    if (isLoginMode) {
      await loginEmail(email, password);
    } else {
      if (!name) {
        toast.error('Name is required for registration.');
        return;
      }
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters.');
        return;
      }
      await registerEmail(name, email, password, inviteCode);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[85vh] p-4 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#27272a]/40 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="bg-[#18181b]/80 backdrop-blur-xl p-8 md:p-10 rounded-2xl border border-white/10 shadow-2xl relative z-10 w-full max-w-[420px]">
        
        <div className="mb-8 text-center">
          <Link to="/">
            <img src="/logo-ah.png" alt="Amazing Humans" className="w-16 h-16 mx-auto mb-4 hover:scale-105 transition-transform" />
          </Link>
          <h1 className="text-white text-3xl font-bold font-serif mb-2">
            {isLoginMode ? 'Welcome Back' : 'Join Amazing Humans'}
          </h1>
          <p className="text-zinc-400 text-sm">
            {isLoginMode ? 'Sign in to continue reading.' : 'Create an account to start your journey.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {!isLoginMode && (
            <div>
              <label className="text-zinc-400 text-xs uppercase font-bold tracking-wider ml-1 mb-1 block">Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all placeholder-zinc-600"
              />
            </div>
          )}

          <div>
            <label className="text-zinc-400 text-xs uppercase font-bold tracking-wider ml-1 mb-1 block">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all placeholder-zinc-600"
            />
          </div>

          <div>
            <label className="text-zinc-400 text-xs uppercase font-bold tracking-wider ml-1 mb-1 block">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all placeholder-zinc-600"
            />
          </div>

          {!isLoginMode && (
            <div>
              <label className="text-zinc-400 text-xs uppercase font-bold tracking-wider ml-1 mb-1 block">Invite Code (Optional)</label>
              <input
                type="text"
                placeholder="REF-XXXXX"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all placeholder-zinc-600"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full mt-2 py-3.5 rounded-xl bg-zinc-200 hover:bg-white text-black font-bold text-sm transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-[0.98]"
          >
            {isLoginMode ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative px-4 bg-[#18181b] text-xs font-bold text-zinc-500 uppercase tracking-widest">
            OR
          </div>
        </div>

        <button
          onClick={() => signInGoogle(inviteCode)}
          type="button"
          className="w-full p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5 bg-white rounded-full p-0.5" />
          Continue with Google
        </button>

        <div className="mt-8 text-center">
          <button 
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setName('');
              setPassword('');
            }}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            {isLoginMode ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

      </div>
    </div>
  );
}