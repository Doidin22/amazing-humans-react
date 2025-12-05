import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { 
  collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc 
} from 'firebase/firestore';
import { MdStar, MdStarBorder, MdDelete, MdRateReview, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function Reviews({ obraId, obraTitulo, autorId }) {
  const { user } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isWriting, setIsWriting] = useState(false);

  // Paginação
  const [pagina, setPagina] = useState(1);
  const ITENS_POR_PAGINA = 10;

  const getFallbackAvatar = (name) => `https://ui-avatars.com/api/?name=${name || 'User'}&background=random`;

  useEffect(() => {
    const q = query(
      collection(db, "reviews"), 
      where("obraId", "==", obraId), 
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let lista = [];
      snapshot.forEach((doc) => lista.push({ id: doc.id, ...doc.data() }));
      setReviews(lista);
    });

    return () => unsubscribe();
  }, [obraId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return toast.error("Login to write a review.");
    if (rating === 0) return toast.error("Please select a star rating.");
    if (!content.trim()) return toast.error("Please write some content.");

    try {
      await addDoc(collection(db, "reviews"), {
        obraId,
        obraTitulo,
        userId: user.uid,
        userName: user.name,
        userAvatar: user.avatar,
        rating,
        title,
        content,
        createdAt: serverTimestamp()
      });
      
      setTitle('');
      setContent('');
      setRating(0);
      setIsWriting(false);
      setPagina(1); // Volta para a primeira página para ver o novo review
      toast.success("Review published!");
    } catch (error) {
      console.error(error);
      toast.error("Error publishing review.");
    }
  }

  async function handleDelete(id) {
    if(!window.confirm("Delete this review?")) return;
    try {
        await deleteDoc(doc(db, "reviews", id));
        toast.success("Review deleted.");
    } catch(e) {
        toast.error("Error deleting.");
    }
  }

  // Lógica de Paginação
  const totalPaginas = Math.ceil(reviews.length / ITENS_POR_PAGINA);
  const inicio = (pagina - 1) * ITENS_POR_PAGINA;
  const reviewsVisiveis = reviews.slice(inicio, inicio + ITENS_POR_PAGINA);

  const irParaAnterior = () => setPagina(p => Math.max(p - 1, 1));
  const irParaProxima = () => setPagina(p => Math.min(p + 1, totalPaginas));

  return (
    <div className="mt-16 border-t border-white/10 pt-10">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <MdRateReview className="text-primary" /> Reviews <span className="text-sm bg-[#333] px-2 py-0.5 rounded-full text-gray-400">{reviews.length}</span>
        </h3>
        {!isWriting && (
            <button 
                onClick={() => setIsWriting(true)} 
                className="btn-primary py-2 px-4 text-sm"
            >
                Write a Review
            </button>
        )}
      </div>

      {isWriting && (
        <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-xl mb-10 animate-fade-in border border-white/10">
            <h4 className="text-white font-bold mb-4">Write your review</h4>
            
            <div className="flex gap-1 mb-4">
                {[1,2,3,4,5].map(star => (
                    <button 
                        key={star} 
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="focus:outline-none transition-transform hover:scale-110"
                    >
                        {star <= (hoverRating || rating) 
                            ? <MdStar size={32} className="text-yellow-500" /> 
                            : <MdStarBorder size={32} className="text-gray-600" />
                        }
                    </button>
                ))}
            </div>

            <input 
                type="text" 
                placeholder="Review Title (e.g., 'Amazing plot twist!')"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-modern w-full mb-4"
            />

            <textarea 
                rows="4"
                placeholder="What did you think about this book?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="input-modern w-full mb-4 resize-y"
            ></textarea>

            <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsWriting(false)} className="text-gray-400 hover:text-white px-4 py-2 font-bold transition-colors">Cancel</button>
                <button type="submit" className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-colors">Post Review</button>
            </div>
        </form>
      )}

      <div className="space-y-6">
        {reviewsVisiveis.length === 0 ? (
            <p className="text-gray-500 text-center py-10 bg-white/5 rounded-xl border border-dashed border-white/10">No reviews yet. Be the first to review!</p>
        ) : (
            reviewsVisiveis.map(review => (
                <div key={review.id} className="bg-[#18181b] border border-white/5 p-6 rounded-xl hover:border-white/10 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <img 
                                src={review.userAvatar || getFallbackAvatar(review.userName)} 
                                alt={review.userName} 
                                className="w-10 h-10 rounded-full border border-gray-600 object-cover" 
                                onError={(e) => { e.target.src = getFallbackAvatar(review.userName); }}
                            />
                            <div>
                                <p className="text-white font-bold text-sm">{review.userName}</p>
                                <div className="flex text-yellow-500 text-xs">
                                    {[...Array(5)].map((_, i) => (
                                        i < review.rating ? <MdStar key={i} /> : <MdStarBorder key={i} className="text-gray-600" />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <span className="text-xs text-gray-500">
                            {review.createdAt ? new Date(review.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                        </span>
                    </div>

                    {review.title && <h5 className="text-white font-bold mb-2">{review.title}</h5>}
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{review.content}</p>

                    {(user?.uid === review.userId || user?.uid === autorId) && (
                        <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                            <button onClick={() => handleDelete(review.id)} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 font-bold transition-colors">
                                <MdDelete /> Delete
                            </button>
                        </div>
                    )}
                </div>
            ))
        )}
      </div>

      {/* PAGINAÇÃO */}
      {totalPaginas > 1 && (
        <div className="flex justify-center items-center gap-4 mt-10 pt-6 border-t border-white/5">
            <button 
                onClick={irParaAnterior} 
                disabled={pagina === 1} 
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-white transition-colors"
            >
                <MdChevronLeft size={24} />
            </button>
            <span className="text-sm font-bold text-gray-400">
                Page {pagina} of {totalPaginas}
            </span>
            <button 
                onClick={irParaProxima} 
                disabled={pagina === totalPaginas} 
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-white transition-colors"
            >
                <MdChevronRight size={24} />
            </button>
        </div>
      )}

    </div>
  );
}