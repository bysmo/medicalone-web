import React, { useRef } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';

const MAX_BYTES = 400 * 1024;

/**
 * Champ d'upload d'image (stockage data URL base64).
 */
const ImageUploadField = ({
  label,
  value,
  onChange,
  onError,
  hint,
  previewClass = 'h-28',
  wide = false,
}) => {
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onError?.('Veuillez sélectionner une image (PNG, JPG, WebP, SVG)');
      return;
    }
    if (file.size > MAX_BYTES) {
      onError?.('Image trop volumineuse (max 400 Ko)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div>
      {label && (
        <p className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          {label}
        </p>
      )}
      <div
        className={`rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 overflow-hidden flex items-center justify-center ${
          wide ? 'w-full min-h-[7rem]' : 'w-full max-w-xs'
        } ${previewClass}`}
      >
        {value ? (
          <img
            src={value}
            alt={label || 'Aperçu'}
            className={`max-w-full max-h-full object-contain p-2 ${wide ? 'w-full' : ''}`}
          />
        ) : (
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide px-4 text-center">
            Aucune image
          </span>
        )}
      </div>
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-[10px] font-bold uppercase text-sky-600 flex items-center gap-1 hover:text-sky-700"
        >
          <ImagePlus size={12} /> {value ? 'Remplacer' : 'Charger une image'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[10px] font-bold uppercase text-rose-600 flex items-center gap-1 hover:text-rose-700"
          >
            <Trash2 size={12} /> Retirer
          </button>
        )}
      </div>
    </div>
  );
};

export default ImageUploadField;
