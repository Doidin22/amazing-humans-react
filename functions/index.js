const { onDocumentWritten, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Removed global init

// ======================================================
// 1. ANALYTICS & SISTEMA (Funções Mantidas)
// ======================================================

exports.createStripeCheckoutSession = onCall({ cors: true }, async (request) => {
    // Initialize Stripe inside the function to avoid deployment errors if env is missing
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    // MOCK MODE: If no key is provided, return a mock session to allow UI testing
    if (!stripeKey) {
        console.warn("No STRIPE_SECRET_KEY found. Running in MOCK mode.");
        return { sessionId: 'mock_session_12345' };
    }

    const stripe = require('stripe')(stripeKey);

    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The user must be authenticated.');
    }

    const { priceId, successUrl, cancelUrl } = request.data;
    const uid = request.auth.uid;

    if (!priceId) {
        throw new HttpsError('invalid-argument', 'Price ID is required.');
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            client_reference_id: uid, // Associate session with Firebase user ID
            success_url: successUrl,
            cancel_url: cancelUrl,
        });

        return { sessionId: session.id };
    } catch (error) {
        console.error('Stripe error:', error);
        throw new HttpsError('internal', 'Unable to create checkout session.');
    }
});

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
    const autorNome = navData.autor; // Assuming 'autor' field stores the name
    const docId = event.params.docId; // Actually it is event.params.capituloId based on the wildcard

    // Safety check
    if (!autorId) return;

    // 1. Get all followers
    const seguidoresRef = db.collection('seguidores');
    const q = seguidoresRef.where('seguidoId', '==', autorId);

    const followersSnap = await q.get();

    if (followersSnap.empty) {
        console.log(`No followers found for author ${autorId}`);
        return;
    }

    const notificationsBatch = [];

    followersSnap.forEach(docSeguidor => {
        const seguidorData = docSeguidor.data();
        // Prepare notification object
        const newNotif = {
            paraId: seguidorData.seguidorId,
            mensagem: `<strong>${autorNome}</strong> updated "${nomeObra}": ${tituloCap}`,
            tipo: 'chapter',
            linkDestino: `/ler/${snapshot.id}`, // snapshot.id is the chapter ID
            lida: false,
            data: FieldValue.serverTimestamp()
        };
        notificationsBatch.push(newNotif);
    });

    // 2. Batch write notifications (Chunking for > 500 limit)
    const chunkSize = 500;
    const chunks = [];

    for (let i = 0; i < notificationsBatch.length; i += chunkSize) {
        chunks.push(notificationsBatch.slice(i, i + chunkSize));
    }

    console.log(`Processing ${notificationsBatch.length} notifications in ${chunks.length} batches.`);

    const promises = chunks.map(async (chunk) => {
        const batch = db.batch();
        chunk.forEach(notif => {
            const newRef = db.collection('notificacoes').doc();
            batch.set(newRef, notif);
        });
        await batch.commit();
    });

    await Promise.all(promises);
    console.log("All notifications sent successfully.");
});