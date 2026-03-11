export function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export async function commitBatchedWriteOperations<T>(
  db: FirebaseFirestore.Firestore,
  operations: T[],
  batchSize: number,
  applyOperation: (batch: FirebaseFirestore.WriteBatch, operation: T) => void
) {
  const operationChunks = chunkItems(operations, batchSize);

  for (const operationChunk of operationChunks) {
    const batch = db.batch();

    operationChunk.forEach((operation) => {
      applyOperation(batch, operation);
    });

    await batch.commit();
  }
}
