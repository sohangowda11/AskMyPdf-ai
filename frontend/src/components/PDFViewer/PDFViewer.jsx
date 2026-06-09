import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, Download, Search, AlertCircle } from 'lucide-react';
import { useApp } from '../../hooks/useApp';
import * as api from '../../api/api';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import Mark from 'mark.js';

// Setup pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function PDFViewer() {
  const { state, dispatch } = useApp();
  const [zoom, setZoom] = useState(1);
  const [numPages, setNumPages] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef(null);
  
  // Highlighting state
  const [highlightText, setHighlightText] = useState('');
  const [highlightPage, setHighlightPage] = useState(null);
  const [highlightError, setHighlightError] = useState(false);
  
  const markInstances = useRef({});
  const lastFailedText = useRef('');

  // Use the direct URL from global state for stable streaming
  const pdfFile = state.pdfUrl;
  const isLoading = false; // react-pdf handles loading UI internally or via custom overlay
  const isError = false;   // react-pdf handles error UI via noData/error props if needed

  useEffect(() => {
    const handleHighlight = (e) => {
      const { page, text, doc_id, filename, shouldScroll } = e.detail;
      if (doc_id && state.activeDocument?.doc_id !== doc_id) {
          console.log("!!! [VIEWER] Switching document for highlight:", filename);
          dispatch({ 
            type: 'SET_ACTIVE_DOCUMENT', 
            payload: { doc_id, filename, page_count: 0 } 
          });
          // Prefer direct filename URL for stability if available
          const targetUrl = filename ? api.getPDFUrl(filename) : api.getPDFUrlById(doc_id);
          dispatch({ 
            type: 'SET_PDF_URL', 
            payload: targetUrl 
          });
      }
      if (page && text) {
        setHighlightPage(page);
        setHighlightText(text);
        if (shouldScroll) {
          setTimeout(() => {
            const pageEl = document.querySelector(`[data-page-number="${page}"]`);
            if (pageEl && containerRef.current) {
                containerRef.current.scrollTo({
                    top: pageEl.offsetTop - 50,
                    behavior: 'smooth'
                });
            }
          }, 100);
        }
      }
    };
    window.addEventListener('highlight-pdf', handleHighlight);
    return () => window.removeEventListener('highlight-pdf', handleHighlight);
  }, [state.activeDocument, dispatch]);

  // Responsive width scaling
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);

  const applyHighlight = (pageIndex) => {
      if (highlightText && highlightPage === pageIndex) {
          const pageEl = document.querySelector(`[data-page-number="${highlightPage}"] .react-pdf__Page__textContent`);
          if (pageEl) {
              if (!markInstances.current[highlightPage]) {
                  markInstances.current[highlightPage] = new Mark(pageEl);
              }
              const marker = markInstances.current[highlightPage];
              Object.values(markInstances.current).forEach(m => m.unmark());
              const normalize = (t) => t.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u00AD\u200B\u200C\u200D\FEFF]/g, '').replace(/\s+/g, ' ').trim();
              const normalizedText = normalize(highlightText);
              marker.mark(normalizedText, {
                  accuracy: "partially",
                  separateWordSearch: false,
                  acrossElements: true,
                  ignoreJoiners: true,
                  ignorePunctuation: [":", ";", ",", ".", "-", "(", ")", "[", "]", "{", "}", "?", "!", "'", '"', "—", "–"],
                  wildcards: "enabled",
                  className: "pdf-highlight-glow",
                  done: (count) => {
                      if (count > 0) {
                          setHighlightError(false);
                          scrollToHighlight(pageEl);
                      } else {
                          const noPunctText = normalizedText.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
                          if (noPunctText.length > 10) {
                              marker.mark(noPunctText, {
                                  accuracy: "partially",
                                  className: "pdf-highlight-glow",
                                  done: (count2) => {
                                      if (count2 > 0) {
                                          setHighlightError(false);
                                          scrollToHighlight(pageEl);
                                      } else {
                                          attemptShortFallback(marker, normalizedText, pageEl);
                                      }
                                  }
                              });
                          } else {
                              attemptShortFallback(marker, normalizedText, pageEl);
                          }
                      }
                  }
              });
          }
      } else if (markInstances.current[pageIndex]) {
          markInstances.current[pageIndex].unmark();
      }
  };

  const scrollToHighlight = (pageEl) => {
      const markEl = pageEl.querySelector('.pdf-highlight-glow');
      if (markEl && containerRef.current) {
          const container = containerRef.current;
          const markTop = markEl.getBoundingClientRect().top;
          const containerTop = container.getBoundingClientRect().top;
          container.scrollBy({ top: markTop - containerTop - 150, behavior: 'smooth' });
      }
  };

  const attemptShortFallback = (marker, fullText, pageEl) => {
      const shortText = fullText.substring(0, 40).trim();
      if (shortText.length > 8) {
          marker.mark(shortText, {
              accuracy: "partially",
              className: "pdf-highlight-glow",
              done: (count) => {
                  if (count > 0) {
                      setHighlightError(false);
                      scrollToHighlight(pageEl);
                  } else {
                      triggerError(fullText);
                  }
              }
          });
      } else {
          triggerError(fullText);
      }
  };

  const triggerError = (text) => {
      if (lastFailedText.current !== text) {
          setHighlightError(true);
          lastFailedText.current = text;
          setTimeout(() => setHighlightError(false), 3000);
      }
  };

  useEffect(() => {
      if (highlightPage) applyHighlight(highlightPage);
  }, [highlightText, highlightPage, zoom]);

  const [displayZoom, setDisplayZoom] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => setDisplayZoom(zoom), 150);
    return () => clearTimeout(timer);
  }, [zoom]);

  const baseWidth = (containerWidth - 80);
  const pdfWidth = baseWidth > 0 ? baseWidth * displayZoom : 800 * displayZoom;

  const handleDownload = async () => {
    if (state.activeDocument?.doc_id) {
      try {
        const blobUrl = await api.fetchPDFBlobById(state.activeDocument.doc_id);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = state.activeDocument?.filename || 'document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error("Download failed:", err);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] dark:bg-[#0f1117] relative transition-colors duration-300 gpu-accelerated">
      {/* Floating Toolbar */}
      {!isError && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 p-2 bg-white/80 dark:bg-[#1b1f2a]/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/60 rounded-[20px] shadow-2xl transition-all hover:shadow-orange-500/10">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2.5 hover:bg-slate-50 dark:hover:bg-[#232938] rounded-xl text-slate-500 dark:text-slate-400 transition-colors">
            <ZoomOut size={18} />
            </button>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 px-2 min-w-[50px] text-center uppercase tracking-widest">
            {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2.5 hover:bg-slate-50 dark:hover:bg-[#232938] rounded-xl text-slate-500 dark:text-slate-400 transition-colors">
            <ZoomIn size={18} />
            </button>
            <div className="w-px h-4 bg-slate-100 dark:bg-slate-800 mx-1" />
            <button onClick={handleDownload} className="p-2.5 hover:bg-slate-50 dark:hover:bg-[#232938] rounded-xl text-slate-500 dark:text-slate-400 transition-colors">
            <Download size={18} />
            </button>
        </div>
      )}
      
      <AnimatePresence>
        {highlightError && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="absolute top-24 left-1/2 z-30 px-4 py-2 bg-[#1b1f2a]/90 backdrop-blur-md text-slate-300 text-xs font-bold rounded-lg shadow-xl border border-slate-800/60 flex items-center gap-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            Exact source section could not be highlighted.
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={containerRef} className="flex-1 overflow-auto custom-scrollbar smooth-scroll p-10 pt-24 flex justify-center bg-slate-100/50 dark:bg-[#0a0a0f]">
        <div className="relative group w-full flex justify-center">
          <motion.div 
            className="transition-all flex flex-col items-center gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          >
             {pdfFile ? (
               <Document
                 file={pdfFile}
                 onLoadSuccess={onDocumentLoadSuccess}
                 className="flex flex-col items-center gap-8 pb-20"
               >
                 {Array.from(new Array(numPages), (el, index) => (
                   <div key={`page_${index + 1}`} className="rounded-2xl shadow-2xl shadow-slate-200 dark:shadow-black/60 overflow-hidden bg-white border border-slate-100 dark:border-slate-800 transition-transform duration-500 hover:scale-[1.005]">
                       <Page 
                         pageNumber={index + 1} 
                         width={pdfWidth}
                         renderTextLayer={true}
                         renderAnnotationLayer={true}
                         onRenderTextLayerSuccess={() => {
                             setTimeout(() => applyHighlight(index + 1), 100);
                         }}
                       />
                   </div>
                 ))}
               </Document>
             ) : (
               <div className="w-[800px] h-[800px] bg-white dark:bg-[#151821] rounded-[40px] shadow-2xl shadow-slate-200 dark:shadow-black/50 flex flex-col items-center justify-center p-20 text-center border border-slate-100 dark:border-slate-800/60">
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="w-24 h-24 bg-slate-50 dark:bg-[#1e2330] rounded-[32px] flex items-center justify-center mb-8 border border-slate-100 dark:border-slate-800 shadow-xl"
                  >
                     <Search size={40} className="text-slate-300 dark:text-slate-600" />
                  </motion.div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2 tracking-tighter">Ready for Intelligence</h3>
                  <p className="text-[13px] font-bold text-slate-400 max-w-sm">Select a document from history or upload a new one to begin your research journey.</p>
               </div>
             )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
