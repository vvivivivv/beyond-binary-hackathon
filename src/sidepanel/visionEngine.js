import { pipeline, env } from '@xenova/transformers';

// --- TOTAL ISOLATION CONFIG ---
env.allowLocalModels = false;
env.useBrowserCache = true;
env.remoteHost = 'https://huggingface.co';

let captionerPromise = null;

export async function getLocalDescription(imageUri) {
    try {
        if (!captionerPromise) {
            console.log("📥 Vision Engine: Initializing AI Model...");
            
            const modelId = 'Xenova/vit-gpt2-image-captioning';

            captionerPromise = pipeline('image-to-text', modelId, {
                fetch_callback: async (url, options) => {
                    const cleanOptions = {
                        method: 'GET',
                        credentials: 'omit', // DO NOT send HF cookies/session
                        mode: 'cors',
                        cache: 'force-cache',
                        headers: new Headers({
                            'Accept': 'application/json, text/plain, */*'
                            // Notice: No Authorization header allowed here.
                        })
                    };

                    const response = await fetch(url, cleanOptions);
                    
                    if (!response.ok) {
                        if (response.status === 401) {
                            throw new Error("Hugging Face is still blocking this IP/Session. Try logging out of HF in your main browser.");
                        }
                    }
                    return response;
                }
            });
        }
        
        const captioner = await captionerPromise;
        const output = await captioner(imageUri, {
            max_new_tokens: 35,
        });
        
        const result = output[0].generated_text;
        console.log("🤖 Semantic Result:", result);
        return result;
        
    } catch (error) {
        console.error("AI Model Error:", error);
        captionerPromise = null; // Allow retry on failure
        return "Analysis failed: " + (error.message.includes('401') ? "Auth Conflict" : "Connection Error");
    }
}


