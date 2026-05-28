// AutoSelect Pro — PDF Viewer v6
(function(){'use strict';
if(!window.pdfjsLib){document.body.textContent='Missing pdf.min.js in extension folder';return;}
pdfjsLib.GlobalWorkerOptions.workerSrc='pdf.worker.min.js';

// ── State ──────────────────────────────────────────────────────────────────
let pdfDoc=null,scale=1.25,curPage=1,total=0,copies=0,lastText='';
let mode='block'; // block | paragraph | line | word | free
const filters={onlyNums:false,noNums:false,noSpecial:false};
let runtime={
  billingState:{plan:'free'},
  features:{isPro:false,recentsMax:0,pdfModes:['free']},
  settings:{pdfLineGapSplitEnabled:true,pdfLineGapThreshold:56,uiLanguage:'en'}
};
let locale='en';

const I18N={
  en:{
    title:'AutoSelect Pro — PDF Viewer',
    brandSub:'PDF Viewer',
    hideSidebar:'Hide sidebar',
    showSidebar:'Show sidebar',
    dropOverlayText:'Drop PDF here',
    uploadText:'Upload PDF',
    uploadHint:'or drag here',
    navSectionLabel:'Navigation',
    gotoPageLabel:'Go to page',
    zoomSectionLabel:'Zoom',
    copyTipLine1:'Hover = highlight block',
    copyTipLine2:'Click = copy instantly',
    modeSectionLabel:'Selection Mode',
    modeLabelBlock:'Block',
    modeLabelParagraph:'Paragraph',
    modeLabelLine:'Line',
    modeLabelWord:'Word',
    modeLabelFree:'Free',
    modeTitleBlock:'Text block',
    modeTitleParagraph:'Paragraph (same format)',
    modeTitleLine:'Text line',
    modeTitleWord:'Individual word',
    modeTitleFree:'Free mouse selection',
    filtersSectionLabel:'Extraction Filters',
    filterOnlyNums:'Numbers Only',
    filterNoNums:'No Numbers',
    filterNoSpecial:'No Symbols',
    filterTitleOnlyNums:'Extract numbers only',
    filterTitleNoNums:'Ignore all numbers',
    filterTitleNoSpecial:'Only letters and numbers (no symbols)',
    copiedStatLabel:'copied texts',
    welcomeTitle:'PDF Auto-Copy Viewer',
    welcomeDesc:'Upload a PDF, view it exactly as rendered, and select text to auto-copy.',
    btnUploadMainLabel:'Select PDF',
    welcomeOrText:'or drag and drop here',
    welcomeFeatLocal:'🔒 100% local — never uploaded to any server',
    welcomeFeatAutoCopy:'✅ Auto-copy on text selection',
    welcomeFeatVisual:'🎨 Exact PDF visual formatting preserved',
    recentsTitle:'Recent Documents',
    loadingMainText:'Processing PDF...',
    loadingProgressPreparing:'Preparing pages',
    eraserModeLabel:'Eraser Mode:',
    eraserParagraphLabel:'Paragraph',
    eraserLineLabel:'Line',
    eraserWordLabel:'Word',
    toastCopied:'Copied',
    toastEdited:'Edited: \"{{text}}\"',
    toastEmptySelection:'Empty selection',
    freeLimitReached:'Free limit reached. Upgrade to Pro for unlimited copies.',
    proFeatureLocked:'Pro feature is locked on Free plan.',
    tipShiftAdd:'SHIFT + CLICK = ADD',
    tipClickCopy:'CLICK = COPY',
    multiSelected:'{{count}} selected. Release SHIFT to copy all.',
    proAvailable:'Available in Pro',
    renderProgress:'Rendering {{current}} of {{total}}...',
    pageLabel:'Page {{page}}',
    openedOn:'Opened on {{date}}',
    removeFromHistory:'Remove from history',
    loadingReading:'Reading...',
    filePages:'{{count}} page{{suffix}}',
    scannedPdf:'Scanned PDF',
    scannedPdfNoText:'No real selectable text.',
    close:'Close'
  },
  es:{
    title:'AutoSelect Pro — Visor PDF',
    brandSub:'Visor PDF',
    hideSidebar:'Ocultar barra lateral',
    showSidebar:'Mostrar barra lateral',
    dropOverlayText:'Suelta el PDF aquí',
    uploadText:'Subir PDF',
    uploadHint:'o arrastra aquí',
    navSectionLabel:'Navegación',
    gotoPageLabel:'Ir a página',
    zoomSectionLabel:'Zoom',
    copyTipLine1:'Hover = resalta bloque',
    copyTipLine2:'Click = copia al instante',
    modeSectionLabel:'Modo de Selección',
    modeLabelBlock:'Bloque',
    modeLabelParagraph:'Párrafo',
    modeLabelLine:'Línea',
    modeLabelWord:'Palabra',
    modeLabelFree:'Libre',
    modeTitleBlock:'Bloque de texto',
    modeTitleParagraph:'Párrafo (mismo formato)',
    modeTitleLine:'Línea de texto',
    modeTitleWord:'Palabra individual',
    modeTitleFree:'Selección libre con mouse',
    filtersSectionLabel:'Filtros de Extracción',
    filterOnlyNums:'Solo Números',
    filterNoNums:'Sin Números',
    filterNoSpecial:'Sin Símbolos',
    filterTitleOnlyNums:'Extraer únicamente números',
    filterTitleNoNums:'Ignorar todos los números',
    filterTitleNoSpecial:'Solo letras y números (sin símbolos)',
    copiedStatLabel:'textos copiados',
    welcomeTitle:'PDF Auto-Copy Viewer',
    welcomeDesc:'Sube un PDF, visualízalo exactamente como luce y selecciona texto para copiarlo automáticamente.',
    btnUploadMainLabel:'Seleccionar PDF',
    welcomeOrText:'o arrastra y suelta aquí',
    welcomeFeatLocal:'🔒 100% local — no se sube a ningún servidor',
    welcomeFeatAutoCopy:'✅ Auto-copy al seleccionar texto',
    welcomeFeatVisual:'🎨 Formato visual exacto del PDF preservado',
    recentsTitle:'Documentos Recientes',
    loadingMainText:'Procesando PDF...',
    loadingProgressPreparing:'Preparando páginas',
    eraserModeLabel:'Modo Borrador:',
    eraserParagraphLabel:'Párrafo',
    eraserLineLabel:'Línea',
    eraserWordLabel:'Palabra',
    toastCopied:'Copiado',
    toastEdited:'Editado: \"{{text}}\"',
    toastEmptySelection:'Selección vacía',
    freeLimitReached:'Límite Free alcanzado. Activa Pro para copias ilimitadas.',
    proFeatureLocked:'Función Pro bloqueada en Free.',
    tipShiftAdd:'SHIFT + CLICK = AÑADIR',
    tipClickCopy:'CLICK = COPIAR',
    multiSelected:'{{count}} seleccionados. Suelta SHIFT para copiar todo.',
    proAvailable:'Disponible en Pro',
    renderProgress:'Renderizando {{current}} de {{total}}…',
    pageLabel:'Página {{page}}',
    openedOn:'Abierto el {{date}}',
    removeFromHistory:'Eliminar del historial',
    loadingReading:'Leyendo…',
    filePages:'{{count}} página{{suffix}}',
    scannedPdf:'PDF escaneado',
    scannedPdfNoText:'Sin texto real seleccionable.',
    close:'Cerrar'
  }
};

function t(key,vars={}){
  const dict=I18N[locale]||I18N.en;
  const base=dict[key]??I18N.en[key]??key;
  return Object.entries(vars).reduce((acc,[name,val])=>acc.replaceAll(`{{${name}}}`,String(val)),base);
}

function setTxt(id,key,vars={}){
  const node=document.getElementById(id);
  if(!node)return;
  node.textContent=t(key,vars);
}

// Multi-select state
let isShiftDown=false, isCtrlDown=false;
let multiSelectItems=[];
let multiSelectOverlays=[];
let activeCopyOverlays=[];
let activeCopyTimer=null;
let currentCopiedText="";
let eraserMode='word';

function activateRecentSelection(overlays){
  clearTimeout(activeCopyTimer);
  activeCopyOverlays.forEach(o=>o.classList.remove('block-active-copy'));
  activeCopyOverlays=[...overlays];
  activeCopyOverlays.forEach(o=>o.classList.add('block-active-copy'));
  activeCopyTimer=setTimeout(()=>{
    activeCopyOverlays.forEach(o=>o.classList.remove('block-active-copy'));
    activeCopyOverlays=[];
  },5000);
}

// ── DOM ────────────────────────────────────────────────────────────────────
const $=id=>document.getElementById(id);
const el={layout:$('appLayout'),sidebar:$('viewerSidebar'),bhs:$('btnHideSidebar'),bss:$('btnShowSidebar'),fi:$('fileInput'),uz:$('uploadZone'),bum:$('btnUploadMain'),finfo:$('fileInfo'),fn:$('fileName'),fp:$('filePages'),ctrl:$('controls'),bp:$('btnPrev'),bn:$('btnNext'),cp:$('currentPage'),tp:$('totalPages'),gp:$('gotoPage'),bzi:$('btnZoomIn'),bzo:$('btnZoomOut'),zv:$('zoomValue'),ws:$('welcomeScreen'),ls:$('loadingScreen'),lp:$('loadingProgress'),pc:$('pdfContainer'),pw:$('pagesWrapper'),dov:$('dropOverlay'),ct:$('copyToast'),tt:$('toastText'),sc:$('statCopied')};
const SIDEBAR_STORAGE_KEY='aspPdfSidebarHidden';

function applyLocalization(){
  document.documentElement.lang=locale;
  document.title=t('title');
  setTxt('dropOverlayText','dropOverlayText');
  setTxt('brandSub','brandSub');
  setTxt('uploadText','uploadText');
  setTxt('uploadHint','uploadHint');
  setTxt('navSectionLabel','navSectionLabel');
  setTxt('gotoPageLabel','gotoPageLabel');
  setTxt('zoomSectionLabel','zoomSectionLabel');
  setTxt('copyTipLine1','copyTipLine1');
  setTxt('copyTipLine2','copyTipLine2');
  setTxt('modeSectionLabel','modeSectionLabel');
  setTxt('modeLabelBlock','modeLabelBlock');
  setTxt('modeLabelParagraph','modeLabelParagraph');
  setTxt('modeLabelLine','modeLabelLine');
  setTxt('modeLabelWord','modeLabelWord');
  setTxt('modeLabelFree','modeLabelFree');
  setTxt('filtersSectionLabel','filtersSectionLabel');
  setTxt('filterOnlyNums','filterOnlyNums');
  setTxt('filterNoNums','filterNoNums');
  setTxt('filterNoSpecial','filterNoSpecial');
  setTxt('copiedStatLabel','copiedStatLabel');
  setTxt('welcomeTitle','welcomeTitle');
  setTxt('welcomeDesc','welcomeDesc');
  setTxt('btnUploadMainLabel','btnUploadMainLabel');
  setTxt('welcomeOrText','welcomeOrText');
  setTxt('welcomeFeatLocal','welcomeFeatLocal');
  setTxt('welcomeFeatAutoCopy','welcomeFeatAutoCopy');
  setTxt('welcomeFeatVisual','welcomeFeatVisual');
  setTxt('recentsTitle','recentsTitle');
  setTxt('loadingMainText','loadingMainText');
  setTxt('eraserModeLabel','eraserModeLabel');
  setTxt('eraserParagraphLabel','eraserParagraphLabel');
  setTxt('eraserLineLabel','eraserLineLabel');
  setTxt('eraserWordLabel','eraserWordLabel');
  setTxt('toastText','toastCopied');

  if(el.bhs){el.bhs.title=t('hideSidebar');el.bhs.setAttribute('aria-label',t('hideSidebar'));}
  if(el.bss){el.bss.title=t('showSidebar');el.bss.setAttribute('aria-label',t('showSidebar'));}

  const modes={
    block:'modeTitleBlock',
    paragraph:'modeTitleParagraph',
    line:'modeTitleLine',
    word:'modeTitleWord',
    free:'modeTitleFree'
  };
  document.querySelectorAll('#modeSelector .mode-btn').forEach((btn)=>{
    const key=modes[btn.dataset.mode];
    if(key)btn.title=t(key);
  });

  const filtersMap={
    onlyNums:'filterTitleOnlyNums',
    noNums:'filterTitleNoNums',
    noSpecial:'filterTitleNoSpecial'
  };
  document.querySelectorAll('.filter-btn').forEach((btn)=>{
    const key=filtersMap[btn.dataset.filter];
    if(key)btn.title=t(key);
  });

  if(!pdfDoc)el.lp.textContent=t('loadingProgressPreparing');
}

function setSidebarHidden(hidden, persist=true){
  el.layout?.classList.toggle('sidebar-hidden',hidden);
  if(el.sidebar){
    el.sidebar.setAttribute('aria-hidden',hidden?'true':'false');
    el.sidebar.inert=hidden;
  }
  el.bhs?.setAttribute('aria-expanded',hidden?'false':'true');
  el.bss?.setAttribute('aria-expanded',hidden?'false':'true');
  el.bss?.setAttribute('tabindex',hidden?'0':'-1');
  if(persist){
    try{localStorage.setItem(SIDEBAR_STORAGE_KEY,hidden?'1':'0');}catch{}
  }
}

function restoreSidebarState(){
  let hidden=false;
  try{hidden=localStorage.getItem(SIDEBAR_STORAGE_KEY)==='1';}catch{}
  setSidebarHidden(hidden,false);
}

async function loadRuntime(){
  if(typeof chrome==='undefined'||!chrome.runtime)return;
  const response=await chrome.runtime.sendMessage({type:'GET_RUNTIME_STATE'}).catch(()=>null);
  if(response?.ok&&response.runtime){
    runtime={
      ...response.runtime,
      settings:{
        pdfLineGapSplitEnabled:true,
        pdfLineGapThreshold:56,
        ...(response.runtime.settings||{})
      }
    };
    locale=runtime?.settings?.uiLanguage==='es'?'es':'en';
    applyLocalization();
    applyPlanUiLocks();
  }
}

function trackPageView(){
  chrome?.runtime?.sendMessage({
    type:'TRACK_EVENT',
    eventType:'page_view',
    metadata:{
      context:'pdf_viewer',
      pageTitle:document.title,
      pageLocation:location.href,
      pagePath:location.pathname
    }
  }).catch(()=>{});
}

function applyPlanUiLocks(){
  const isPro=!!runtime?.features?.isPro;
  mode=isPro?'block':'free';
  document.querySelectorAll('#modeSelector .mode-btn').forEach(btn=>{
    const m=btn.dataset.mode;
    const allowed=(runtime?.features?.pdfModes||['free']).includes(m);
    btn.disabled=!allowed;
    btn.classList.toggle('active',m===mode);
    btn.title=allowed?btn.title:t('proAvailable');
  });
  document.querySelectorAll('.filter-btn').forEach(btn=>{
    btn.disabled=!isPro;
    if(!isPro){btn.classList.remove('active');}
  });
  filters.onlyNums=false;filters.noNums=false;filters.noSpecial=false;
}

// ── Filter logic ───────────────────────────────────────────────────────────
function applyFilters(t){
  if(!t) return '';
  if(filters.onlyNums) return t.replace(/[^0-9.,\s$€£¥¢]/g,'').replace(/\s+/g,' ').trim();
  if(filters.noNums)   t=t.replace(/(?:[$€£¥¢]\s*)?(?:\d+(?:[.,]\d+)*|\.\d+)(?:\s*[$€£¥¢])?/g,'');
  if(filters.noSpecial) t=t.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚüÜñÑ\s.,;:!?'"()\-]/g,'');
  return t.replace(/\s+/g,' ').trim();
}

// ── Copy ───────────────────────────────────────────────────────────────────
async function copyText(raw, isEdit=false){
  if(!runtime?.features?.isPro && mode!=='free'){
    showProLocked('pdf_mode_locked');
    return;
  }
  if(!isEdit){
    const gate=await requestCopyQuota('pdf');
    if(!gate.allowed){
      showProLocked(gate.reason||'daily_limit_reached');
      return;
    }
  }
  const text=applyFilters(raw);
  if(!text) return;
  try{await navigator.clipboard.writeText(text);}
  catch{const ta=Object.assign(document.createElement('textarea'),{value:text});ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.focus();ta.select();document.execCommand('copy');ta.remove();}
  lastText=text; 
  if(!isEdit){ copies++; el.sc.textContent=copies; currentCopiedText=text; }else{ currentCopiedText=text; }
  const prev=text.length>55?text.slice(0,55)+'…':text;
  el.tt.textContent=isEdit ? t('toastEdited',{text:prev}) : `"${prev}"`;
  el.ct.classList.add('show');
  clearTimeout(el.ct._t);
  el.ct._t=setTimeout(()=>el.ct.classList.remove('show'),2500);
}

async function requestCopyQuota(context){
  if(!chrome?.runtime)return {allowed:false,reason:'quota_unavailable'};
  const response=await chrome.runtime.sendMessage({type:'REQUEST_AUTO_COPY_ALLOWED',context}).catch(()=>null);
  if(!response?.ok)return {allowed:false,reason:'quota_unavailable'};
  return {
    allowed:response.result?.ok!==false,
    reason:response.result?.reason||null
  };
}

function showProLocked(reason){
  el.tt.textContent=reason==='daily_limit_reached'
    ? t('freeLimitReached')
    : t('proFeatureLocked');
  el.ct.classList.add('show');
  clearTimeout(el.ct._t);
  el.ct._t=setTimeout(()=>el.ct.classList.remove('show'),2600);
  chrome?.runtime?.sendMessage({
    type:'TRACK_EVENT',
    eventType:'paywall_shown',
    metadata:{context:'pdf',reason}
  }).catch(()=>{});
}

// ── Tooltip ────────────────────────────────────────────────────────────────
let tipEl=null;
function showTip(ov,text,isMulti){
  removeTip();
  tipEl=document.createElement('div');
  tipEl.className='block-tooltip';
  const prev=text.length>40?text.slice(0,40)+'…':text;
  const action=isShiftDown?t('tipShiftAdd'):t('tipClickCopy');
  const badgeCls=isShiftDown?'tip-d':'tip-c';
  const row=document.createElement('div');
  row.className='tip-row';
  const badge=document.createElement('span');
  badge.className=`tip-badge ${badgeCls}`;
  badge.textContent=action;
  const preview=document.createElement('span');
  preview.className='tip-preview';
  preview.textContent=`"${prev}"`;
  row.append(badge,preview);
  tipEl.appendChild(row);
  const top=parseFloat(ov.style.top)-34;
  tipEl.style.cssText=`position:absolute;top:${top}px;left:${parseFloat(ov.style.left)}px;z-index:20;`;
  tipEl.addEventListener('mouseleave',()=>{if(!ov.classList.contains('block-multiselect')) ov.classList.remove('block-hover');removeTip();});
  ov.parentElement.appendChild(tipEl);
}
function removeTip(){tipEl?.remove();tipEl=null;}

function getWordsFromOverlay(ov) {
  if (ov.parentElement.classList.contains('ov-layer-word')) return [ov];
  const wrapper = ov.closest('.ov-layer').parentElement;
  const wordLayer = wrapper.querySelector('.ov-layer-word');
  if (!wordLayer) return [ov];
  
  const words = Array.from(wordLayer.querySelectorAll('.block-overlay'));
  const oL = parseFloat(ov.style.left), oT = parseFloat(ov.style.top);
  const oR = oL + parseFloat(ov.style.width), oB = oT + parseFloat(ov.style.height);
  
  return words.filter(w => {
    const wL = parseFloat(w.style.left), wT = parseFloat(w.style.top);
    const wR = wL + parseFloat(w.style.width), wB = wT + parseFloat(w.style.height);
    return !(wL > oR - 1 || wR < oL + 1 || wT > oB - 1 || wB < oT + 1);
  });
}

// ── Overlay factory ────────────────────────────────────────────────────────
function makeOverlay(container,top,left,bottom,right,radius,text){
  const w=right-left,h=bottom-top;if(w<2||h<2)return null;
  const ov=document.createElement('div');
  ov.className='block-overlay';
  ov.dataset.text=text;
  ov.style.cssText=`position:absolute;top:${top}px;left:${left}px;width:${w}px;height:${h}px;border-radius:${radius}px;pointer-events:all;cursor:pointer;border:1.5px solid transparent;transition:background .1s,border-color .1s,box-shadow .1s;`;
  
  ov.addEventListener('mouseenter',()=>{
    ov.classList.add('block-hover');
    showTip(ov,text);
  });
  ov.addEventListener('mouseleave',e=>{
    if(!e.relatedTarget?.closest?.('.block-tooltip')){
      if(!ov.classList.contains('block-multiselect')) ov.classList.remove('block-hover');
      removeTip();
    }
  });
  ov.addEventListener('click',async e=>{
    e.stopPropagation();
    if(isCtrlDown){
      if(currentCopiedText.length > 0){
        const textToRemove = ov.dataset.text;
        if(currentCopiedText.includes(textToRemove)){
          currentCopiedText = currentCopiedText.replace(textToRemove, '');
          currentCopiedText = currentCopiedText.replace(/[ \n]+/g, ' ').trim();
          await copyText(currentCopiedText, true);
          ov.classList.remove('block-hover');
          ov.classList.add('block-copied-red');
          setTimeout(() => ov.classList.remove('block-copied-red'), 700);
          
          const wordsToRemove = getWordsFromOverlay(ov);
          activeCopyOverlays = activeCopyOverlays.filter(w => !wordsToRemove.includes(w));
          activateRecentSelection(activeCopyOverlays);
        }
      }
      return;
    }
    
    if(isShiftDown){
      // Toggle multiselect
      if(ov.classList.contains('block-multiselect')){
        ov.classList.remove('block-multiselect');
        ov.classList.remove('block-hover');
        multiSelectItems=multiSelectItems.filter(t=>t!==text);
        multiSelectOverlays=multiSelectOverlays.filter(o=>o!==ov);
      }else{
        ov.classList.add('block-multiselect');
        multiSelectItems.push(text);
        multiSelectOverlays.push(ov);
      }
      updateMultiSelectBadge();
      
      if(multiSelectItems.length > 0) {
        const joinStr = mode === 'word' ? ' ' : '\n';
        await copyText(multiSelectItems.join(joinStr), true);
      } else {
        el.tt.textContent = t('toastEmptySelection');
        el.ct.classList.add('show');
        setTimeout(()=>el.ct.classList.remove('show'),2500);
      }
    }else{
      await copyText(text);
      flashOv(ov);
      activateRecentSelection(getWordsFromOverlay(ov));
    }
  });
  container.appendChild(ov);return ov;
}

function flashOv(ov){
  ov.classList.remove('block-hover');
  ov.classList.add('block-copied');
  removeTip();
  setTimeout(()=>ov.classList.remove('block-copied'),700);
}

function getPdfLineGapThreshold(){
  const value=Number(runtime?.settings?.pdfLineGapThreshold);
  return Number.isFinite(value)?Math.max(0,value):56;
}

function splitSpanByWhitespaceGap(span,gapThreshold){
  if(!runtime?.settings?.pdfLineGapSplitEnabled || !/\s{3,}/.test(span.text)) return [span];
  const tokens=span.text.match(/\S+|\s+/g)||[];
  const totalChars=tokens.reduce((sum,t)=>sum+t.length,0)||1;
  const charW=span.width/totalChars;
  const pieces=[];
  let x=span.left;
  tokens.forEach(token=>{
    const tokenW=token.length*charW;
    if(/\S/.test(token)){
      pieces.push({
        ...span,
        text:token,
        left:x,
        right:x+tokenW,
        width:tokenW
      });
    }
    x+=tokenW;
  });
  return pieces.length?pieces:[span];
}

function splitLineByGaps(line){
  if(!runtime?.settings?.pdfLineGapSplitEnabled) return [line];
  const gapThreshold=getPdfLineGapThreshold();
  const parts=line
    .flatMap(span=>splitSpanByWhitespaceGap(span,gapThreshold))
    .sort((a,b)=>a.left-b.left);
  if(!parts.length) return [];
  const segments=[];let cur=[parts[0]];
  for(let i=1;i<parts.length;i++){
    const prev=cur[cur.length-1];
    const gap=parts[i].left-prev.right;
    if(gap>gapThreshold){
      segments.push(cur);
      cur=[parts[i]];
    }else{
      cur.push(parts[i]);
    }
  }
  segments.push(cur);
  return segments;
}

// ── Shift Multiselect UI ───────────────────────────────────────────────────
function updateMultiSelectBadge(){
  let b=$('msBadge');
  if(multiSelectItems.length>0){
    if(!b){
      b=document.createElement('div');b.id='msBadge';
      b.style.cssText='position:fixed;top:24px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;padding:10px 20px;border-radius:24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-weight:700;font-size:13px;box-shadow:0 8px 32px rgba(37,99,235,0.4);z-index:9999;';
      document.body.appendChild(b);
    }
    b.textContent=t('multiSelected',{count:multiSelectItems.length});
  }else{
    if(b)b.remove();
  }
}
async function finishMultiSelect(){
  if(multiSelectItems.length>0){
    const joinStr=mode==='word'?' ':'\n';
    await copyText(multiSelectItems.join(joinStr));
    multiSelectOverlays.forEach(o=>flashOv(o));
    
    const allWords = multiSelectOverlays.flatMap(o => getWordsFromOverlay(o));
    activateRecentSelection(allWords);
    
    multiSelectOverlays.forEach(o=>o.classList.remove('block-multiselect'));
  }
  multiSelectItems=[];
  multiSelectOverlays=[];
  updateMultiSelectBadge();
}

// ── Build overlays per page ────────────────────────────────────────────────
function buildOverlays(wrapper,textDiv){
  const wR=wrapper.getBoundingClientRect();
  
  // 4 overlay layers
  ['block','paragraph','line','word'].forEach(layerMode=>{
    let layer=wrapper.querySelector(`.ov-layer-${layerMode}`);
    if(!layer){
      layer=document.createElement('div');
      layer.className=`ov-layer-${layerMode} ov-layer`;
      layer.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:12;';
      layer.style.display=(layerMode===mode&&mode!=='free')?'block':'none';
      wrapper.appendChild(layer);
    }
    layer.innerHTML='';
  });

  const spans=[...textDiv.querySelectorAll('span')]
    .map(s=>{const t=s.textContent||'';if(!t.trim())return null;const r=s.getBoundingClientRect();if(r.width<1||r.height<1)return null;const fmt=Math.round(r.height)+'_'+(s.style.fontFamily||'');return{text:t,top:r.top-wR.top,left:r.left-wR.left,bottom:r.bottom-wR.top,right:r.right-wR.left,height:r.height,width:r.width,midY:(r.top+r.bottom)/2-wR.top,fmt:fmt};})
    .filter(Boolean);
  if(!spans.length)return;

  const avgH=spans.reduce((s,d)=>s+d.height,0)/spans.length;
  const lineThr=avgH*0.55;

  // Group into lines
  const usedS=new Set();const lines=[];
  [...spans].sort((a,b)=>a.midY-b.midY).forEach(s=>{
    if(usedS.has(s))return;
    const line=[s];usedS.add(s);
    spans.forEach(o=>{if(!usedS.has(o)&&Math.abs(o.midY-s.midY)<=lineThr){line.push(o);usedS.add(o);}});
    line.sort((a,b)=>a.left-b.left);lines.push(line);
  });
  lines.sort((a,b)=>Math.min(...a.map(s=>s.top))-Math.min(...b.map(s=>s.top)));

  // Group into blocks
  const blocks=[];let cur=[lines[0]];
  for(let i=1;i<lines.length;i++){
    const prevBot=Math.max(...cur[cur.length-1].map(s=>s.bottom));
    const curTop=Math.min(...lines[i].map(s=>s.top));
    if(curTop-prevBot>avgH*1.8){blocks.push(cur);cur=[lines[i]];}else cur.push(lines[i]);
  }
  blocks.push(cur);

  // Group into paragraphs (same format)
  lines.forEach(line=>{
    const fmts={};
    line.forEach(s=>{fmts[s.fmt]=(fmts[s.fmt]||0)+1;});
    line.fmt=Object.keys(fmts).reduce((a,b)=>fmts[a]>fmts[b]?a:b);
  });
  const paragraphs=[];let curP=[lines[0]];
  for(let i=1;i<lines.length;i++){
    const prevBot=Math.max(...curP[curP.length-1].map(s=>s.bottom));
    const curTop=Math.min(...lines[i].map(s=>s.top));
    if(lines[i].fmt!==curP[0].fmt || curTop-prevBot>avgH*2.5){paragraphs.push(curP);curP=[lines[i]];}else curP.push(lines[i]);
  }
  paragraphs.push(curP);

  // BLOCK
  const layerB=wrapper.querySelector('.ov-layer-block');
  blocks.forEach(block=>{
    const allS=block.flat();const text=allS.map(s=>s.text).join(' ').replace(/\s+/g,' ').trim();if(!text)return;
    makeOverlay(layerB,Math.min(...allS.map(s=>s.top))-4,Math.min(...allS.map(s=>s.left))-6,Math.max(...allS.map(s=>s.bottom))+4,Math.max(...allS.map(s=>s.right))+6,6,text);
  });

  // PARAGRAPH
  const layerP=wrapper.querySelector('.ov-layer-paragraph');
  paragraphs.forEach(para=>{
    const allS=para.flat();const text=allS.map(s=>s.text).join(' ').replace(/\s+/g,' ').trim();if(!text)return;
    makeOverlay(layerP,Math.min(...allS.map(s=>s.top))-4,Math.min(...allS.map(s=>s.left))-6,Math.max(...allS.map(s=>s.bottom))+4,Math.max(...allS.map(s=>s.right))+6,6,text);
  });

  // LINE
  const layerL=wrapper.querySelector('.ov-layer-line');
  lines.forEach(line=>{
    splitLineByGaps(line).forEach(segment=>{
      const text=segment.map(s=>s.text).join(' ').replace(/\s+/g,' ').trim();if(!text)return;
      makeOverlay(layerL,Math.min(...segment.map(s=>s.top))-2,Math.min(...segment.map(s=>s.left))-4,Math.max(...segment.map(s=>s.bottom))+2,Math.max(...segment.map(s=>s.right))+4,4,text);
    });
  });

  // WORD
  const layerW=wrapper.querySelector('.ov-layer-word');
  const cv=document.createElement('canvas');const ctx=cv.getContext('2d');
  spans.forEach(span=>{
    const words=span.text.split(/\s+/).filter(w=>w);if(!words.length)return;
    ctx.font=`${span.height}px sans-serif`;const totalMW=ctx.measureText(span.text).width||1;const sc=span.width/totalMW;
    let x=span.left;
    words.forEach((word,i)=>{
      const ww=ctx.measureText(word).width*sc;
      makeOverlay(layerW,span.top-1,x-2,span.bottom+1,x+ww+2,3,word);
      x+=ww+(i<words.length-1?ctx.measureText(' ').width*sc:0);
    });
  });
}

// ── Render ─────────────────────────────────────────────────────────────────
async function renderAll(){
  el.pw.innerHTML='';let hasText=false;
  for(let pn=1;pn<=total;pn++){
    el.lp.textContent=t('renderProgress',{current:pn,total});
    const page=await pdfDoc.getPage(pn);const vp=page.getViewport({scale});
    const wrap=document.createElement('div');
    wrap.className='pdf-page-wrapper';wrap.id=`page-${pn}`;
    wrap.style.width=vp.width+'px';wrap.style.height=vp.height+'px';
    const lbl=document.createElement('div');lbl.className='pdf-page-label';lbl.textContent=t('pageLabel',{page:pn});wrap.appendChild(lbl);
    const cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;wrap.appendChild(cv);
    const td=document.createElement('div');td.className='textLayer';td.style.setProperty('--scale-factor',scale);wrap.appendChild(td);
    el.pw.appendChild(wrap);
    await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
    try{
      const tc=await page.getTextContent();
      const r=pdfjsLib.renderTextLayer({textContentSource:tc,container:td,viewport:vp,textDivs:[]});
      await(r?.promise??r);
      if(tc.items.some(i=>i.str?.trim())){hasText=true;setTimeout(()=>buildOverlays(wrap,td),100);}
    }catch(e){console.warn('[PDF]',e);}
  }
  if(!hasText) showImgBanner();
}

// ── IndexedDB Recents ──────────────────────────────────────────────────────
const DB_NAME='AutoSelectPro_DB', DB_VERSION=1, STORE_NAME='recents';
let db;
function initDB(){
  return new Promise((res,rej)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=e=>{
      let d=e.target.result;
      if(!d.objectStoreNames.contains(STORE_NAME)) d.createObjectStore(STORE_NAME,{keyPath:'id'});
    };
    req.onsuccess=e=>{db=e.target.result;res();};
    req.onerror=rej;
  });
}
async function saveRecent(file,buf){
  const max=runtime?.features?.recentsMax??0;
  if(max<=0)return;
  if(!db) await initDB();
  return new Promise(res=>{
    const tx=db.transaction(STORE_NAME,'readwrite');
    const st=tx.objectStore(STORE_NAME);
    st.getAll().onsuccess=e=>{
      let r=e.target.result; r.sort((a,b)=>b.id-a.id);
      if(r.length>=max){for(let i=max-1;i<r.length;i++) st.delete(r[i].id);}
      st.put({id:Date.now(),name:file.name,size:file.size,data:buf});
      res();
    };
  });
}
async function getRecents(){
  if(!db) await initDB();
  return new Promise(res=>{
    db.transaction(STORE_NAME).objectStore(STORE_NAME).getAll().onsuccess=e=>{
      let r=e.target.result; r.sort((a,b)=>b.id-a.id); res(r);
    };
  });
}
async function deleteRecent(id){
  if(!db) await initDB();
  return new Promise(res=>{
    db.transaction(STORE_NAME,'readwrite').objectStore(STORE_NAME).delete(id).onsuccess=res;
  });
}
async function renderRecentList(){
  if((runtime?.features?.recentsMax??0)<=0){
    const rs=document.getElementById('recentsSection');
    if(rs)rs.style.display='none';
    return;
  }
  const recents=await getRecents();
  const rs=document.getElementById('recentsSection');
  const rl=document.getElementById('recentsList');
  if(!recents.length){ rs.style.display='none'; return; }
  rs.style.display='block'; rl.innerHTML='';
  recents.forEach(r=>{
    const div=document.createElement('div'); div.className='recent-item';
    const mb=(r.size/(1024*1024)).toFixed(2);
    const date=new Date(r.id).toLocaleDateString();
    div.innerHTML=`
      <div class="recent-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg></div>
      <div class="recent-info">
        <div class="recent-name"></div>
        <div class="recent-meta">${mb} MB • ${t('openedOn',{date})}</div>
      </div>
      <button class="recent-del" title="${t('removeFromHistory')}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
    `;
    const nameEl=div.querySelector('.recent-name');
    nameEl.textContent=r.name;
    nameEl.title=r.name;
    div.addEventListener('click', e=>{
      if(e.target.closest('.recent-del')){
        e.stopPropagation(); deleteRecent(r.id).then(renderRecentList);
      } else {
        loadPDF({name:r.name, size:r.size}, true, r.data);
      }
    });
    rl.appendChild(div);
  });
}

// ── Load ───────────────────────────────────────────────────────────────────
async function loadPDF(file, fromRecent=false, buffer=null){
  showScreen('loading');el.lp.textContent=t('loadingReading');el.pw.innerHTML='';
  try{
    const buf = fromRecent ? buffer : await file.arrayBuffer();
    pdfDoc=await pdfjsLib.getDocument({data:buf}).promise;
    if(!fromRecent) { saveRecent(file, buf).then(renderRecentList); }
  }catch(e){el.lp.textContent='⚠️ '+e.message;setTimeout(()=>showScreen('welcome'),3000);return;}
  total=pdfDoc.numPages;
  el.fn.textContent=file.name;el.fp.textContent=t('filePages',{count:total,suffix:total!==1?'s':''});
  el.finfo.style.display=el.ctrl.style.display='block';
  el.tp.textContent=total;el.gp.max=total;el.bp.disabled=true;el.bn.disabled=total<=1;
  showScreen('pdf');await renderAll();curPage=1;updatePageUI();
}

// ── Nav/Zoom ───────────────────────────────────────────────────────────────
function goTo(n){if(!pdfDoc||n<1||n>total)return;curPage=n;updatePageUI();document.getElementById(`page-${n}`)?.scrollIntoView({behavior:'smooth',block:'start'});}
function updatePageUI(){el.cp.textContent=curPage;el.gp.value=curPage;el.bp.disabled=curPage<=1;el.bn.disabled=curPage>=total;}
async function setZoom(s){scale=s;el.zv.textContent=Math.round(s*100)+'%';document.querySelectorAll('.zp').forEach(b=>b.classList.toggle('active',parseFloat(b.dataset.z)===s));if(pdfDoc){await renderAll();updatePageUI();}}

// ── Manual copy (free mode + manual shift multiselect) ─────────────────────
function setupManual(){
  let deb=null;const trigger=()=>{clearTimeout(deb);deb=setTimeout(async()=>{const t=window.getSelection()?.toString().trim();if(!t||t.length<2||t===lastText)return;if(isShiftDown){multiSelectItems.push(t);updateMultiSelectBadge();}else{await copyText(t);}},120);};
  document.addEventListener('mouseup',()=>{if(mode==='free')trigger();});
}

// ── Events ─────────────────────────────────────────────────────────────────
function bindEvents(){
  el.bhs?.addEventListener('click',()=>setSidebarHidden(true));
  el.bss?.addEventListener('click',()=>setSidebarHidden(false));
  el.fi.addEventListener('change',e=>{if(e.target.files[0])loadPDF(e.target.files[0]);});
  el.uz.addEventListener('click',()=>el.fi.click());
  el.bum.addEventListener('click',()=>el.fi.click());
  document.addEventListener('dragover',e=>{e.preventDefault();el.dov.classList.add('active');});
  document.addEventListener('dragleave',e=>{if(!e.relatedTarget)el.dov.classList.remove('active');});
  document.addEventListener('drop',e=>{e.preventDefault();el.dov.classList.remove('active');const f=e.dataTransfer.files[0];if(f?.type==='application/pdf')loadPDF(f);});
  el.bp.addEventListener('click',()=>goTo(curPage-1));
  el.bn.addEventListener('click',()=>goTo(curPage+1));
  el.gp.addEventListener('change',()=>{const p=parseInt(el.gp.value);if(p>=1&&p<=total)goTo(p);});
  el.bzi.addEventListener('click',()=>setZoom(Math.min(scale+0.25,3)));
  el.bzo.addEventListener('click',()=>setZoom(Math.max(scale-0.25,0.5)));
  document.querySelectorAll('.zp').forEach(b=>b.addEventListener('click',()=>setZoom(parseFloat(b.dataset.z))));
  
  // Key handling for SHIFT, CTRL and Navigation
  const updateEraserLayer = () => {
    document.querySelectorAll('.ov-layer').forEach(l=>l.classList.remove('eraser-active'));
    document.querySelectorAll(`.ov-layer-${eraserMode}`).forEach(l=>l.classList.add('eraser-active'));
  };

  document.addEventListener('keydown',e=>{
    if(e.target.tagName==='INPUT')return;
    if(e.repeat) return;
    
    if(e.key==='Shift') {
      if(!runtime?.features?.pdfMultiSelect){showProLocked('pdf_multiselect_locked');return;}
      isShiftDown = !isShiftDown;
      if(isShiftDown) {
        document.body.classList.add('shift-pressed');
      } else {
        document.body.classList.remove('shift-pressed');
        finishMultiSelect();
      }
      return;
    }
    if(e.key==='Control'||e.key==='Meta'){
      if(!runtime?.features?.pdfEraser){showProLocked('pdf_eraser_locked');return;}
      isCtrlDown = !isCtrlDown;
      if(isCtrlDown) {
        document.body.classList.add('ctrl-pressed');
        updateEraserLayer();
      } else {
        document.body.classList.remove('ctrl-pressed');
      }
      return;
    }
    
    if(e.key==='ArrowRight'||e.key==='ArrowDown')goTo(curPage+1);
    if(e.key==='ArrowLeft'||e.key==='ArrowUp')goTo(curPage-1);
    if(e.key==='+'||e.key==='=')setZoom(Math.min(scale+0.25,3));
    if(e.key==='-')setZoom(Math.max(scale-0.25,0.5));
  });

  // Eraser mode buttons
  document.getElementById('eraserUI')?.addEventListener('click',e=>{
    const btn=e.target.closest('.eraser-btn');if(!btn)return;
    eraserMode=btn.dataset.mode;
    document.querySelectorAll('#eraserUI .eraser-btn').forEach(b=>b.classList.toggle('active',b===btn));
    updateEraserLayer();
  });

  // Mode buttons
  document.getElementById('modeSelector')?.addEventListener('click',e=>{
    const btn=e.target.closest('.mode-btn');if(!btn)return;
    if(btn.disabled){showProLocked('pdf_mode_locked');return;}
    mode=btn.dataset.mode;
    document.querySelectorAll('#modeSelector .mode-btn').forEach(b=>b.classList.toggle('active',b===btn));
    
    // Maintain multiselect state but switch visible layer
    document.querySelectorAll('.ov-layer').forEach(l=>{
      if(mode==='free'){
        l.style.display='none';
      }else{
        l.style.display=l.classList.contains(`ov-layer-${mode}`)?'block':'none';
        // Keep multiselect items highlighted even if layer is hidden/shown
      }
    });
  });

  // Filter toggles
  document.querySelectorAll('.filter-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(btn.disabled){showProLocked('pdf_filter_locked');return;}
      const f=btn.dataset.filter;
      if(f==='onlyNums'&&!filters.onlyNums){filters.noNums=false;document.querySelector('[data-filter="noNums"]')?.classList.remove('active');}
      if(f==='noNums'&&!filters.noNums){filters.onlyNums=false;document.querySelector('[data-filter="onlyNums"]')?.classList.remove('active');}
      filters[f]=!filters[f];
      btn.classList.toggle('active',filters[f]);
    });
  });

  document.addEventListener('scroll',()=>{if(!pdfDoc)return;for(let i=1;i<=total;i++){const r=document.getElementById(`page-${i}`)?.getBoundingClientRect();if(r&&r.top>=0&&r.top<window.innerHeight/2){if(curPage!==i){curPage=i;updatePageUI();}break;}}},{passive:true});
}

