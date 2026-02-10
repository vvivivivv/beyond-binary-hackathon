
export async function routeHFRequest(hf, payload) {
  const { task, input } = payload

  switch (task) {
    case 'summarize':
      return hf.summarization({
        model: 'facebook/bart-large-cnn',
        inputs: input
      })

    case 'caption':
      return hf.imageToText({
        model: 'Salesforce/blip-image-captioning-base',
        data: input
      })

    default:
      throw new Error('Unknown HF task')
  }
}