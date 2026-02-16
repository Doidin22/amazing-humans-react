const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../functions/index.js');

const codeToAppend = `
// ======================================================
// 5. PROPAGAÇÃO DE DADOS DE USUÁRIO (NOVO)
// ======================================================

exports.onUserUpdate = onDocumentUpdated("usuarios/{userId}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // Verifica se houve mudança em Nome ou Foto
    if (before.nome === after.nome && before.avatar === after.avatar) return;

    const userId = event.params.userId;
    const novoNome = after.nome;
    const novaFoto = after.avatar;

    const batch = db.batch();
    let batchCount = 0;

    // 1. Atualizar Obras
    const obrasSnap = await db.collection('obras').where('autorId', '==', userId).get();
    obrasSnap.forEach(doc => {
        batch.update(doc.ref, { autor: novoNome });
        batchCount++;
    });

    // 2. Atualizar Capítulos
    const capsSnap = await db.collection('capitulos').where('autorId', '==', userId).get();
    capsSnap.forEach(doc => {
        batch.update(doc.ref, { autor: novoNome });
        batchCount++;
    });

    // 3. Atualizar Comentários (Nome e Foto)
    const commentsSnap = await db.collection('comentarios').where('autorId', '==', userId).get();
    commentsSnap.forEach(doc => {
        batch.update(doc.ref, { 
            autorNome: novoNome,
            autorFoto: novaFoto 
        });
        batchCount++;
    });

    // Limite de 500 writes por batch (simplificado, em prod usar paginação se muitos docs)
    if (batchCount > 0) {
        await batch.commit();
        logger.log(\`Propagated user profile update for \${userId} to \${batchCount} documents.\`);
    }
});
`;

fs.appendFileSync(filePath, codeToAppend);
console.log("Successfully appended code to index.js");
