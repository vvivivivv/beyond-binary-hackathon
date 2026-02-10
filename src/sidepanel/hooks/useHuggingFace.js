export function useHuggingFace() {
  const sendHF = (task, input) =>
    new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'HF_REQUEST',
          payload: { task, input }
        },
        response => {
          if (!response?.ok) reject(response?.error)
          else resolve(response.result)
        }
      )
    })

  return { sendHF }
}