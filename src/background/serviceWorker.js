const API_TOKEN = import.meta.env.VITE_HF_ACCESS_TOKEN;

async function queryHF(modelId, payload) {
  const url = `https://router.huggingface.co/hf-inference/models/${modelId}`;
  const response = await fetch(url, {
    headers: { 
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json" 
    },
    method: "POST",
    body: JSON.stringify({ ...payload, options: { wait_for_model: true } }),
  });

  if (response.status === 503) throw new Error("Model loading");
  return await response.json();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HF_SUMMARIZE') {
    queryHF("sshleifer/distilbart-cnn-12-6", { inputs: message.text })
      .then(data => sendResponse({ ok: true, data: data[0].summary_text }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === 'HF_ASK') {
    queryHF("deepset/roberta-base-squad2", { 
      inputs: { question: message.question, context: message.context } 
    })
      .then(data => sendResponse({ ok: true, data: data.answer }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});