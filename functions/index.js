/**
 * functions/index.js
 * Backend Seguro para o AmazingHumans
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
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
const PLATFORM_FEE_PERCENT = 0.30; // Plataforma fica com 30% da venda avulsa

// --- FUNÇÕES EXISTENTES (MANTIDAS) ---

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

            // Leitor
            const currentReadCount = (readerDoc.data().contador_leituras || 0);
            const userLevel = (readerDoc.data().nivel || 0);
            const newReadCount = currentReadCount + 1;
            let readerBonus = 0;

            if (newReadCount > 0 && newReadCount % CHAPTERS_TO_WIN === 0) {
                const multiplier = 1 + (userLevel * LEVEL_BONUS_MULTIPLIER);
                readerBonus = READER_REWARD * multiplier;
            }

            // Autor (Bônus por visualização gratuita)
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

exports.generateReferralCode = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login necessário.');
    
    const uid = request.auth.uid;
    const userRef = db.collection('usuarios').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    const now = new Date();
    const isVip = userData.assinatura && userData.assinatura.expiraEm.toDate() > now;
    
    if (!isVip) {
        throw new HttpsError('failed-precondition', 'Você precisa ser Premium para gerar um código.');
    }

    const capsQuery = await db.collection('capitulos').where('autorId', '==', uid).count().get();
    if (capsQuery.data().count < 10) {
        throw new HttpsError('failed-precondition', 'Você precisa ter publicado pelo menos 10 capítulos.');
    }

    if (userData.referralCode) {
        return { code: userData.referralCode };
    }

    const cleanName = (userData.nome || 'User').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 5);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newCode = `${cleanName}${randomSuffix}`;

    await userRef.update({ referralCode: newCode });
    await db.collection('referral_codes').doc(newCode).set({ uid: uid });

    return { code: newCode };
});

exports.subscribePremium = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login necessário.');
    
    const uid = request.auth.uid;
    const { referralCode } = request.data;
    const userRef = db.collection('usuarios').doc(uid);

    let price = 5.00;
    let referrerId = null;

    if (referralCode) {
        const refDoc = await db.collection('referral_codes').doc(referralCode).get();
        if (refDoc.exists) {
            price = 4.00;
            referrerId = refDoc.data().uid;
            if (referrerId === uid) {
                throw new HttpsError('invalid-argument', 'Você não pode usar seu próprio código.');
            }
        } else {
            throw new HttpsError('not-found', 'Código de convite inválido.');
        }
    }
    
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const batch = db.batch();

    batch.update(userRef, {
        assinatura: {
            status: 'active',
            plano: 'premium_monthly',
            expiraEm: expiresAt,
            renovacaoAutomatica: false 
        }
    });

    if (referrerId) {
        const referrerRef = db.collection('usuarios').doc(referrerId);
        const releaseDate = new Date();
        releaseDate.setMonth(releaseDate.getMonth() + 1);
        releaseDate.setDate(28); 
        releaseDate.setHours(0, 0, 0, 0);

        const commission = 1.00;
        const transactionRef = referrerRef.collection('carteira_transacoes').doc();
        batch.set(transactionRef, {
            tipo: 'referral_commission',
            valor: commission,
            deUsuario: uid,
            dataCriacao: FieldValue.serverTimestamp(),
            dataLiberacao: releaseDate,
            status: 'pending'
        });

        batch.update(referrerRef, { 'carteira.saldoPendente': FieldValue.increment(commission) });
    }

    await batch.commit();
    return { success: true, message: `Assinado! Valor pago: $${price}` };
});

exports.withdrawFunds = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
    const uid = request.auth.uid;
    const userRef = db.collection('usuarios').doc(uid);

    const today = new Date();
    const day = today.getDate();
    const isWithdrawWindow = (day >= 28) || (day <= 5);

    if (!isWithdrawWindow) {
        throw new HttpsError('failed-precondition', 'Saques liberados apenas entre o dia 28 e o dia 5.');
    }

    return db.runTransaction(async (t) => {
        const doc = await t.get(userRef);
        const wallet = doc.data().carteira || { saldoDisponivel: 0 };
        
        if (wallet.saldoDisponivel < 10) { 
             throw new HttpsError('failed-precondition', 'Mínimo para saque é $10.00');
        }

        const amount = wallet.saldoDisponivel;
        
        t.update(userRef, {
            'carteira.saldoDisponivel': 0,
            'carteira.ultimoSaque': FieldValue.serverTimestamp()
        });

        const logRef = userRef.collection('carteira_transacoes').doc();
        t.set(logRef, {
            tipo: 'withdraw',
            valor: -amount,
            data: FieldValue.serverTimestamp(),
            status: 'completed'
        });

        return { success: true, amountWithdrawn: amount };
    });
});

exports.refreshWallet = onCall(async (request) => {
    if (!request.auth) return { success: false };
    const uid = request.auth.uid;
    const userRef = db.collection('usuarios').doc(uid);
    const now = new Date();

    const transactionsRef = userRef.collection('carteira_transacoes');
    
    const snapshot = await transactionsRef
        .where('status', '==', 'pending')
        .where('dataLiberacao', '<=', now)
        .get();

    if (snapshot.empty) return { success: true, moved: 0 };

    let totalReleased = 0;
    const batch = db.batch();

    snapshot.forEach(doc => {
        const val = doc.data().valor;
        totalReleased += val;
        batch.update(doc.ref, { status: 'available' });
    });

    batch.update(userRef, {
        'carteira.saldoPendente': FieldValue.increment(-totalReleased),
        'carteira.saldoDisponivel': FieldValue.increment(totalReleased)
    });

    await batch.commit();
    return { success: true, moved: totalReleased };
});

// --- NOVA FUNÇÃO: COMPRA DE LIVRO (AVULSA) ---
/**
 * Permite que usuário Free compre um livro Premium usando saldo interno.
 */
