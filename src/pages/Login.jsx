import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { signed, signInGoogle } = useContext(AuthContext);

  if (signed) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex justify-center items-center h-[80vh] p-5">
      <div className="bg-[#1f1f1f] p-10 rounded-xl border border-[#333] text-center max-w-[400px] w-full">

        <div className="mb-8">
          <img src="/logo-ah.png" alt="Logo" className="w-20 mb-2.5 mx-auto" />
          <h1 className="text-white text-2xl m-0">Welcome Back</h1>
          <p className="text-[#777] text-sm">Access your account</p>
        </div>

        <button
          onClick={signInGoogle}
          className="w-full p-3 rounded-lg border-none bg-white text-[#333] font-bold text-base flex items-center justify-center gap-2.5 cursor-pointer mb-5"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5" />
          Sign in with Google
        </button>

      </div>
    </div>
  );
}