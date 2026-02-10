import { HfInference } from "@huggingface/inference";

// Note: Vite requires VITE_ prefix for env variables
const HF_TOKEN = import.meta.env.VITE_HF_ACCESS_TOKEN;
export const hf = new HfInference(HF_TOKEN);