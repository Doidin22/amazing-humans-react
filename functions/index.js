const { onDocumentWritten, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// ======================================================
// 1. ANALYTICS & SISTEMA (ANTIGOS RESTAURADOS)
// ======================================================

exports.registerReading = onCall({ cors: true }, async (request) => {
    if (!request.auth) return { success: false };
    const { obraId, capituloId } = request.data;
    const uid = request.auth.uid;
    const viewRef = db.collection('visualizacoes_capitulos').doc(`${uid}_${capituloId}`);

    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(viewRef);
            if (doc.exists()) return;

            t.set(viewRef, { userId: uid, obraId, capituloId, data: FieldValue.serverTimestamp() });
            t.update(db.collection('obras').doc(obraId), { views: FieldValue.increment(1) });
            t.update(db.collection('usuarios').doc(uid), { contador_leituras: FieldValue.increment(1) });
        });
        return { success: true };
    } catch (e) { return { success: false }; }
});

exports.updateBookRating = onDocumentWritten("avaliacoes/{docId}", async (event) => {
    const data = event.data?.after?.data();
    if (!data) return;
    const snapshot = await db.collection("avaliacoes").where("obraId", "==", data.obraId).get();
    let soma = 0, total = 0;
    snapshot.forEach(d => { soma += d.data().rating; total++; });
    return db.collection("obras").doc(data.obraId).update({ rating: total ? soma / total : 0, votes: total });
});

exports.grantFounderBadge = onDocumentCreated("obras/{obraId}", async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const autorId = data.autorId;
    if (!autorId) return;

    const statsRef = db.collection('stats').doc('authors_counter');
    await db.runTransaction(async (t) => {
        const stats = await t.get(statsRef);
        const count = stats.exists ? stats.data().count : 0;
        if (count >= 100) return;
        const userRef = db.collection('usuarios').doc(autorId);
        const user = await t.get(userRef);
        if (user.data().badges?.includes('pioneer')) return;
        t.set(statsRef, { count: count + 1 }, { merge: true });
        t.update(userRef, { badges: FieldValue.arrayUnion('pioneer') });
    });
});

exports.manageFollowers = onDocumentWritten("seguidores/{docId}", async (event) => {
    if (!event.data.after.exists && !event.data.before.exists) return;
    const isNew = !event.data.before.exists;
    const data = isNew ? event.data.after.data() : event.data.before.data();
    const val = isNew ? 1 : -1;

    const b = db.batch();
    b.update(db.collection('usuarios').doc(data.followedId), { followersCount: FieldValue.increment(val) });
    b.update(db.collection('usuarios').doc(data.followerId), { followingCount: FieldValue.increment(val) });
    await b.commit();
});

exports.notifyNewChapter = onDocumentCreated("capitulos/{capituloId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const navData = snapshot.data();
    const autorId = navData.autorId;
    const nomeObra = navData.nomeObra;
    const tituloCap = navData.titulo;
    const autorNome = navData.autor;

    if (!autorId) return;

    const seguidoresRef = db.collection('seguidores');
    const q = seguidoresRef.where('seguidoId', '==', autorId);
    const followersSnap = await q.get();

    if (followersSnap.empty) return;

    const notificationsBatch = [];
    followersSnap.forEach(docSeguidor => {
        const seguidorData = docSeguidor.data();
        notificationsBatch.push({
            paraId: seguidorData.seguidorId, // Atenção: Verifique se no seu banco é 'seguidorId' ou 'followerId'
            mensagem: `<strong>${autorNome}</strong> updated "${nomeObra}": ${tituloCap}`,
            tipo: 'chapter',
            linkDestino: `/ler/${snapshot.id}`,
            lida: false,
            data: FieldValue.serverTimestamp()
        });
    });

    const chunkSize = 500;
    for (let i = 0; i < notificationsBatch.length; i += chunkSize) {
        const chunk = notificationsBatch.slice(i, i + chunkSize);
        const batch = db.batch();
        chunk.forEach(notif => {
            const newRef = db.collection('notificacoes').doc();
            batch.set(newRef, notif);
        });
        await batch.commit();
    }
});

// ======================================================
// 2. BUSCA INTELIGENTE (RESTAURADO)
// ======================================================
const createSearchTokens = (text) => {
    if (!text) return [];
    const words = text.toLowerCase().split(/[^\w\d\p{L}]+/u);
    const uniqueTokens = new Set();
    words.forEach(word => {
        if (word.length < 2) return;
        for (let i = 2; i <= word.length; i++) {
            uniqueTokens.add(word.substring(0, i));
        }
    });
    return Array.from(uniqueTokens);
};

