import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateThumbnailImage } from '../services/geminiService';
import { ImageHistoryItem } from '../types';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { ImageIcon } from './icons/ImageIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { TrashIcon } from './icons/TrashIcon';
import ImageModal from './ImageModal';
import { UploadIcon } from './icons/UploadIcon';
import { CloseIcon } from './icons/CloseIcon';

const MAX_IMAGES = 3;

const ImageUploadGallery: React.FC<{
  images: string[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  title: string;
  subtitle: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  isDisabled: boolean;
}> = ({ images, onUpload, onRemove, title, subtitle, fileInputRef, isDisabled }) => (
  <div className="space-y-2">
    <label className="font-semibold text-gray-700">{title} ({images.length}/{MAX_IMAGES})</label>
    <div className="w-full min-h-[10rem] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center relative p-2">
      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 w-full">
          {images.map((img, index) => (
            <div key={index} className="relative aspect-square">
              <img src={img} alt={`Preview ${index}`} className="h-full w-full object-cover rounded-md" />
              <button
                onClick={() => onRemove(index)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80 transition"
                aria-label={`Remove image ${index + 1}`}
              >
                <div className="w-4 h-4"><CloseIcon /></div>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center">
          <div className="w-10 h-10 mx-auto text-gray-400"><UploadIcon /></div>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
      )}
      {images.length < MAX_IMAGES && (
         <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={onUpload}
            disabled={isDisabled}
            multiple
          />
      )}
    </div>
  </div>
);


const ImageGenerator: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [customElementsImages, setCustomElementsImages] = useState<string[]>([]);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImageHistoryItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const refFileInputRef = useRef<HTMLInputElement>(null);
  const elementFileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('imageHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to parse image history from localStorage", e);
      setHistory([]);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() && referenceImages.length === 0 && customElementsImages.length === 0) {
      setError("Please enter a prompt or upload at least one image.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setOutput(null);
    try {
      const result = await generateThumbnailImage(prompt, referenceImages, customElementsImages);
      setOutput(result);

      if (result.startsWith('data:image')) {
        const newItem: ImageHistoryItem = {
          id: Date.now(),
          prompt: prompt || "Image-based generation",
          imageSrc: result,
          referenceImages: referenceImages,
          customElementsImages: customElementsImages,
          timestamp: new Date().toLocaleString(),
        };
        
        const updatedHistory = [newItem, ...history];
        setHistory(updatedHistory);
        localStorage.setItem('imageHistory', JSON.stringify(updatedHistory));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, referenceImages, customElementsImages, history]);
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGenerate();
    }
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setImages: React.Dispatch<React.SetStateAction<string[]>>) => {
    const files = e.target.files;
    if (files) {
        let currentImages: string[] = [];
        let processingCount = 0;
        let errorShown = false;

        const allFiles = Array.from(files);
        const filesToProcess = allFiles.slice(0, MAX_IMAGES - (images => images.length)(setImages === setReferenceImages ? referenceImages : customElementsImages));

        if (allFiles.length > filesToProcess.length) {
          setError(`You can only upload up to ${MAX_IMAGES} images in total.`);
        }

        if (filesToProcess.length === 0) {
            if (e.target) e.target.value = '';
            return;
        }

        filesToProcess.forEach(file => {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                if (!errorShown) {
                    setError("Image size should not exceed 4MB.");
                    errorShown = true;
                }
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                currentImages.push(reader.result as string);
                processingCount++;
                if (processingCount === filesToProcess.length) {
                    setImages(prev => [...prev, ...currentImages]);
                }
            };
            reader.onerror = () => {
                processingCount++;
                setError("Failed to read an image file.");
            };
            reader.readAsDataURL(file);
        });
        
        if (e.target) e.target.value = '';
    }
};

  const handleRemoveImage = (index: number, setImages: React.Dispatch<React.SetStateAction<string[]>>) => {
      setImages(prev => prev.filter((_, i) => i !== index));
  };

  const isImageUrl = (str: string | null): str is string => str?.startsWith('data:image') ?? false;

  const handleDownload = (imageSrc: string, prompt: string) => {
    const link = document.createElement('a');
    link.href = imageSrc;
    const safePrompt = prompt.replace(/[^a-z0-9]/gi, '_').slice(0, 30);
    link.download = `thumbnail_${safePrompt || 'generated'}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteFromHistory = (id: number) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('imageHistory', JSON.stringify(updatedHistory));
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col space-y-6">
      <div className="p-6 bg-white rounded-xl shadow-md space-y-4">
        <h1 className="text-3xl font-bold text-gray-800">Image Generator</h1>
        <p className="text-gray-600">
          Create a 16:9 thumbnail. Use up to {MAX_IMAGES} reference images for style and upload up to {MAX_IMAGES} custom elements (e.g., a face) to include in the scene.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImageUploadGallery
            images={referenceImages}
            onUpload={(e) => handleImageUpload(e, setReferenceImages)}
            onRemove={(index) => handleRemoveImage(index, setReferenceImages)}
            title="Reference Images (for Style)"
            subtitle="Upload for style (Max 4MB)"
            fileInputRef={refFileInputRef}
            isDisabled={isLoading}
          />
          <ImageUploadGallery
            images={customElementsImages}
            onUpload={(e) => handleImageUpload(e, setCustomElementsImages)}
            onRemove={(index) => handleRemoveImage(index, setCustomElementsImages)}
            title="Custom Elements (to Include)"
            subtitle="Upload face, logo, etc."
            fileInputRef={elementFileInputRef}
            isDisabled={isLoading}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the scene for your thumbnail..."
            className="flex-grow px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-all duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                Generating...
              </>
            ) : (
              'Generate Image'
            )}
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

      <div className="bg-white rounded-xl shadow-md flex items-center justify-center p-4">
        <div className="relative w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden">
          {output ? (
            isImageUrl(output) ? (
              <>
                <img 
                  src={output} 
                  alt="Generated thumbnail" 
                  className="w-full h-full object-cover cursor-zoom-in" 
                  onClick={() => setSelectedImage(output)}
                />
                <button
                  onClick={() => handleDownload(output, prompt)}
                  className="absolute top-3 right-3 bg-white/70 backdrop-blur-sm text-gray-900 p-2 rounded-full hover:bg-white transition-all shadow-md"
                  aria-label="Download generated image"
                >
                  <div className="w-5 h-5"><DownloadIcon /></div>
                </button>
              </>
            ) : (
              <p className="text-gray-700 text-lg font-medium p-4 text-center">{output}</p>
            )
          ) : (
             <div className="text-center text-gray-400">
              <div className="w-16 h-16 mx-auto text-gray-300"><ImageIcon /></div>
              <p className="mt-2">Your 16:9 generated image will appear here.</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-grow p-6 bg-white rounded-xl shadow-md flex flex-col min-h-0">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Image History</h2>
        <div className="overflow-y-auto flex-grow -mr-6 pr-6">
          {history.length > 0 ? (
            <ul className="space-y-4">
              {history.map(item => (
                <li key={item.id} className="p-4 border border-gray-200 rounded-lg group flex flex-col sm:flex-row items-start gap-4">
                  <img 
                    src={item.imageSrc} 
                    alt={item.prompt} 
                    className="w-full sm:w-32 h-auto sm:h-20 aspect-video object-cover rounded-md cursor-zoom-in flex-shrink-0"
                    onClick={() => setSelectedImage(item.imageSrc)}
                  />
                  <div className="flex-grow w-full">
                    <p className="text-gray-800 text-sm mb-2 font-medium break-words">{item.prompt}</p>
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      {item.referenceImages.map((img, idx) => <img key={`ref-${idx}`} src={img} alt="Ref" className="w-10 h-10 object-cover rounded border" title="Reference Image" />)}
                      {item.customElementsImages.map((img, idx) => <img key={`elem-${idx}`} src={img} alt="Elem" className="w-10 h-10 object-cover rounded border" title="Custom Element Image" />)}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{item.timestamp}</span>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleDownload(item.imageSrc, item.prompt)}
                          className="p-1 text-gray-500 hover:text-indigo-600"
                          aria-label="Download image"
                        >
                          <div className="w-4 h-4"><DownloadIcon /></div>
                        </button>
                        <button 
                          onClick={() => handleDeleteFromHistory(item.id)}
                          className="p-1 text-gray-500 hover:text-red-600"
                          aria-label="Delete image"
                        >
                          <div className="w-4 h-4"><TrashIcon /></div>
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex-grow flex items-center justify-center text-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
              <p>Your generated images will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {selectedImage && (
        <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </div>
  );
};

export default ImageGenerator;