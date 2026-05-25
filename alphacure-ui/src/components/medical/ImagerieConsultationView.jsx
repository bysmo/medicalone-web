import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users, Activity, Play, ChevronRight, Check, X, Loader2,
  FileText, Search, Save, Mic, MicOff, Plus, Upload, Eye, Trash2,
  RotateCw, ZoomIn, ZoomOut, Contrast, RefreshCw, Maximize, Printer
} from 'lucide-react';
import { medicalService, prestationService, patientService, practitionerService, clinicService } from '../../services/api';
import { hasRole } from '../../services/auth';
import DataTable from '../ui/DataTable';
import { useClientTable } from '../../hooks/useClientTable';

// --- Text Editor Component ---
const RichTextEditor = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleCommand = (command, val = null) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col min-h-[400px]">
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap gap-1.5 items-center">
        <button type="button" onClick={() => handleCommand('bold')} className="px-2.5 py-1.5 hover:bg-slate-200 rounded text-xs font-black text-slate-700" title="Gras">B</button>
        <button type="button" onClick={() => handleCommand('underline')} className="px-2.5 py-1.5 hover:bg-slate-200 rounded text-xs underline text-slate-700" title="Souligné">U</button>
        <button type="button" onClick={() => handleCommand('italic')} className="px-2.5 py-1.5 hover:bg-slate-200 rounded text-xs italic text-slate-700" title="Italique">I</button>
        <div className="w-[1px] h-4 bg-slate-300 mx-1"></div>
        <button type="button" onClick={() => handleCommand('formatBlock', '<h1>')} className="px-2.5 py-1.5 hover:bg-slate-200 rounded text-xs font-black text-slate-700" title="Titre 1">H1</button>
        <button type="button" onClick={() => handleCommand('formatBlock', '<h2>')} className="px-2.5 py-1.5 hover:bg-slate-200 rounded text-xs font-bold text-slate-700" title="Titre 2">H2</button>
        <button type="button" onClick={() => handleCommand('formatBlock', '<p>')} className="px-2.5 py-1.5 hover:bg-slate-200 rounded text-xs text-slate-700" title="Texte normal">P</button>
        <div className="w-[1px] h-4 bg-slate-300 mx-1"></div>
        <button type="button" onClick={() => handleCommand('insertUnorderedList')} className="px-2.5 py-1.5 hover:bg-slate-200 rounded text-xs text-slate-700" title="Liste à puces">• Liste</button>
        <button type="button" onClick={() => handleCommand('justifyLeft')} className="px-2 py-1.5 hover:bg-slate-200 rounded text-xs" title="Aligner à gauche">←</button>
        <button type="button" onClick={() => handleCommand('justifyCenter')} className="px-2 py-1.5 hover:bg-slate-200 rounded text-xs" title="Centrer">↔</button>
        <button type="button" onClick={() => handleCommand('justifyRight')} className="px-2 py-1.5 hover:bg-slate-200 rounded text-xs" title="Aligner à droite">→</button>
        <div className="w-[1px] h-4 bg-slate-300 mx-1"></div>
        <button type="button" onClick={() => handleCommand('removeFormat')} className="px-2 py-1.5 hover:bg-slate-200 text-rose-500 rounded text-xs font-bold" title="Effacer la mise en forme">Effacer</button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="flex-1 p-4 outline-none prose prose-slate max-w-none overflow-y-auto text-sm text-slate-800 bg-white focus:ring-2 focus:ring-indigo-100"
        placeholder={placeholder}
        style={{ minHeight: '350px' }}
      />
    </div>
  );
};

