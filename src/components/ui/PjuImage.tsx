import React, { useEffect, useState } from 'react';
import { getUrlFotoPJU } from '../../services/stor';
import { Image as ImageIcon } from 'lucide-react';

interface PjuImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fotoId: string;
}

const PjuImage: React.FC<PjuImageProps> = ({ fotoId, className, alt, ...props }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    
    // Reset state when fotoId changes
    setSrc(null);
    setLoading(true);
    setError(false);

    if (!fotoId) {
      setLoading(false);
      setError(true);
      return;
    }

    const loadFoto = async () => {
      try {
        const url = await getUrlFotoPJU(fotoId);
        if (isMounted) {
          setSrc(url);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadFoto();

    return () => {
      isMounted = false;
    };
  }, [fotoId]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-slate-800/50 animate-pulse ${className}`}>
        <ImageIcon className="text-slate-600 w-8 h-8 opacity-50" />
      </div>
    );
  }

  if (error || !src) {
    // Return null or empty space to trigger normal error handling/fallback
    return <div className={`hidden ${className}`} />;
  }

  return (
    <img
      src={src}
      className={className}
      alt={alt || "Foto PJU"}
      {...props}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};

export default PjuImage;
