const { onDocumentWritten, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// --- CONFIGURAÇÃO DO STRIPE ---
// Chave de Teste
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// ======================================================
// 1. ANALYTICS & SISTEMA (Funções Antigas)
// ======================================================

exports.registerReading = onCall({ cors: true }, async (request) => {
    if (!request.auth) return { success: false };
    const { obraId, capituloId } = request.data;
    const uid = request.auth.uid;
    const viewRef = db.collection('visualizacoes_capitulos').doc(`${uid}_${capituloId}`);
    
    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(viewRef);
            if(doc.exists()) return;
            
            t.set(viewRef, { userId: uid, obraId, capituloId, data: FieldValue.serverTimestamp() });
            t.update(db.collection('obras').doc(obraId), { views: FieldValue.increment(1) });
            t.update(db.collection('usuarios').doc(uid), { contador_leituras: FieldValue.increment(1) });
        });
        return { success: true };
    } catch(e) { return { success: false }; }
});

exports.updateBookRating = onDocumentWritten("avaliacoes/{docId}", async (event) => {
    const data = event.data?.after?.data();
    if (!data) return;
    const snapshot = await db.collection("avaliacoes").where("obraId", "==", data.obraId).get();
    let soma = 0, total = 0;
    snapshot.forEach(d => { soma += d.data().rating; total++; });
    return db.collection("obras").doc(data.obraId).update({ rating: total ? soma/total : 0, votes: total });
});

exports.grantFounderBadge = onDocumentCreated("obras/{obraId}", async (event) => {
    const data = event.data?.data();
    if(!data) return;
    const autorId = data.autorId;
    if(!autorId) return;
    
    const statsRef = db.collection('stats').doc('authors_counter');
    await db.runTransaction(async (t) => {
        const stats = await t.get(statsRef);
        const count = stats.exists ? stats.data().count : 0;
        if(count >= 100) return;
        const userRef = db.collection('usuarios').doc(autorId);
        const user = await t.get(userRef);
        if(user.data().badges?.includes('pioneer')) return;
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

// ======================================================
// 2. PAGAMENTOS STRIPE (Funções Novas)
// ======================================================

// Cria o link de pagamento
exports.createStripeCheckout = onCall({ cors: true }, async (request) => {
  logger.info("Function createStripeCheckout called.");

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { type, docId, amount, successUrl, cancelUrl } = request.data;
  const userId = request.auth.uid;
  const userEmail = request.auth.token.email;

  logger.info(`Starting checkout for user: ${userId}, type: ${type}`);

  try {
    let sessionData = {
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: userEmail,
      client_reference_id: userId,
      metadata: { type, docId, userId },
      line_items: []
    };

    if (type === 'ad') {
      sessionData.line_items.push({
        price_data: {
          currency: 'brl',
          product_data: { name: 'Ad Campaign', description: `Campaign ID: ${docId}` },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      });
    } else if (type === 'vip') {
        sessionData.line_items.push({
          price_data: {
            currency: 'brl',
            product_data: { name: 'VIP Premium Upgrade', description: '60 Days Access + Badges' },
            unit_amount: 200,
          },
          quantity: 1,
        });
    }

    const session = await stripe.checkout.sessions.create(sessionData);
    logger.info("Session created successfully:", session.id);
    return { url: session.url };

  } catch (error) {
    logger.error("Stripe Error:", error);
    throw new HttpsError('internal', `Stripe Failed: ${error.message}`);
  }
});

// Webhook para ativar o VIP/Anúncio
exports.stripeWebhook = onRequest(async (request, response) => {
  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.rawBody, sig, endpointSecret);
  } catch (err) {
    logger.error("Webhook Error:", err.message);
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { type, docId, userId } = session.metadata;

    logger.info("Payment approved:", session.id);

    try {
        if (type === 'vip') {
            const vipUntil = new Date();
            vipUntil.setDate(vipUntil.getDate() + 60);

            await db.collection('usuarios').doc(userId).update({
                isVip: true,
                vipUntil: Timestamp.fromDate(vipUntil),
                badges: FieldValue.arrayUnion('vip_gold')
            });
            logger.info(`VIP activated for user: ${userId}`);
        }
        else if (type === 'ad') {
            await db.collection('anuncios').doc(docId).update({
                status: 'active',
                paymentId: session.payment_intent
            });
            logger.info(`Ad activated: ${docId}`);
        }

    } catch (error) {
        logger.error("Error releasing benefit:", error);
    }
  }

  response.json({received: true});
});