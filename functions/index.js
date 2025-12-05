/**
 * functions/index.js
 * Backend Limpo (Sem sistema de pagamentos ou gamificação)
 */

const { onCall } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// --- FUNÇÕES DE ANALYTICS (Leitura) ---

exports.registerReading = onCall(async (request) => {
    if (!request.auth) return { success: false, message: "Auth required." };

    const uid = request.auth.uid;
    const { obraId, capituloId } = request.data;

    // Referência para garantir que a view é única por usuário/capítulo
    const viewRef = db.collection('visualizacoes_capitulos').doc(`${uid}_${capituloId}`);
    const readerRef = db.collection('usuarios').doc(uid);
    const bookRef = db.collection('obras').doc(obraId);
    
    try {
        return await db.runTransaction(async (transaction) => {
            const viewDoc = await transaction.get(viewRef);
            // Se já leu este capítulo, não faz nada (não conta view duplicada)
            if (viewDoc.exists()) return { success: true };

            const bookDoc = await transaction.get(bookRef);
            if (!bookDoc.exists) return { success: false };

            // Atualiza estatísticas do Livro (Views)
            const currentBookViews = (bookDoc.data().views || 0);
            const newBookViews = currentBookViews + 1;

            // Registra a visualização
            transaction.set(viewRef, { userId: uid, capituloId, obraId, data: FieldValue.serverTimestamp() });

            // Incrementa contador estatístico do usuário (apenas informativo)
            transaction.update(readerRef, { 
                contador_leituras: FieldValue.increment(1) 
            });

            // Incrementa views do livro
            transaction.update(bookRef, { views: newBookViews });

            return { success: true };
        });
    } catch (error) {
        console.error(error);
        return { success: false };
    }
});

// Mantém a média de avaliações (Rating System)
exports.updateBookRating = onDocumentWritten("avaliacoes/{docId}", async (event) => {
    const data = event.data.after.data() || event.data.before.data();
    if (!data) return;
    const obraId = data.obraId;
    const obraRef = db.collection("obras").doc(obraId);
    const snapshot = await db.collection("avaliacoes").where("obraId", "==", obraId).get();
    let soma = 0;
    let totalVotos = 0;
    snapshot.forEach(doc => {
        const rating = doc.data().rating;
        if (rating) { soma += rating; totalVotos++; }
    });
    const novaMedia = totalVotos > 0 ? soma / totalVotos : 0;
    return obraRef.update({ rating: novaMedia, votes: totalVotos });
});