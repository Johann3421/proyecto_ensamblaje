export async function compressImageToOptimized(source, maxWidth = 1280, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const processImage = (img) => {
      try {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL("image/webp", quality);
        if (!dataUrl || !dataUrl.startsWith("data:image/webp")) {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    if (typeof source === "string") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => processImage(img);
      img.onerror = () => reject(new Error("No se pudo procesar la imagen capturada"));
      img.src = source;
    } else if (source instanceof File || source instanceof Blob) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => processImage(img);
        img.onerror = () => reject(new Error("No se pudo cargar el archivo"));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Error leyendo el archivo"));
      reader.readAsDataURL(source);
    } else {
      reject(new Error("Formato de imagen no soportado"));
    }
  });
}
