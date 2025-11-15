import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateThumbnailPrompt } from '../services/geminiService';
import { HistoryItem } from '../types';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { CopyIcon } from './icons/CopyIcon';
import { TrashIcon } from './icons/TrashIcon';
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

const PromptGenerator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [customElementsImages, setCustomElementsImages] = useState<string[]>([]);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedHistoryId, setCopiedHistoryId] = useState<number | null>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);
  const elementFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('promptHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to parse history from localStorage", e);
      setHistory([]);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedPrompt('');
    try {
      const prompt = await generateThumbnailPrompt(topic, referenceImages, customElementsImages);
      setGeneratedPrompt(prompt);
      
      const newItem: HistoryItem = {
        id: Date.now(),
        prompt: prompt,
        topic: topic,
        customElementsImages: customElementsImages,
        referenceImages: referenceImages,
        timestamp: new Date().toLocaleString(),
      };
      
      const updatedHistory = [newItem, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('promptHistory', JSON.stringify(updatedHistory));

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [topic, referenceImages, customElementsImages, history]);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setImages: React.Dispatch<React.SetStateAction<string[]>>) => {
    const files = e.target.files;
    if (files) {
        let currentImages: string[] = [];
        let processingCount = 0;
        let errorShown = false;

        const allFiles = Array.from(files);
        const sourceArray = setImages === setReferenceImages ? referenceImages : customElementsImages;
        const filesToProcess = allFiles.slice(0, MAX_IMAGES - sourceArray.length);

        if (allFiles.length > filesToProcess.length) {
          setError(`You can only upload up to ${MAX_IMAGES} images in total for one category.`);
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
                 if (processingCount === filesToProcess.length) {
                    setImages(prev => [...prev, ...currentImages]);
                }
            };
            reader.readAsDataURL(file);
        });
        
        if (e.target) e.target.value = '';
    }
  };


  const handleRemoveImage = (index: number, setImages: React.Dispatch<React.SetStateAction<string[]>>) => {
      setImages(prev => prev.filter((_, i) => i !== index));
  };


  const handleCopyToClipboard = (text: string, id?: number) => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedHistoryId(id);
      setTimeout(() => setCopiedHistoryId(null), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeleteFromHistory = (id: number) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('promptHistory', JSON.stringify(updatedHistory));
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGenerate();
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col space-y-6">
      <div className="p-6 bg-white rounded-xl shadow-md space-y-4">
        <h1 className="text-3xl font-bold text-gray-800">Prompt Generator</h1>
        <p className="text-gray-600">
          Generate a powerful thumbnail prompt. Add a topic, up to {MAX_IMAGES} reference images for style, and up to {MAX_IMAGES} custom elements to include.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImageUploadGallery
                images={referenceImages}
                onUpload={(e) => handleImageUpload(e, setReferenceImages)}
                onRemove={(index) => handleRemoveImage(index, setReferenceImages)}
                title="Reference Images (for Style)"
                subtitle="Upload for style reference"
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
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter a topic or leave blank for a random idea"
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
                'Generate Prompt'
              )}
            </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}
      
      {generatedPrompt && (
        <div className="p-6 bg-white rounded-xl shadow-md flex flex-col">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Latest Prompt</h2>
            <div className="relative flex-grow">
              <textarea
                readOnly
                value={generatedPrompt}
                className="w-full h-32 p-4 bg-gray-50 text-gray-800 rounded-lg resize-none border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={() => handleCopyToClipboard(generatedPrompt)}
                className="absolute top-3 right-3 px-3 py-1 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
        </div>
      )}

      <div className="flex-grow p-6 bg-white rounded-xl shadow-md flex flex-col min-h-0">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Prompt History</h2>
        <div className="overflow-y-auto flex-grow -mr-6 pr-6">
          {history.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {history.map(item => (
                <li key={item.id} className="py-4 group">
                  <div className="flex flex-col sm:flex-row gap-4">
                     <div className="flex-grow min-w-0">
                      <p className="text-gray-800 mb-2 break-words">{item.prompt}</p>
                      
                       <div className="flex flex-wrap gap-2 my-2">
                        {item.referenceImages.map((img, idx) => (
                          <img key={`ref-${idx}`} src={img} alt="Ref" title="Reference Image" className="w-12 h-12 object-cover rounded-md border" />
                        ))}
                        {item.customElementsImages.map((img, idx) => (
                           <img key={`elem-${idx}`} src={img} alt="Elem" title="Custom Element" className="w-12 h-12 object-cover rounded-md border" />
                        ))}
                      </div>

                       <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{item.timestamp}</span>
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleCopyToClipboard(item.prompt, item.id)}
                            className="p-1 text-gray-500 hover:text-indigo-600"
                            aria-label="Copy prompt"
                          >
                             {copiedHistoryId === item.id ? (
                                <span className="text-indigo-600 text-xs font-bold">Copied!</span>
                             ) : (
                                <div className="w-4 h-4"><CopyIcon /></div>
                             )}
                          </button>
                          <button 
                            onClick={() => handleDeleteFromHistory(item.id)}
                            className="p-1 text-gray-500 hover:text-red-600"
                            aria-label="Delete prompt"
                          >
                            <div className="w-4 h-4"><TrashIcon /></div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex-grow flex items-center justify-center text-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
              <p>Your generated prompts will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromptGenerator;