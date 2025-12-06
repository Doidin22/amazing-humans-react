/**
 * functions/index.js
 * Backend com Sistema de Economia, Regras de Votação e Badges
 */

const { onCall } = require("firebase-functions/v2/https");
const { onDocumentWritten, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// --- SISTEMA DE ECONOMIA ---

// 1. Comprar Moedas (Simulação)
exports.buyCoins = onCall(async (request) => {
    if (!request.auth) return { success: false, message: "Login required." };
    
    const uid = request.auth.uid;
    const { amountDollars } = request.data; 
    
    if (!amountDollars || amountDollars <= 0) return { success: false, message: "Invalid amount." };

    // Regra: 1 Dólar = 10 Moedas
    const coinsToAdd = amountDollars * 10;

    const userRef = db.collection('usuarios').doc(uid);

    try {
        await userRef.update({
            coins: FieldValue.increment(coinsToAdd)
        });
        return { success: true, coinsAdded: coinsToAdd };
    } catch (error) {
        console.error("Erro ao comprar moedas:", error);
        return { success: false, message: error.message };
    }
});

// 2. Votar em História (Com validações de leitura e auto-voto)
exports.voteStory = onCall(async (request) => {
    if (!request.auth) return { success: false, message: "Login required." };

    const uid = request.auth.uid;
    const { obraId, amountCoins } = request.data;
    
    const coinsToDonate = parseInt(amountCoins);

    if (!coinsToDonate || coinsToDonate < 1) {
        return { success: false, message: "Invalid amount. Minimum 1 coin." };
    }

    // REGRA A: Usuário deve ter avaliado (dado estrelas)
    const ratingRef = db.collection('avaliacoes').doc(`${obraId}_${uid}`);
    const ratingSnap = await ratingRef.get();
    
    if (!ratingSnap.exists) {
        return { success: false, message: "You must rate this story with stars before voting." };
    }

    // REGRA B: Usuário deve ter lido no mínimo 15 capítulos
    const viewsRef = db.collection('visualizacoes_capitulos');
    const qViews = viewsRef.where('userId', '==', uid).where('obraId', '==', obraId).count();
    const countSnap = await qViews.get();
    const chaptersRead = countSnap.data().count;

    if (chaptersRead < 15) {
        return { 
            success: false, 
            message: `You need to read at least 15 chapters to vote. (You've read ${chaptersRead})` 
        };
    }

    const userRef = db.collection('usuarios').doc(uid);
    const bookRef = db.collection('obras').doc(obraId);

    try {
        return await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            const bookDoc = await t.get(bookRef);

            if (!userDoc.exists || !bookDoc.exists) {
                throw new Error("User or Book not found.");
            }

            const userData = userDoc.data();
            const bookData = bookDoc.data();

            // REGRA C: Autor não pode votar na própria obra
            if (bookData.autorId === uid) {
                throw new Error("Authors cannot vote on their own stories.");
            }

            const currentCoins = userData.coins || 0;

            if (currentCoins < coinsToDonate) {
                throw new Error("Insufficient coins.");
            }

            // Transfere moedas
            t.update(userRef, { 
                coins: FieldValue.increment(-coinsToDonate) 
            });

            t.update(bookRef, { 
                monthly_coins: FieldValue.increment(coinsToDonate),
                total_coins: FieldValue.increment(coinsToDonate)
            });

            return { success: true, newBalance: currentCoins - coinsToDonate };
        });
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// 3. Subir de Nível
exports.levelUp = onCall(async (request) => {
    if (!request.auth) return { success: false, message: "Login required." };

    const uid = request.auth.uid;
    const levelsToBuy = request.data.levels || 1; 
    const cost = levelsToBuy * 100;

    const userRef = db.collection('usuarios').doc(uid);

    try {
        return await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) throw new Error("User not found.");

            const userData = userDoc.data();
            const currentCoins = userData.coins || 0;
            const currentLevel = userData.level || 0;

            if (currentCoins < cost) {
                throw new Error(`Insufficient coins. You need ${cost} coins.`);
            }

            const newLevel = currentLevel + levelsToBuy;

            t.update(userRef, {
                coins: FieldValue.increment(-cost),
                level: newLevel,
                isAdFree: newLevel >= 100 
            });

            return { success: true, newLevel: newLevel };
        });
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// --- ANALYTICS ---

exports.registerReading = onCall(async (request) => {
    if (!request.auth) return { success: false, message: "Auth required." };

    const uid = request.auth.uid;
    const { obraId, capituloId } = request.data;

    const viewRef = db.collection('visualizacoes_capitulos').doc(`${uid}_${capituloId}`);
    const readerRef = db.collection('usuarios').doc(uid);
    const bookRef = db.collection('obras').doc(obraId);
    
    try {
        return await db.runTransaction(async (transaction) => {
            const viewDoc = await transaction.get(viewRef);
            if (viewDoc.exists()) return { success: true };

            const bookDoc = await transaction.get(bookRef);
            if (!bookDoc.exists) return { success: false };

            const currentBookViews = (bookDoc.data().views || 0);
            const newBookViews = currentBookViews + 1;

            transaction.set(viewRef, { userId: uid, capituloId, obraId, data: FieldValue.serverTimestamp() });
            transaction.update(readerRef, { contador_leituras: FieldValue.increment(1) });
            transaction.update(bookRef, { views: newBookViews });

            return { success: true };
        });
    } catch (error) {
        console.error(error);
        return { success: false };
    }
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

// --- NOVO: SISTEMA DE SELOS (BADGES) ---
// Concede o selo "pioneer" para os primeiros 100 autores
exports.grantFounderBadge = onDocumentCreated("obras/{obraId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const obra = snapshot.data();
    const autorId = obra.autorId;
    if (!autorId) return;

    const userRef = db.collection('usuarios').doc(autorId);
    const statsRef = db.collection('stats').doc('authors_counter');

    try {
        await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            const statsDoc = await t.get(statsRef);

            if (!userDoc.exists) return;

            const userData = userDoc.data();
            const badges = userData.badges || [];

            // Se já tem o selo, ignora
            if (badges.includes('pioneer')) return;

            // Verifica contagem
            let currentCount = 0;
            if (statsDoc.exists) {
                currentCount = statsDoc.data().count || 0;
            }

            // Se acabou as 100 vagas
            if (currentCount >= 100) return;

            // Concede o selo
            const newCount = currentCount + 1;
            t.set(statsRef, { count: newCount }, { merge: true });
            t.update(userRef, {
                badges: FieldValue.arrayUnion('pioneer')
            });
            
            console.log(`Badge Pioneer concedida para ${autorId}. Total: ${newCount}/100`);
        });
    } catch (error) {
        console.error("Erro ao conceder badge:", error);
    }
});