// --- PACS Viewer Modal Component ---
export const PacsViewerModal = ({ fileUrl, fileName, patientName, patientCode, actName, onClose }) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [invert, setInvert] = useState(false);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const isDicom = fileName?.toLowerCase().endsWith('.dcm');
  const modality = actName?.toLowerCase().includes('écho') || actName?.toLowerCase().includes('ultrasound') ? 'US' : 'DX';

  // Draw simulated medical image on Canvas if DICOM, or load standard image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isDicom) {
      // Draw realistic simulated medical scan
      canvas.width = 600;
      canvas.height = 600;
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 600, 600);

      // Diagnostic Grid / Circle
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 50; i < 600; i += 50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 600); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(600, i); ctx.stroke();
      }

      if (modality === 'US') {
        // Render ultrasound scan sector cone
        const grad = ctx.createRadialGradient(300, 100, 50, 300, 100, 450);
        grad.addColorStop(0, '#0a0e17');
        grad.addColorStop(0.2, '#141c2c');
        grad.addColorStop(0.6, '#0f1522');
        grad.addColorStop(1, '#05070a');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(300, 100);
        ctx.arc(300, 100, 450, (Math.PI / 180) * 60, (Math.PI / 180) * 120);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.stroke();

        // Ultrasound organic shapes / organs
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath(); ctx.arc(300, 280, 70, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath(); ctx.ellipse(320, 290, 40, 20, Math.PI / 6, 0, Math.PI * 2); ctx.fill();

        // Echo noise / grain
        const imgData = ctx.getImageData(0, 0, 600, 600);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 10) { // only inside the sector
            const noise = (Math.random() - 0.5) * 45;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
          }
        }
        ctx.putImageData(imgData, 0, 0);

        // Radial scale lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        for (let r = 150; r <= 450; r += 100) {
          ctx.beginPath();
          ctx.arc(300, 100, r, (Math.PI / 180) * 65, (Math.PI / 180) * 115);
          ctx.stroke();
        }

      } else {
        // Render Chest Radiography (X-Ray) outline
        ctx.fillStyle = '#030303';
        ctx.fillRect(0, 0, 600, 600);

        // Chest Background Glow
        const radG = ctx.createRadialGradient(300, 300, 50, 300, 300, 300);
        radG.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
        radG.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
        radG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = radG;
        ctx.fillRect(0, 0, 600, 600);

        // Lungs contours
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        // Left Lung
        ctx.beginPath();
        ctx.moveTo(270, 150);
        ctx.bezierCurveTo(250, 100, 150, 120, 130, 220);
        ctx.bezierCurveTo(110, 350, 120, 480, 170, 480);
        ctx.bezierCurveTo(210, 480, 250, 450, 270, 420);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // Right Lung
        ctx.beginPath();
        ctx.moveTo(330, 150);
        ctx.bezierCurveTo(350, 100, 450, 120, 470, 220);
        ctx.bezierCurveTo(490, 350, 480, 480, 430, 480);
        ctx.bezierCurveTo(390, 480, 350, 450, 330, 420);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Spine and Ribs
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(300, 100); ctx.lineTo(300, 500); ctx.stroke(); // Spine

        // Ribs
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 6;
        for (let y = 160; y < 450; y += 35) {
          const factor = (y - 160) / 300;
          const w = 80 + factor * 70;
          // Left ribs
          ctx.beginPath(); ctx.arc(300 - w, y, w, -Math.PI / 12, Math.PI / 6); ctx.stroke();
          // Right ribs
          ctx.beginPath(); ctx.arc(300 + w, y, w, Math.PI - Math.PI / 6, Math.PI + Math.PI / 12); ctx.stroke();
        }

        // Heart shadow
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(310, 330, 50, 0, Math.PI * 2);
        ctx.fill();

        // Noise
        const imgData = ctx.getImageData(0, 0, 600, 600);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const noise = (Math.random() - 0.5) * 12;
          data[i] = Math.max(0, Math.min(255, data[i] + noise));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
        ctx.putImageData(imgData, 0, 0);
      }
    } else if (fileUrl) {
      // Standard image
      const img = new Image();
      img.onload = () => {
        canvas.width = img.naturalWidth || 600;
        canvas.height = img.naturalHeight || 600;
        ctx.drawImage(img, 0, 0);
      };
      img.src = fileUrl;
    }
  }, [fileUrl, isDicom, modality]);

  const handleReset = () => {
    setZoom(100);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setInvert(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col font-mono no-print">
      {/* PACS Menu bar */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between text-slate-300">
        <div className="flex items-center gap-4">
          <span className="bg-slate-800 px-2.5 py-1 rounded text-xs font-black text-amber-500 uppercase tracking-widest">
            Diagnostic PACS Viewer
          </span>
          <span className="text-sm font-bold text-white truncate max-w-[200px]">{fileName}</span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* PACS Side Toolbar */}
        <div className="w-64 bg-slate-900/50 border-r border-slate-800/80 p-4 flex flex-col gap-4 text-slate-400 text-xs">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Outils de manipulation</p>
          
          {/* Zoom Control */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-bold">
              <span>Zoom</span>
              <span className="text-white">{zoom}%</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1 bg-slate-800 rounded hover:bg-slate-700 text-white"><ZoomOut size={14} /></button>
              <input type="range" min="50" max="300" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1 accent-indigo-500 h-1 bg-slate-700 rounded-lg appearance-none" />
              <button onClick={() => setZoom(z => Math.min(300, z + 10))} className="p-1 bg-slate-800 rounded hover:bg-slate-700 text-white"><ZoomIn size={14} /></button>
            </div>
          </div>

          {/* Contrast Control */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-bold">
              <span>Contraste</span>
              <span className="text-white">{contrast}%</span>
            </div>
            <input type="range" min="50" max="200" value={contrast} onChange={e => setContrast(Number(e.target.value))} className="w-full accent-indigo-500 h-1 bg-slate-700 rounded-lg appearance-none" />
          </div>

          {/* Brightness Control */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-bold">
              <span>Luminosité</span>
              <span className="text-white">{brightness}%</span>
            </div>
            <input type="range" min="50" max="200" value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="w-full accent-indigo-500 h-1 bg-slate-700 rounded-lg appearance-none" />
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button onClick={() => setRotation(r => (r + 90) % 360)} className="w-full flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">
              <span>Faire pivoter 90°</span>
              <RotateCw size={14} />
            </button>
            <button onClick={() => setInvert(i => !i)} className="w-full flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">
              <span>Inverser les couleurs</span>
              <Contrast size={14} />
            </button>
            <button onClick={handleReset} className="w-full flex items-center justify-between p-2.5 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-white rounded-lg transition-colors">
              <span>Réinitialiser la vue</span>
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Metadata info */}
          <div className="mt-auto border-t border-slate-800 pt-4 space-y-2 text-[10px] text-slate-500 font-mono">
            <div><span className="font-bold text-slate-400">PATIENT ID:</span> {patientCode}</div>
            <div><span className="font-bold text-slate-400">NOM:</span> {patientName}</div>
            <div><span className="font-bold text-slate-400">MODALITÉ:</span> {modality}</div>
            <div><span className="font-bold text-slate-400">EXAMEN:</span> {actName}</div>
          </div>
        </div>

        {/* Viewport Screen */}
        <div ref={containerRef} className="flex-1 bg-[#020408] flex items-center justify-center p-8 relative overflow-hidden select-none">
          {/* Overlay HUD - Top Left */}
          <div className="absolute top-6 left-6 text-[10px] text-emerald-400 pointer-events-none select-none uppercase tracking-wide leading-relaxed">
            <div>HÔPITAL ALPHACURE</div>
            <div>ID: {patientCode}</div>
            <div>PATIENT: {patientName}</div>
          </div>

          {/* Overlay HUD - Top Right */}
          <div className="absolute top-6 right-6 text-[10px] text-emerald-400 text-right pointer-events-none select-none uppercase tracking-wide leading-relaxed">
            <div>MODALITY: {modality}</div>
            <div>STUDY: {actName}</div>
            <div>STATUS: UNCOMPRESSED</div>
          </div>

          {/* Overlay HUD - Bottom Left */}
          <div className="absolute bottom-6 left-6 text-[10px] text-emerald-400 pointer-events-none select-none uppercase tracking-wide leading-relaxed">
            <div>ZOOM: {zoom}%</div>
            <div>W/L: {contrast} / {brightness}</div>
            <div>COLOR: {invert ? 'INVERTED' : 'NORMAL'}</div>
          </div>

          {/* Render Screen Canvas */}
          <div
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert ? 'invert(1)' : 'invert(0)'}`,
              transition: 'transform 0.15s ease-out, filter 0.15s ease-out'
            }}
            className="shadow-2xl border border-slate-900"
          >
            <canvas ref={canvasRef} className="max-w-full max-h-[80vh] object-contain bg-black" />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main ImagerieConsultationView Component ---
const ImagerieConsultationView = ({ showToast }) => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  
  // Rich Text Editor report state
  const [reportContent, setReportContent] = useState('');
  
  // Templates state
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // DICOM upload & files state
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [activeViewerFile, setActiveViewerFile] = useState(null);

  const fileInputRef = useRef(null);
  const isDoctor = hasRole('MEDECIN');

  const handlePrintReport = async () => {
    if (!selectedItem || !reportContent.trim()) {
      showToast("Le contenu du compte-rendu est vide.", "error");
      return;
    }
    showToast("Préparation de l'impression...", "info");
    try {
      const [clinicRes, patientRes] = await Promise.all([
        clinicService.getMyProfile().catch(() => null),
        patientService.getById(selectedItem.patientId).catch(() => null)
      ]);
      const clinic = clinicRes?.data?.clinic;
      const clinicProfile = clinicRes?.data?.profile;
      const patient = patientRes?.data || { firstName: selectedItem.patientName, lastName: '', patientCode: selectedItem.patientCode };

      const headerImg = clinicProfile?.printHeaderA4 || clinicProfile?.printHeaderA5 || '';
      const footerImg = clinicProfile?.printFooterA4 || clinicProfile?.printFooterA5 || '';

      const printWindow = window.open('', '', 'width=800,height=900,toolbar=0,scrollbars=0,status=0');
      if (!printWindow) {
        showToast("Le bloqueur de pop-up empêche l'impression. Veuillez l'autoriser.", "warning");
        return;
      }

      const formattedBirthDate = patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('fr-FR') : '---';
      const patientGender = patient.gender === 'M' ? 'Masculin' : patient.gender === 'F' ? 'Féminin' : '---';
      const formattedDate = new Date().toLocaleDateString('fr-FR');

      printWindow.document.write(`
        <html>
          <head>
            <title>Compte-rendu d'Imagerie - ${patient.firstName} ${patient.lastName}</title>
            <style>
              @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none; }
              }
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; padding: 30px; font-size: 12px; }
              .header-img { width: 100%; max-height: 120px; object-fit: contain; margin-bottom: 20px; }
              .footer-img { width: 100%; max-height: 80px; object-fit: contain; margin-top: 30px; }
              .clinic-text-header { text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; margin-bottom: 25px; }
              .clinic-name { font-size: 18px; font-weight: 900; color: #4f46e5; text-transform: uppercase; margin: 0; }
              .clinic-sub { font-size: 10px; color: #64748b; margin: 4px 0 0 0; font-weight: bold; }
              .doc-patient-table { width: 100%; margin-bottom: 30px; border-collapse: collapse; }
              .doc-patient-table td { padding: 8px 12px; vertical-align: top; border: 1px solid #e2e8f0; }
              .title { text-align: center; font-size: 18px; font-weight: 900; margin: 30px 0 20px 0; text-transform: uppercase; color: #0f172a; letter-spacing: 1px; }
              .report-body { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; background-color: #ffffff; min-height: 350px; font-size: 13px; }
              .bold { font-weight: bold; }
              .signature-area { margin-top: 50px; text-align: right; font-size: 12px; }
              .signature-title { font-weight: bold; margin-bottom: 50px; text-decoration: underline; color: #334155; }
            </style>
          </head>
          <body>
            ${headerImg ? '<img class="header-img" src="' + headerImg + '" alt="Header" />' : `
              <div class="clinic-text-header">
                <h1 class="clinic-name">${clinic?.name || 'CLINIQUE MEDICALE'}</h1>
                <p class="clinic-sub">${clinic?.address || ''} ${clinic?.phone ? '• Tél: ' + clinic.phone : ''} ${clinic?.email ? '• Email: ' + clinic.email : ''}</p>
                ${clinicProfile?.slogan ? `<p class="clinic-sub" style="font-style: italic;">"${clinicProfile.slogan}"</p>` : ''}
              </div>
            `}
            
            <table class="doc-patient-table">
              <tr>
                <td style="width: 50%; background-color: #fafafa;">
                  <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 4px;">Examen d'Imagerie :</span>
                  <span class="bold" style="font-size: 13px; color: #4f46e5;">${selectedItem.actName}</span><br/>
                  Date de l'examen : ...${formattedDate}
                </td>
                <td style="width: 50%;">
                  <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 4px;">Patient :</span>
                  <span class="bold" style="font-size: 13px; color: #0f172a;">${patient.firstName} ${patient.lastName}</span><br/>
                  Code : ${patient.patientCode}<br/>
                  Sexe : ...${patientGender} • Né(e) le : ${formattedBirthDate}
                </td>
              </tr>
            </table>

            <div class="title">Compte-Rendu d'Examen</div>

            <div class="report-body">
              ${reportContent}
            </div>

            <div class="signature-area">
              <div class="signature-title">Signature & Cachet du Médecin Radiologue</div>
            </div>

            ${footerImg ? '<div style="text-align: center; margin-top: 80px;"><img class="footer-img" src="' + footerImg + '" alt="Footer" /></div>' : ''}

            <script>
              window.onload = function() {
                window.focus();
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la génération de l'impression du compte-rendu.", "error");
    }
  };

  const { onSearch, paginated, pagination } = useClientTable(queue, {
    searchKeys: ['patientName', 'patientCode', 'actName', 'time', 'statusLabel'],
    initialPageSize: 10,
  });

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const [prestRes, patRes, historyRes] = await Promise.all([
        prestationService.getToday(),
        patientService.search('', 0, 1000),
        medicalService.getSeancesConsultations() // retrieves general consultation/sessions
      ]);

      const patientsMap = {};
      (patRes.data.content || []).forEach(p => { patientsMap[p.id] = p; });

      const todayPrestations = prestRes.data || [];
      
      // Filter today's prestations for RADIOGRAPHY or ULTRASOUND exams
      const imagingPrestations = todayPrestations.filter(line => {
        const actName = (line.actName || '').toUpperCase();
        const nature = (line.nature || '').toUpperCase();
        const spec = (line.specialty || '').toUpperCase();
        const status = (line.status || '').toUpperCase();

        if (status !== 'EN_ATTENTE' && status !== 'REGLEE') return false;

        // Radiography or ultrasound check
        const isImaging = nature === 'EXAMENS' && (
          spec === 'RADIOGRAPHIE' || 
          spec === 'ECHOGRAPHIE' ||
          actName.includes('RADIO') || 
          actName.includes('ECHO')
        );

        return isImaging;
      });

      // Fetch or build consultations for these prestations
      const rows = [];
      for (const line of imagingPrestations) {
        const patient = line.patientId ? patientsMap[line.patientId] : null;

        // Look for existing consultation record in DB for this prestation
        let dbConsultation = null;
        try {
          const existRes = await medicalService.createConsultation({
            prestationId: line.id,
            patientId: line.patientId,
            practitionerId: line.practitionerId,
            nature: 'EXAMENS',
            actName: line.actName,
          });
          dbConsultation = existRes.data;
        } catch (_) {}

        rows.push({
          prestationId: line.id,
          patientId: line.patientId,
          patientName: patient ? patient.fullName || `${patient.firstName} ${patient.lastName}` : 'Patient inconnu',
          patientCode: patient?.patientCode || '---',
          actName: line.actName,
          time: line.createdAt ? line.createdAt.split('T')[1]?.substring(0, 5) : '00:00',
          consultationId: dbConsultation?.id || null,
          medicalStatus: dbConsultation?.medicalStatus || 'EN_ATTENTE',
          statusLabel: dbConsultation?.medicalStatus === 'TERMINEE' ? 'Terminé' : dbConsultation?.medicalStatus === 'DEMARREE' ? 'En cours' : 'En attente',
        });
      }

      rows.sort((a, b) => {
        const order = { EN_ATTENTE: 0, DEMARREE: 1, TERMINEE: 2 };
        const oa = order[a.medicalStatus] ?? 3;
        const ob = order[b.medicalStatus] ?? 3;
        if (oa !== ob) return oa - ob;
        return a.time.localeCompare(b.time);
      });

      setQueue(rows);
    } catch (err) {
      console.error(err);
      showToast('Erreur lors du chargement de la file d\'attente imagerie', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Load templates
  const loadTemplates = async (category) => {
    try {
      const res = await medicalService.getImagingTemplates(category);
      setTemplates(res.data || []);
    } catch (err) {
      console.error("Error loading templates", err);
    }
  };

  // Load files for selected consultation
  const loadConsultationFiles = async (consId) => {
    try {
      const res = await medicalService.getDicomFilesByConsultation(consId);
      setUploadedFiles(res.data || []);
    } catch (err) {
      console.error("Error loading DICOM files", err);
    }
  };

  const handleStartExam = async (item) => {
    try {
      let consId = item.consultationId;
      if (!consId) {
        const res = await medicalService.createConsultation({
          prestationId: item.prestationId,
          patientId: item.patientId,
          nature: 'EXAMENS',
          actName: item.actName,
        });
        consId = res.data?.id;
      }
      if (consId) {
        const activeRes = await medicalService.startConsultation(consId);
        setActiveConsultation(activeRes.data);
      }

      setSelectedItem(item);
      setReportContent('');
      setUploadedFiles([]);

      // Determine category (RADIOGRAPHIE vs ECHOGRAPHIE)
      const act = item.actName.toLowerCase();
      const cat = act.includes('écho') || act.includes('echo') ? 'ECHOGRAPHIE' : 'RADIOGRAPHIE';
      loadTemplates(cat);

      // Load existing notes / files if any
      if (consId) {
        loadConsultationFiles(consId);
        medicalService.getNote('', consId)
          .then(nRes => {
            if (nRes.data?.conclusions) {
              setReportContent(nRes.data.conclusions);
            }
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error("Error starting exam", err);
      showToast("Impossible de démarrer l'examen", "error");
    }
  };

  const handleTemplateChange = (e) => {
    const id = e.target.value;
    setSelectedTemplateId(id);
    const matched = templates.find(t => t.id === id);
    if (matched) {
      setReportContent(matched.content);
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      showToast("Veuillez saisir un nom pour le modèle", "error");
      return;
    }
    const act = selectedItem.actName.toLowerCase();
    const cat = act.includes('écho') || act.includes('echo') ? 'ECHOGRAPHIE' : 'RADIOGRAPHIE';

    try {
      await medicalService.saveImagingTemplate({
        name: newTemplateName,
        content: reportContent,
        category: cat,
      });
      showToast("Modèle de compte-rendu enregistré avec succès", "success");
      setNewTemplateName('');
      setShowSaveTemplateModal(false);
      loadTemplates(cat);
    } catch (err) {
      showToast("Erreur lors de l'enregistrement du modèle", "error");
    }
  };

  const handleUploadDicom = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedItem) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', selectedItem.patientId);
    if (activeConsultation?.id) {
      formData.append('consultationId', activeConsultation.id);
    }
    formData.append('prestationId', selectedItem.prestationId);

    try {
      await medicalService.uploadDicom(formData);
      showToast("Fichier image importé avec succès", "success");
      if (activeConsultation?.id) {
        loadConsultationFiles(activeConsultation.id);
      }
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'importation de l'image", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (id) => {
    if (!window.confirm("Supprimer ce fichier image ?")) return;
    try {
      await medicalService.deleteDicom(id);
      showToast("Image supprimée", "success");
      if (activeConsultation?.id) {
        loadConsultationFiles(activeConsultation.id);
      }
    } catch (err) {
      showToast("Erreur lors de la suppression de l'image", "error");
    }
  };

  // Web Speech recognition for voice dictation
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("La dictée vocale n'est pas disponible sur votre navigateur (utilisez Chrome ou Safari)", "error");
      return;
    }

    if (recognizing) {
      window._recognitionInstance?.stop();
      setRecognizing(false);
    } else {
      const rec = new SpeechRecognition();
      rec.lang = 'fr-FR';
      rec.continuous = true;
      rec.interimResults = false;

      rec.onstart = () => {
        setRecognizing(true);
        showToast("Dictée vocale activée. Parlez...", "success");
      };
      rec.onerror = () => {
        setRecognizing(false);
        showToast("Erreur de reconnaissance vocale", "error");
      };
      rec.onend = () => {
        setRecognizing(false);
      };
      rec.onresult = (event) => {
        const text = event.results[event.results.length - 1][0].transcript;
        setReportContent(prev => prev + ` <p>${text}</p>`);
      };

      window._recognitionInstance = rec;
      rec.start();
    }
  };

  const handleSaveReport = async () => {
    if (!selectedItem || !reportContent.trim()) {
      showToast("Le contenu du compte-rendu ne peut pas être vide", "error");
      return;
    }
    setSaving(true);
    try {
      // Save rich-text report into conclusions field of MedicalNote
      await medicalService.saveNote({
        prestationId: selectedItem.prestationId,
        patientId: selectedItem.patientId,
        consultationId: activeConsultation?.id,
        conclusions: reportContent,
      });

      // End consultation (transition status to TERMINEE)
      if (activeConsultation?.id) {
        await medicalService.endConsultation(activeConsultation.id);
      }

      showToast("Compte-rendu d'imagerie enregistré et validé", "success");
      setSelectedItem(null);
      setActiveConsultation(null);
      loadQueue();
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la validation du compte-rendu", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!isDoctor) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        <Users size={40} className="mx-auto text-amber-500 mb-4" />
        <h2 className="text-lg font-black text-slate-800 uppercase">Accès restreint</h2>
        <p className="text-sm text-slate-500 mt-2">
          La saisie et consultation d'imagerie médicale est réservée aux médecins cliniciens et radiologues.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Visualizer Frame */}
      {activeViewerFile && (
        <PacsViewerModal
          fileName={activeViewerFile.fileName}
          fileUrl={`/api/v1/medical/dicom/${activeViewerFile.id}/raw`}
          patientName={selectedItem?.patientName}
          patientCode={selectedItem?.patientCode}
          actName={selectedItem?.actName}
          onClose={() => setActiveViewerFile(null)}
        />
      )}

      {/* Main Workspace */}
      {!selectedItem ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
              <Activity size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Consultations Imagerie</h2>
              <p className="text-[11px] text-slate-400 font-semibold">File d'attente d'échographie et de radiographie</p>
            </div>
          </div>

          <DataTable
            title="Prestations imagerie du jour"
            columns={[
              {
                label: 'Patient',
                key: 'patientName',
                render: (row) => (
                  <div>
                    <div className="font-black text-slate-800">{row.patientName}</div>
                    <div className="font-mono text-[9px] text-slate-400">{row.patientCode}</div>
                  </div>
                ),
              },
              { label: 'Examen', key: 'actName', render: (row) => <span className="text-sm font-bold text-slate-700">{row.actName}</span> },
              { label: 'Heure', key: 'time', render: (row) => <span className="font-mono text-sm text-slate-600">{row.time}</span> },
              {
                label: 'Statut',
                key: 'statusLabel',
                render: (row) => {
                  const colors = {
                    EN_ATTENTE: 'bg-amber-100 text-amber-700 border-amber-200',
                    DEMARREE: 'bg-indigo-100 text-indigo-700 border-indigo-200',
                    TERMINEE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                  };
                  const colorClass = colors[row.medicalStatus] || colors.EN_ATTENTE;
                  return (
                    <span className={`${colorClass} border px-2 py-0.5 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1`}>
                      {row.statusLabel}
                    </span>
                  );
                },
              },
            ]}
            data={paginated}
            loading={loading}
            onSearch={onSearch}
            searchPlaceholder="Rechercher patient, code, examen..."
            entryLabel="examens"
            pagination={pagination}
            extraActions={(row) => (
              row.medicalStatus !== 'TERMINEE' ? (
                <button
                  type="button"
                  onClick={() => handleStartExam(row)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase hover:bg-indigo-700 inline-flex items-center gap-1"
                >
                  <Play size={11} /> Démarrer l'examen
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleStartExam(row)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black uppercase hover:bg-slate-200 inline-flex items-center gap-1"
                >
                  <Eye size={11} /> Consulter
                </button>
              )
            )}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Consultation banner */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5 rounded-2xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg shadow-indigo-100">
            <div>
              <button onClick={() => setSelectedItem(null)} className="text-[10px] font-black uppercase bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg mb-2 inline-flex items-center gap-1">
                Retour à la file
              </button>
              <h3 className="font-black text-xl leading-none">{selectedItem.patientName}</h3>
              <p className="text-[10px] text-white/70 font-mono mt-1">{selectedItem.patientCode} • Examen : {selectedItem.actName}</p>
            </div>
            <div className="flex gap-2">
              {reportContent && reportContent.trim() && (
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5"
                >
                  <Printer size={11} /> Imprimer CR
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(true)}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase"
              >
                Enregistrer comme modèle
              </button>
              {selectedItem.medicalStatus !== 'TERMINEE' && (
                <button
                  onClick={handleSaveReport}
                  disabled={saving}
                  className="bg-white text-indigo-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-lg"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Enregistrer et Terminer
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left side: Metadata, Templates & DICOM files */}
            <div className="space-y-6">
              {/* Templates management */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Modèles de comptes-rendus</h4>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 block">Appliquer un modèle type</label>
                  <select
                    value={selectedTemplateId}
                    onChange={handleTemplateChange}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 bg-white outline-none focus:border-indigo-500"
                  >
                    <option value="">Sélectionner un modèle...</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DICOM File Upload & Management */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Images d'examen (DICOM)</h4>
                  {selectedItem.medicalStatus !== 'TERMINEE' && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 font-bold hover:bg-indigo-100 flex items-center gap-1.5"
                    >
                      {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      Importer
                    </button>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUploadDicom}
                    accept=".dcm,.png,.jpg,.jpeg"
                    className="hidden"
                  />
                </div>

                {uploadedFiles.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
                    <Upload size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-bold">Aucune image importée</p>
                    <p className="text-[10px] mt-0.5">Glissez ou importez un fichier .dcm ou une image d'illustration</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between py-3 gap-3 group">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 font-mono text-[9px] shrink-0 font-bold">
                            {file.fileName.toLowerCase().endsWith('.dcm') ? 'DCM' : 'IMG'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{file.fileName}</p>
                            <p className="text-[9px] text-slate-400">{(file.fileSize / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setActiveViewerFile(file)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"
                            title="Ouvrir dans le visualiseur"
                          >
                            <Eye size={12} />
                          </button>
                          {selectedItem.medicalStatus !== 'TERMINEE' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteFile(file.id)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg"
                              title="Supprimer l'image"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Rich-Text report entry */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Compte-rendu médical</span>
                {selectedItem.medicalStatus !== 'TERMINEE' && (
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      recognizing 
                        ? 'bg-rose-600 text-white animate-pulse shadow shadow-rose-200' 
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    {recognizing ? <MicOff size={11} /> : <Mic size={11} />}
                    {recognizing ? 'Arrêter dictée' : 'Dictée Vocale'}
                  </button>
                )}
              </div>

              {selectedItem.medicalStatus !== 'TERMINEE' ? (
                <RichTextEditor
                  value={reportContent}
                  onChange={setReportContent}
                  placeholder="Commencez à rédiger votre compte-rendu d'imagerie..."
                />
              ) : (
                <div
                  className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-700 prose max-w-none min-h-[400px] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: reportContent || '<p className="text-slate-400 italic">Aucun compte-rendu rédigé.</p>' }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-indigo-700 p-4 flex justify-between items-center text-white">
              <h3 className="text-sm font-black uppercase tracking-wider">Enregistrer le modèle</h3>
              <button onClick={() => setShowSaveTemplateModal(false)}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Nom du modèle</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  placeholder="Ex: Échographie Abdominale Normale"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowSaveTemplateModal(false)} className="flex-1 bg-slate-200 text-slate-600 py-2.5 rounded-lg text-[10px] font-bold uppercase">Annuler</button>
                <button onClick={handleSaveTemplate} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2">
                  <Save size={14} /> Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagerieConsultationView;
