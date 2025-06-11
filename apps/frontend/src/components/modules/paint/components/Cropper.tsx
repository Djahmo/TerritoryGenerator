import React, { useState, useEffect, useRef } from 'react';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Modal from '../../../ui/Modal';
import { useApiConfig } from '@/hooks/useApiConfig';

interface CropperProps {
  src: string;
  open: boolean;
  onClose: () => void;
  onApply?: (cropData: {
    x: number;
    y: number;
    width: number;
    height: number;
    imageWidth: number;
    imageHeight: number;
  }) => void;
  isLoading?: boolean;
}

const Cropper: React.FC<CropperProps> = ({ src, open, onClose, onApply, isLoading = false }) => {
  const { config } = useApiConfig();

  const [crop, setCrop] = useState<Crop>({
    unit: 'px',
    width: 50,
    height: 50,
    x: 25,
    y: 25,
  });
  const [displaySrc, setDisplaySrc] = useState(src);
  const [aspect, setAspect] = useState(1);
  const [originalAspect, setOriginalAspect] = useState(1);
  const [isAspectFlipped, setIsAspectFlipped] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!src || !config) return;
    const img = new Image();
    img.onload = () => {      // 🎯 UTILISER LE RATIO DE LA CONFIG LARGE au lieu du ratio de l'image
      const configAspectRatio = config.largeRatioX / config.largeRatioY;

      setOriginalAspect(configAspectRatio);
      setAspect(configAspectRatio);
      setIsAspectFlipped(false);
      setImageDimensions({ width: img.width, height: img.height });
    };
    img.src = src;
    setDisplaySrc(src);
  }, [src, config]);

  const handleFlipAspect = () => {
    const newFlippedState = !isAspectFlipped;
    setIsAspectFlipped(newFlippedState);
    setAspect(newFlippedState ? 1 / originalAspect : originalAspect);
  };

  const handleApplyCrop = () => {
    if (onApply && crop.width && crop.height && imgRef.current && imageDimensions.width && imageDimensions.height) {      const displayedWidth = imgRef.current.clientWidth;
      const displayedHeight = imgRef.current.clientHeight;

      const cropData = {
        x: (crop.x || 0) / displayedWidth,
        y: (crop.y || 0) / displayedHeight,
        width: crop.width / displayedWidth,
        height: crop.height / displayedHeight,
        imageWidth: imageDimensions.width,
        imageHeight: imageDimensions.height
      };

      onApply(cropData);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-4xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Rogner l'image</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="mb-6 flex justify-center">
          <ReactCrop
            crop={crop}
            onChange={c => setCrop(c)}
            aspect={aspect}
            className="max-w-full max-h-[60vh] object-contain"
          >
            <img
              ref={imgRef}
              src={displaySrc}
              alt="Image à rogner"
              className="max-w-full max-h-[60vh] object-contain"
            />
          </ReactCrop>
        </div>

        <div className="mb-4 flex justify-center">
          <button
            onClick={handleFlipAspect}
            className="btn-neutral flex items-center gap-2"
            disabled={isLoading}
            title={isAspectFlipped ? "Revenir au ratio original" : "Inverser le ratio d'aspect"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 2H9v4h6V2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="m10 15 2-2 2 2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {isAspectFlipped ? "Revenir au ratio original" : "Inverser le ratio"}
          </button>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-neutral"
            disabled={isLoading}
          >
            Annuler
          </button>
          <button
            onClick={handleApplyCrop}
            className="btn-success"
            disabled={isLoading || !crop.width || !crop.height}
          >
            {isLoading ? (
              <>
                <div className="animate-spin mr-2">⟳</div>
                Application...
              </>
            ) : (
              'Appliquer'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default Cropper;