exports.indexStoryForSearch = onDocumentWritten("obras/{obraId}", async (event) => {
    const after = event.data?.after;
    if (!after || !after.exists) return;
    const data = after.data();
    const previousData = event.data?.before?.data() || {};

    if (data.titulo === previousData.titulo && data.searchKeywords) return;

    const tokens = createSearchTokens(data.titulo);
    return after.ref.update({ 
        searchKeywords: tokens,
        tituloBusca: data.titulo.toLowerCase()
    });
});

// ======================================================
// 3. PAGAMENTOS STRIPE (NOVOS)
// ======================================================

exports.createStripeCheckout = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');

    const { type, packId, coinsAmount } = request.data; 
    const uid = request.auth.uid;
    const email = request.auth.token.email;

    // Em produção, use process.env.STRIPE_SECRET_KEY
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

    // MUDAR PARA SEU DOMÍNIO EM PRODUÇÃO (ex: https://amazing-humans.web.app)
    const domain = "https://amazinghumans-ae0f3.web.app"; 
    // Se estiver testando local: const domain = "http://localhost:5173";

    const successUrl = `${domain}/dashboard?payment=success`;
    const cancelUrl = `${domain}/subscription?payment=cancelled`;

    let sessionData = {
        payment_method_types: ['card'],
        customer_email: email,
        client_reference_id: uid,
        metadata: { userId: uid, type },
        success_url: successUrl,
        cancel_url: cancelUrl,
    };

    if (type === 'coin_pack') {
        sessionData.mode = 'payment';
        sessionData.metadata.coinsAmount = coinsAmount;
        const priceInCents = coinsAmount * 10; 
        if (priceInCents < 50) throw new HttpsError('invalid-argument', 'Minimum 5 coins.');

        sessionData.line_items = [{
            price_data: {
                currency: 'usd',
                product_data: { name: `${coinsAmount} Coins Pack` },
                unit_amount: priceInCents,
            },
            quantity: 1,
        }];
    } 
    else if (type === 'subscription') {
        sessionData.mode = 'subscription';
        
        // --- ATENÇÃO: COLOQUE SEUS IDs DO STRIPE AQUI ---
        // Exemplo:
        // if (packId.includes('reader')) priceId = "price_1P5...";
        
        // Verificação de Autor
        if (packId.includes('author')) {
             const worksRef = db.collection('obras');
             const q = worksRef.where('autorId', '==', uid).where('totalChapters', '>=', 10);
             const snap = await q.count().get();
             if (snap.data().count < 1) {
                 throw new HttpsError('failed-precondition', 'requirements not met: need 1 book with 10+ chapters');
             }
             sessionData.metadata.subTier = 'author';
        } else {
             sessionData.metadata.subTier = 'reader';
        }

        // MOCK PARA NÃO QUEBRAR O DEPLOY SE NÃO TIVER ID
        // Remova esse IF e coloque o priceId real no line_items
        if (!process.env.STRIPE_SECRET_KEY) {
             return { url: `${domain}/dashboard?mock_success=true` };
        }
    }

    try {
        const session = await stripe.checkout.sessions.create(sessionData);
        return { url: session.url };
    } catch (error) {
        console.error("Stripe Error:", error);
        return { url: `${domain}/dashboard?error=stripe_error` };
    }
});

exports.stripeWebhook = onRequest(async (request, response) => {
    const sig = request.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
        event = stripe.webhooks.constructEvent(request.rawBody, sig, endpointSecret);
    } catch (err) {
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { userId, type, coinsAmount, subTier } = session.metadata;

        if (type === 'coin_pack') {
            const qtd = parseInt(coinsAmount);
            await db.collection('usuarios').doc(userId).update({
                coins: FieldValue.increment(qtd)
            });
            await db.collection('transactions').add({
                userId, type: 'buy_coins', amount: qtd, cost: session.amount_total, date: FieldValue.serverTimestamp()
            });
        } 
        else if (type === 'subscription') {
            let updateData = {
                subscriptionStatus: 'active',
                subscriptionType: subTier,
                stripeSubId: session.subscription
            };
            if (subTier === 'author') {
                 const userDoc = await db.collection('usuarios').doc(userId).get();
                 if (!userDoc.data().referralCode) {
                     updateData.referralCode = `REF-${userId.substring(0,5).toUpperCase()}`;
                 }
            }
            await db.collection('usuarios').doc(userId).update(updateData);
        }
    }
    response.json({ received: true });
});