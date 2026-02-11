export const prepareImageForOCR = async (imageSrc) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // important for external images
    img.src = imageSrc;

    img.onload = () => {
      const scale = 2; // try 2 first
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = reject;
  });
};
