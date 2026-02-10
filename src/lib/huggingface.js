
export const summarizeText = async (text) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'HF_SUMMARIZE', text }, (response) => {
      if (response?.ok) resolve(response.data);
      else reject(response?.error || "Summarization failed");
    });
  });
};

export const askQuestion = async (question, context) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'HF_ASK', question, context }, (response) => {
      if (response?.ok) resolve(response.data);
      else reject(response?.error || "Question failed");
    });
  });
};