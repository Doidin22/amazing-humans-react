const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, onRequest } = require("firebase-functions/v2/https");
const { onDocumentWritten, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// --- CONFIGURAÇÃO DO STRIPE ---
// A chave agora é carregada de forma segura do arquivo .env
const STRIPE_KEY = process.env.STRIPE_KEY; 
const stripe = require('stripe')(STRIPE_KEY);
const ENDPOINT_SECRET = "whsec_SEU_SEGREDO_AQUI"; 

initializeApp();
const db = getFirestore();

// --- 1. REAL PAYMENT (STRIPE) ---
exports.createStripeCheckout = onCall(async (request) => {
    if (!request.auth) return { url: null, error: "Login required." };
    
    const uid = request.auth.uid;
    const { amountDollars } = request.data; 
    
    if (!amountDollars || amountDollars <= 0) return { error: "Invalid amount." };

    const coinsToAdd = amountDollars * 10;

    try {
        // Get origin URL to know where to return
        const baseUrl = request.rawRequest.headers.origin || 'http://localhost:5173';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'paypal'], 
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `${coinsToAdd} Amazing Coins`,
                        description: 'Virtual currency for Amazing Humans',
                    },
                    unit_amount: amountDollars * 100, // Cents
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${baseUrl}/perfil?success=true`,
            cancel_url: `${baseUrl}/perfil?canceled=true`,
            metadata: {
                userId: uid,
                coins: coinsToAdd.toString()
            }
        });

        return { url: session.url };
    } catch (error) {
        console.error("Stripe Error:", error);
        return { error: error.message };
    }
});

// Webhook to confirm payment and deliver coins
exports.stripeWebhook = onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        if (ENDPOINT_SECRET.includes("YOUR_SECRET")) {
             event = req.body; 
        } else {
             event = stripe.webhooks.constructEvent(req.rawBody, sig, ENDPOINT_SECRET);
        }
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const coins = parseInt(session.metadata.coins);

        if (userId && coins) {
            const userRef = db.collection('usuarios').doc(userId);
            await db.runTransaction(async (t) => {
                t.update(userRef, { coins: FieldValue.increment(coins) });
                const receiptRef = db.collection('compras').doc(session.id);
                t.set(receiptRef, {
                    userId: userId,
                    amount: session.amount_total / 100,
                    coins: coins,
                    status: 'paid',
                    date: FieldValue.serverTimestamp()
                });
            });
        }
    }
    res.status(200).send({ received: true });
});

// --- 2. VOTE (With Security Rules) ---
exports.voteStory = onCall(async (request) => {
    if (!request.auth) return { success: false, message: "Login required." };

    const uid = request.auth.uid;
    const { obraId, amountCoins } = request.data;
    const coinsToDonate = parseInt(amountCoins);

    if (!coinsToDonate || coinsToDonate < 1) return { success: false, message: "Invalid amount." };

    // Rule A: Rating (Stars)
    const ratingSnap = await db.collection('avaliacoes').doc(`${obraId}_${uid}`).get();
    if (!ratingSnap.exists) return { success: false, message: "You must rate this story with stars before voting." };

    // Rule B: Minimum 15 Chapters
    const qViews = db.collection('visualizacoes_capitulos').where('userId', '==', uid).where('obraId', '==', obraId).count();
    const countSnap = await qViews.get();
    if (countSnap.data().count < 15) return { success: false, message: `Read at least 15 chapters to vote. (You read ${countSnap.data().count})` };

    const userRef = db.collection('usuarios').doc(uid);
    const bookRef = db.collection('obras').doc(obraId);

    try {
        return await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            const bookDoc = await t.get(bookRef);

            if (!userDoc.exists || !bookDoc.exists) throw new Error("Not found.");

            // Rule C: Self-Voting
            if (bookDoc.data().autorId === uid) throw new Error("Cannot vote on your own story.");

            // Rule D: Fanfic
            const cats = (bookDoc.data().categorias || []).map(c => c.toLowerCase());
            const tags = (bookDoc.data().tags || []).map(tag => tag.toLowerCase());
            if (cats.includes('fanfic') || tags.includes('fanfic')) throw new Error("Fanfics cannot be monetized.");

            if ((userDoc.data().coins || 0) < coinsToDonate) throw new Error("Insufficient coins.");

            t.update(userRef, { coins: FieldValue.increment(-coinsToDonate) });
            t.update(bookRef, { 
                monthly_coins: FieldValue.increment(coinsToDonate),
                total_coins: FieldValue.increment(coinsToDonate)
            });

            return { success: true };
        });
    } catch (error) { return { success: false, message: error.message }; }
});

// --- 3. LEVELS ---
exports.levelUp = onCall(async (request) => {
    if (!request.auth) return { success: false, message: "Login required." };
    const uid = request.auth.uid;
    const levelsToBuy = request.data.levels || 1;
    const cost = levelsToBuy * 100;
    const userRef = db.collection('usuarios').doc(uid);

    try {
        return await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            const currentCoins = userDoc.data().coins || 0;
            if (currentCoins < cost) throw new Error("Insufficient coins.");
            
            const newLevel = (userDoc.data().level || 0) + levelsToBuy;
            t.update(userRef, {
                coins: FieldValue.increment(-cost),
                level: newLevel,
                isAdFree: newLevel >= 100
            });
            return { success: true, newLevel };
        });
    } catch (error) { return { success: false, message: error.message }; }
});

// --- 4. ANALYTICS & OTHERS ---
exports.registerReading = onCall(async (request) => {
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
    const data = event.data.after.data();
    if (!data) return;
    const snapshot = await db.collection("avaliacoes").where("obraId", "==", data.obraId).get();
    let soma = 0, total = 0;
    snapshot.forEach(d => { soma += d.data().rating; total++; });
    return db.collection("obras").doc(data.obraId).update({ rating: total ? soma/total : 0, votes: total });
});

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

// --- 5. MONTHLY LOTTERY ---
exports.enterLottery = onCall(async (request) => {
    if (!request.auth) return { success: false, message: "Login required." };
    const uid = request.auth.uid;

    const userRef = db.collection('usuarios').doc(uid);
    // We use a "state" document to control the current round
    const lotteryStateRef = db.collection('stats').doc('lottery_state'); 

    // 1. Reading and Rating Rules (KEPT)
    const ratingsSnap = await db.collection('avaliacoes').where('userId', '==', uid).limit(5).get();
    if (ratingsSnap.size < 5) return { success: false, message: `Rate at least 5 stories first.` };

    const booksEvaluated = ratingsSnap.docs.map(doc => doc.data().obraId);
    for (const bookId of booksEvaluated) {
        const viewSnap = await db.collection('visualizacoes_capitulos')
            .where('userId', '==', uid).where('obraId', '==', bookId).count().get();
        if (viewSnap.data().count < 15) return { success: false, message: `You haven't read 15 chapters of one of the stories you rated.` };
    }

    try {
        return await db.runTransaction(async (t) => {
            // Get current lottery state (Round and Count)
            const stateDoc = await t.get(lotteryStateRef);
            let currentRound = 1;
            let currentCount = 0;
            let currentPool = 0;

            if (stateDoc.exists) {
                const data = stateDoc.data();
                currentRound = data.current_round || 1;
                currentCount = data.participants_count || 0;
                currentPool = data.pool || 0;
            }

            // Check if user already participated in THIS round
            const participantRef = lotteryStateRef.collection(`round_${currentRound}`).doc(uid);
            const pDoc = await t.get(participantRef);
            if (pDoc.exists) throw new Error("You are already in this month's draw!");

            // Check Balance
            const userDoc = await t.get(userRef);
            if ((userDoc.data().coins || 0) < 10) throw new Error("Insufficient coins (10 required).");

            // --- THE MAGIC: Generate Sequential Ticket ---
            const myTicketNumber = currentCount + 1;

            // Execute Transaction
            t.update(userRef, { coins: FieldValue.increment(-10) });
            
            // Update Global State
            t.set(lotteryStateRef, { 
                current_round: currentRound,
                pool: currentPool + 10,
                participants_count: myTicketNumber // New total
            }, { merge: true });

            // Save Participant with Ticket
            t.set(participantRef, {
                userId: uid,
                userName: userDoc.data().nome || "User",
                ticketNumber: myTicketNumber,
                joinedAt: FieldValue.serverTimestamp()
            });

            return { success: true, ticket: myTicketNumber };
        });
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// --- AUTOMATED LOTTERY DRAW (CRON JOB) ---
// Runs every 1st of the month at 00:00 (Default UTC timezone, adjustable)
exports.runMonthlyLottery = onSchedule("0 0 1 * *", async (event) => {
    const db = getFirestore();
    const stateRef = db.collection('stats').doc('lottery_state');

    try {
        await db.runTransaction(async (t) => {
            const stateDoc = await t.get(stateRef);
            if (!stateDoc.exists) return;

            const data = stateDoc.data();
            const round = data.current_round || 1;
            const count = data.participants_count || 0;
            const pool = data.pool || 0;

            if (count === 0) {
                console.log("Lottery cancelled: No participants.");
                return;
            }

            // 1. DRAW: Choose a number between 1 and 'count'
            const winningTicket = Math.floor(Math.random() * count) + 1;

            console.log(`Round ${round}: Drawing between 1 and ${count}. Winner: Ticket ${winningTicket}`);

            // 2. Find ticket owner
            const participantsRef = stateRef.collection(`round_${round}`);
            const winnerQuery = await participantsRef.where('ticketNumber', '==', winningTicket).limit(1).get();

            if (winnerQuery.empty) {
                console.error("Critical Error: Winning ticket not found!");
                return;
            }

            const winnerDoc = winnerQuery.docs[0];
            const winnerId = winnerDoc.data().userId;
            const prize = Math.floor(pool * 0.5); // 50% of the pool

            // 3. Pay the Winner
            const winnerUserRef = db.collection('usuarios').doc(winnerId);
            t.update(winnerUserRef, { 
                coins: FieldValue.increment(prize),
                notificacoes: FieldValue.arrayUnion({
                    titulo: "🎉 YOU WON THE LOTTERY!",
                    mensagem: `Congratulations! Ticket #${winningTicket} won ${prize} coins!`,
                    lida: false,
                    data: new Date()
                })
            });

            // 4. Save Winner History
            const historyRef = db.collection('stats').doc('lottery_history').collection('winners').doc(`round_${round}`);
            t.set(historyRef, {
                round: round,
                winnerId: winnerId,
                winnerName: winnerDoc.data().userName,
                prize: prize,
                total_pool: pool,
                total_participants: count,
                date: FieldValue.serverTimestamp()
            });

            // 5. Start New Round (Reset counters, increment round)
            t.update(stateRef, {
                current_round: round + 1,
                pool: 0,
                participants_count: 0
            });
        });
        
        console.log("Lottery finished successfully.");
    } catch (error) {
        console.error("Error in Lottery Cron Job:", error);
    }
});