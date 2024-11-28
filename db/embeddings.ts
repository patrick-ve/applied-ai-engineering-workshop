import { pipeline, Tensor } from '@huggingface/transformers';

const modelName = 'nomic-ai/nomic-embed-text-v1';

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
