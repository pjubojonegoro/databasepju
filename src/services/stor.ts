const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "db08wurru";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Upload foto PJU ke Cloudinary (menggunakan Unsigned Upload)
 * @param file Objek File dari input
 * @returns Object berisi key (fotoId)
 */
export async function uploadFotoPJU(file: File, retryCount = 0): Promise<{ key: string, id?: string }> {
  try {
    if (!CLOUDINARY_UPLOAD_PRESET) {
      throw new Error("VITE_CLOUDINARY_UPLOAD_PRESET belum diatur di file .env");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (response.status === 429 && retryCount < 5) {
      console.warn("Rate limit hit during upload. Waiting 5 seconds...");
      await delay(5000);
      return uploadFotoPJU(file, retryCount + 1);
    }

    if (!response.ok) {
      let errMessage = "Gagal mengunggah foto ke Cloudinary";
      try {
        const err = await response.json();
        errMessage = err.error?.message || errMessage;
      } catch (e) {
        // ignore
      }
      throw new Error(errMessage);
    }

    const uploadData = await response.json();

    // uploadData.public_id is what we want to save
    return { key: uploadData.public_id, id: uploadData.public_id };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
}

/**
 * Mendapatkan URL untuk menampilkan foto yang sudah diunggah
 * @param fotoId ID Foto atau Key
 */
export async function getUrlFotoPJU(fotoId: string): Promise<string> {
  // Jika URL berupa external link biasa (misal dari data lama)
  if (fotoId.startsWith("http")) {
    return fotoId;
  }

  // Tangkal string lama di DB seperti "DS. WEDI 3B3.jpg", karena ID sesungguhnya berupa Base62 string atau public_id
  // Maka, fotoId yang mengandung titik (.) atau spasi akan dikembalikan kosong (belum migrasi)
  if (fotoId.includes(".") || fotoId.includes(" ")) {
    return "";
  }

  if (!fotoId) {
    return "";
  }

  // Generate Cloudinary URL based on public_id
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${fotoId}`;
}
