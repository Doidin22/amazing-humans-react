import React, { useState, useContext } from 'react';
import { db } from '../services/firebaseConnection';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { MdClose, MdWarning, MdCheckCircle } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function ReportModal({ isOpen, onClose, targetId, targetType, targetName }) {
  const { user } = useContext(AuthContext);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const reasons = [
    "Inappropriate Content (NSFW/Violence)",
    "Plagiarism / Copyright Violation",
    "Spam or Misleading",
    "Hate Speech or Harassment",
    "Other"
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return toast.error("Login required to report.");
    if (!reason) return toast.error("Please select a reason.");

    setLoading(true);
    try {
      await addDoc(collection(db, "reports"), {
        targetId,
        targetType, // 'book' ou 'chapter'
        targetName,
        reporterId: user.uid,
        reporterName: user.name,
        reason,
        description,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setReason('');
        setDescription('');
        onClose();
      }, 2000);
    } catch (error) {
      console.error(error);
      toast.error("Error submitting report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1f1f1f] border border-[#333] w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-fade-in">
        
        <div className="flex justify-between items-center p-4 border-b border-[#333] bg-[#252525]">
          <h3 className="text-white font-bold flex items-center gap-2">
            <MdWarning className="text-red-500" /> Report Content
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><MdClose size={24}/></button>
        </div>

        {sent ? (
          <div className="p-10 text-center flex flex-col items-center justify-center">
            <MdCheckCircle size={50} className="text-green-500 mb-4" />
            <h4 className="text-white font-bold text-lg">Report Received</h4>
            <p className="text-gray-400 text-sm mt-2">Thank you for keeping our community safe.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-gray-400 mb-2">
              Reporting: <strong className="text-white">{targetName}</strong>
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reason</label>
              <select 
                value={reason} 
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-[#151515] border border-[#333] rounded-lg p-3 text-white focus:border-red-500 outline-none text-sm"
                required
              >
                <option value="">Select a reason...</option>
                {reasons.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Additional Details</label>
              <textarea 
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#151515] border border-[#333] rounded-lg p-3 text-white focus:border-red-500 outline-none text-sm resize-none"
                placeholder="Provide more context (optional)..."
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#333] text-sm font-bold">Cancel</button>
              <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-lg disabled:opacity-50">
                {loading ? "Sending..." : "Submit Report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}