import React from 'react';
import { CloseIcon } from './icons/CloseIcon';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="relative max-w-5xl max-h-full"
        onClick={(e) => e.stopPropagation()} 
      >
        <img 
          src={imageUrl} 
          alt="Zoomed-in view" 
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
        <button
          onClick={onClose}
          className="absolute -top-5 -right-5 bg-white rounded-full p-2 text-gray-800 hover:bg-gray-200 transition-colors z-10 shadow-lg"
          aria-label="Close image view"
        >
          <div className="w-6 h-6"><CloseIcon /></div>
        </button>
      </div>
    </div>
  );
};

export default ImageModal;
