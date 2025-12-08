const { onDocumentWritten, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// --- ANALYTICS & OTHERS ---

// Registra leitura e incrementa contadores
exports.registerReading = onCall(async (request) => {
    if (!request.auth) return { success: false };
    const { obraId, capituloId } = request.data;
    const uid = request.auth.uid;
    const viewRef = db.collection('visualizacoes_capitulos').doc(`${uid}_${capituloId}`);
    
    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(viewRef);
            if(doc.exists()) return;
            
            // Registra que o usuário leu este capitulo
            t.set(viewRef, { userId: uid, obraId, capituloId, data: FieldValue.serverTimestamp() });
            
            // Incrementa view na obra
            t.update(db.collection('obras').doc(obraId), { views: FieldValue.increment(1) });
            
            // Incrementa contador pessoal do usuário (para badges/stats simples)
            t.update(db.collection('usuarios').doc(uid), { contador_leituras: FieldValue.increment(1) });
        });
        return { success: true };
    } catch(e) { return { success: false }; }
});

// Atualiza a média de estrelas (Rating) quando uma avaliação é feita
exports.updateBookRating = onDocumentWritten("avaliacoes/{docId}", async (event) => {
    const data = event.data.after.data();
    if (!data) return;
    const snapshot = await db.collection("avaliacoes").where("obraId", "==", data.obraId).get();
    let soma = 0, total = 0;
    snapshot.forEach(d => { soma += d.data().rating; total++; });
    return db.collection("obras").doc(data.obraId).update({ rating: total ? soma/total : 0, votes: total });
});

// Dá o badge de "Pioneer" para os primeiros 100 autores
exports.grantFounderBadge = onDocumentCreated("obras/{obraId}", async (event) => {
    const autorId = event.data.data().autorId;
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

// Atualiza contadores de seguidores
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