exports.buyBook = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    
    const uid = request.auth.uid;
    const { obraId, autorId, preco } = request.data;
    const userRef = db.collection('usuarios').doc(uid);
    const authorRef = db.collection('usuarios').doc(autorId);

    // Validações básicas
    if (!preco || preco <= 0) throw new HttpsError('invalid-argument', 'Preço inválido.');
    if (uid === autorId) throw new HttpsError('invalid-argument', 'Você não pode comprar seu próprio livro.');

    return db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        const userData = userDoc.data();
        const currentBalance = userData.saldoInterno || 0;

        if (currentBalance < preco) {
            throw new HttpsError('failed-precondition', `Saldo insuficiente. Você tem ${currentBalance.toFixed(2)}, precisa de ${preco.toFixed(2)}.`);
        }

        // Verifica se já comprou (opcional, mas bom pra evitar cobrarnça dupla)
        const libQuery = await db.collection('biblioteca')
            .where('userId', '==', uid)
            .where('obraId', '==', obraId)
            .where('owned', '==', true)
            .get();
            
        if (!libQuery.empty) {
            return { success: true, message: "Você já possui este livro." };
        }

        // 1. Debita do Comprador
        t.update(userRef, { saldoInterno: FieldValue.increment(-preco) });

        // 2. Calcula comissão e Credita Autor
        const authorShare = preco * (1 - PLATFORM_FEE_PERCENT); // Ex: 70% para autor
        
        // Autor recebe como "Disponível" ou "Pendente"? 
        // Vamos colocar como Disponível direto para simplificar vendas de livros, ou Pendente com liberação imediata.
        // Vamos usar o saldoPendente para manter consistência com o sistema de saque.
        const releaseDate = new Date();
        releaseDate.setMonth(releaseDate.getMonth() + 1);
        releaseDate.setDate(28); 
        releaseDate.setHours(0, 0, 0, 0);

        t.update(authorRef, { 'carteira.saldoPendente': FieldValue.increment(authorShare) });

        const transactionRef = authorRef.collection('carteira_transacoes').doc();
        t.set(transactionRef, {
            tipo: 'book_sale',
            valor: authorShare,
            deUsuario: uid,
            obraId: obraId,
            dataCriacao: FieldValue.serverTimestamp(),
            dataLiberacao: releaseDate,
            status: 'pending'
        });

        // 3. Adiciona na Biblioteca como "owned"
        const newLibRef = db.collection('biblioteca').doc();
        t.set(newLibRef, {
            userId: uid,
            obraId: obraId,
            tituloObra: request.data.tituloObra || "Unknown Book",
            status: 'reading',
            owned: true, // Flag importante!
            dataAdicao: FieldValue.serverTimestamp()
        });

        return { success: true, message: "Livro comprado com sucesso!" };
    });
});