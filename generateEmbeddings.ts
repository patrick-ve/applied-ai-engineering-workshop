import { pipeline, Tensor } from '@huggingface/transformers';

const modelName = 'sentence-transformers/all-MiniLM-L6-v2';

let featureExtractor;

export const generateEmbeddings = async (
  text: string
): Promise<number[]> => {
  if (!featureExtractor) {
    featureExtractor = await pipeline(
      'feature-extraction',
      modelName
    );
  }
  const embeddings: Tensor = await featureExtractor(text, {
    pooling: 'mean',
    normalize: true,
  });

  return Array.from(embeddings.ort_tensor.cpuData);
};
