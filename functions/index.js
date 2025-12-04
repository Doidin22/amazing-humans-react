/**
 * functions/index.js
 * Backend Limpo (Sem sistema de pagamentos)
 */

const { onCall } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// --- CONFIGURAÇÃO ---
const READER_REWARD = 0.01;      
const CHAPTERS_TO_WIN = 10;      
const AUTHOR_REWARD = 0.10;      
const VIEWS_TO_WIN = 1000;       
const LEVEL_BONUS_MULTIPLIER = 0.1; 

// --- FUNÇÕES DE GAMIFICAÇÃO ---

exports.registerReading = onCall(async (request) => {
    if (!request.auth) return { success: false, message: "Auth required." };

    const uid = request.auth.uid;
    const { obraId, capituloId, autorId } = request.data;

    const viewRef = db.collection('visualizacoes_capitulos').doc(`${uid}_${capituloId}`);
    const readerRef = db.collection('usuarios').doc(uid);
    const bookRef = db.collection('obras').doc(obraId);
    
    // Opcional: Manter saldoInterno apenas para pontos/moedas virtuais de gamificação, sem valor monetário real
    const authorRef = (autorId && autorId !== uid) ? db.collection('usuarios').doc(autorId) : null;

    try {
        return await db.runTransaction(async (transaction) => {
            const viewDoc = await transaction.get(viewRef);
            if (viewDoc.exists()) return { success: true, earnedCoin: false };

            const readerDoc = await transaction.get(readerRef);
            const bookDoc = await transaction.get(bookRef);
            if (!bookDoc.exists) return { success: false };

            // Leitor
            const currentReadCount = (readerDoc.data().contador_leituras || 0);
            const userLevel = (readerDoc.data().nivel || 0);
            const newReadCount = currentReadCount + 1;
            let readerBonus = 0;

            if (newReadCount > 0 && newReadCount % CHAPTERS_TO_WIN === 0) {
                const multiplier = 1 + (userLevel * LEVEL_BONUS_MULTIPLIER);
                readerBonus = READER_REWARD * multiplier;
            }

            // Autor
            const currentBookViews = (bookDoc.data().views || 0);
            const newBookViews = currentBookViews + 1;
            let authorBonus = 0;

            if (newBookViews > 0 && newBookViews % VIEWS_TO_WIN === 0) {
                authorBonus = AUTHOR_REWARD; 
            }

            transaction.set(viewRef, { userId: uid, capituloId, obraId, data: FieldValue.serverTimestamp() });

            const updateReader = { contador_leituras: newReadCount };
            if (readerBonus > 0) {
                updateReader.saldoInterno = FieldValue.increment(readerBonus);
            }
            transaction.update(readerRef, updateReader);
            transaction.update(bookRef, { views: newBookViews });

            if (authorBonus > 0 && authorRef) {
                transaction.update(authorRef, { saldoInterno: FieldValue.increment(authorBonus) });
            }

            const currentBalance = (readerDoc.data().saldoInterno || 0) + readerBonus;
            return { success: true, earnedCoin: readerBonus > 0, currentBalance, rewardAmount: readerBonus };
        });
    } catch (error) {
        console.error(error);
        return { success: false };
    }
});

exports.levelUp = onCall(async (request) => {
    if (!request.auth) return { success: false, message: "Login required." };
    const uid = request.auth.uid;
    const userRef = db.collection('usuarios').doc(uid);

    return db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        const data = userDoc.data();
        const currentLevel = data.nivel || 0;
        const currentBalance = data.saldoInterno || 0;
        const nextLevel = currentLevel + 1;
        const cost = nextLevel * 10; 

        if (currentBalance < cost) {
            return { success: false, message: `Saldo insuficiente. Precisa de ${cost} moedas.` };
        }

        t.update(userRef, { saldoInterno: FieldValue.increment(-cost), nivel: nextLevel });
        return { success: true, newLevel: nextLevel, newBalance: currentBalance - cost };
    });
});

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