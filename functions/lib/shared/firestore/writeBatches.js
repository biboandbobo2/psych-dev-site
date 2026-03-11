export function chunkItems(items, size) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}
export async function commitBatchedWriteOperations(db, operations, batchSize, applyOperation) {
    const operationChunks = chunkItems(operations, batchSize);
    for (const operationChunk of operationChunks) {
        const batch = db.batch();
        operationChunk.forEach((operation) => {
            applyOperation(batch, operation);
        });
        await batch.commit();
    }
}
