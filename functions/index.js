/**
 * functions/index.js
 * Backend Seguro para o AmazingHumans (Com Sistema de Níveis)
 */

const { onCall } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// --- CONFIGURAÇÃO ---
const READER_REWARD = 0.01;      
const CHAPTERS_TO_WIN = 10;      
const AUTHOR_REWARD = 0.10;      
const VIEWS_TO_WIN = 1000;       
const LEVEL_BONUS_MULTIPLIER = 0.1; // 10% a mais por nível

/**
 * Função: registerReading
 * Calcula recompensa baseada no nível do usuário.
 */
exports.registerReading = onCall(async (request) => {
    if (!request.auth) return { success: false, message: "Auth required." };

    const uid = request.auth.uid;
    const { obraId, capituloId, autorId } = request.data;

    const viewRef = db.collection('visualizacoes_capitulos').doc(`${uid}_${capituloId}`);
    const readerRef = db.collection('usuarios').doc(uid);
    const bookRef = db.collection('obras').doc(obraId);
    const authorRef = (autorId && autorId !== uid) ? db.collection('usuarios').doc(autorId) : null;

    try {
        return await db.runTransaction(async (transaction) => {
            const viewDoc = await transaction.get(viewRef);
            if (viewDoc.exists()) return { success: true, earnedCoin: false };

            const readerDoc = await transaction.get(readerRef);
            const bookDoc = await transaction.get(bookRef);
            if (!bookDoc.exists) return { success: false };

            // --- LÓGICA DO LEITOR (COM NÍVEL) ---
            const currentReadCount = (readerDoc.data().contador_leituras || 0);
            const userLevel = (readerDoc.data().nivel || 0);
            
            const newReadCount = currentReadCount + 1;
            let readerBonus = 0;

            if (newReadCount > 0 && newReadCount % CHAPTERS_TO_WIN === 0) {
                // Cálculo: Base * (1 + (Nivel * 0.10))
                const multiplier = 1 + (userLevel * LEVEL_BONUS_MULTIPLIER);
                readerBonus = READER_REWARD * multiplier;
            }

            // --- LÓGICA DO AUTOR ---
            const currentBookViews = (bookDoc.data().views || 0);
            const newBookViews = currentBookViews + 1;
            let authorBonus = 0;

            if (newBookViews > 0 && newBookViews % VIEWS_TO_WIN === 0) {
                // Se quiser dar bônus de nível para autor também, use a lógica acima buscando o doc do autor
                authorBonus = AUTHOR_REWARD; 
            }

            // --- WRITES ---
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

/**
 * Nova Função: levelUp
 * Cobra tokens para aumentar o nível do usuário.
 */
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
        const cost = nextLevel * 10; // Nível 1 = 10, Nível 2 = 20, etc.

        if (currentBalance < cost) {
            return { success: false, message: `Saldo insuficiente. Precisa de ${cost} moedas.` };
        }

        t.update(userRef, {
            saldoInterno: FieldValue.increment(-cost),
            nivel: nextLevel
        });

        return { success: true, newLevel: nextLevel, newBalance: currentBalance - cost };
    });
});

// ... (Mantenha os imports e a função registerReading/levelUp que já existem)

const { onDocumentWritten } = require("firebase-functions/v2/firestore");

/**
 * Função Automática: updateBookRating
 * Gatilho: Roda sempre que alguém adiciona/edita/remove uma avaliação.
 * O que faz: Recalcula a média de estrelas e atualiza o documento da Obra.
 */
exports.updateBookRating = onDocumentWritten("avaliacoes/{docId}", async (event) => {
    // Pega o ID da obra a partir dos dados (novos ou antigos, caso seja uma deleção)
    const data = event.data.after.data() || event.data.before.data();
    if (!data) return; // Segurança
    
    const obraId = data.obraId;
    const obraRef = db.collection("obras").doc(obraId);

    // 1. Busca TODAS as avaliações deste livro para calcular a média exata
    const snapshot = await db.collection("avaliacoes").where("obraId", "==", obraId).get();

    let soma = 0;
    let totalVotos = 0;

    snapshot.forEach(doc => {
        const rating = doc.data().rating;
        if (rating) {
            soma += rating;
            totalVotos++;
        }
    });

    const novaMedia = totalVotos > 0 ? soma / totalVotos : 0;

    // 2. Atualiza o documento da Obra com a nova média (Admin SDK tem permissão total)
    return obraRef.update({
        rating: novaMedia,
        votes: totalVotos
    });
});