function showImgBanner(){
  if(document.getElementById('ib'))return;
  const b=document.createElement('div');
  b.id='ib';
  b.style.cssText='position:fixed;bottom:80px;right:20px;z-index:9999;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.5);border-radius:12px;padding:14px 18px;color:#fbbf24;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;max-width:280px;box-shadow:0 8px 24px rgba(0,0,0,.4)';
  const title=document.createElement('strong');
  title.textContent=t('scannedPdf');
  const detail=document.createElement('span');
  detail.style.cssText='display:block;font-size:12px;opacity:.85;margin-top:2px';
  detail.textContent=t('scannedPdfNoText');
  const close=document.createElement('button');
  close.type='button';
  close.textContent=t('close');
  close.style.cssText='margin-top:8px;width:100%;background:transparent;border:1px solid rgba(245,158,11,.3);border-radius:6px;color:#fbbf24;font-size:11px;padding:5px;cursor:pointer';
  close.addEventListener('click',()=>b.remove());
  b.append(title,detail,close);
  document.body.appendChild(b);
}
function showScreen(w){el.ws.style.display=w==='welcome'?'flex':'none';el.ls.style.display=w==='loading'?'flex':'none';el.pc.style.display=w==='pdf'?'flex':'none';}

applyLocalization();

(async()=>{
  await loadRuntime();
  trackPageView();
  restoreSidebarState();
  bindEvents();
  setupManual();
  renderRecentList();
})();
})();
