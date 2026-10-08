import * as pdfjsLib from './vendor/pdf.min.mjs';
import { PageFlip } from './vendor/page-flip.module.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('vendor/pdf.worker.min.mjs', window.location.href).href;

const stage = document.getElementById('stage');
const bookWrap = document.getElementById('bookWrap');
const book = document.getElementById('book');
const loader = document.getElementById('loader');
const loaderText = document.getElementById('loaderText');
const topBar = document.getElementById('topBar');
const bottomBar = document.getElementById('bottomBar');
const scrubberWrap = document.getElementById('scrubberWrap');
const scrubber = document.getElementById('scrubber');
const pageInput = document.getElementById('pageInput');
const pageTotal = document.getElementById('pageTotal');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const btnZoomIn = document.getElementById('btnZoomIn');
const btnZoomOut = document.getElementById('btnZoomOut');
const btnZoomReset = document.getElementById('btnZoomReset');
const zoomLevel = document.getElementById('zoomLevel');
const btnFullscreen = document.getElementById('btnFullscreen');
const btnMenu = document.getElementById('btnMenu');
const btnLayout = document.getElementById('btnLayout');
const btnTocClose = document.getElementById('btnTocClose');
const tocPanel = document.getElementById('tocPanel');
const tocScrim = document.getElementById('tocScrim');
const tocGrid = document.getElementById('tocGrid');
const docTitle = document.getElementById('docTitle');

const PDF_URL = new URL('flipbook.pdf', window.location.href).href;

const state = {
  pdf:null,
  pageCount:0,
  current:1,
  zoom:1,
  minZoom:1,
  maxZoom:4,
  panX:0,
  panY:0,
  renderScale:2.2,
  pageAspect:0.7727,
  uiVisible:true,
  uiTimer:null,
  flip:null,
  forceSinglePage:false,
  pages:[]
};

function fileTitle(){
  return 'DormGuard Manual';
}

async function loadPdf(){
  try{
    const task = pdfjsLib.getDocument({url:PDF_URL});
    task.onProgress = (p)=>{
      if(p.total){
        const pct = Math.min(100, Math.round((p.loaded/p.total)*100));
        loaderText.textContent = `Loading document ${pct}%`;
      }
    };
    const pdf = await task.promise;
    state.pdf = pdf;
    state.pageCount = pdf.numPages;
    docTitle.textContent = fileTitle();
    pageTotal.textContent = state.pageCount;
    scrubber.max = state.pageCount;

    const firstPage = await pdf.getPage(1);
    const vp = firstPage.getViewport({scale:1});
    state.pageAspect = vp.width / vp.height;

    await buildPages();
    initFlip();
    loader.classList.add('hidden');
    buildToc();
  }catch(err){
    loaderText.textContent = 'Could not load flipbook.pdf — ' + (err && err.message ? err.message : 'unknown error');
    console.error(err);
  }
}

async function renderPageToCanvas(num, scale){
  const page = await state.pdf.getPage(num);
  const vp = page.getViewport({scale});
  const canvas = document.createElement('canvas');
  canvas.width = vp.width;
  canvas.height = vp.height;
  const ctx = canvas.getContext('2d', {alpha:false});
  await page.render({canvasContext:ctx, viewport:vp}).promise;
  return canvas;
}

async function buildPages(){
  book.innerHTML = '';
  const batchSize = 4;
  for(let i=1;i<=state.pageCount;i+=batchSize){
    const batch = [];
    for(let n=i;n<Math.min(i+batchSize, state.pageCount+1);n++){
      batch.push(n);
    }
    await Promise.all(batch.map(async (num)=>{
      const div = document.createElement('div');
      div.className = 'page';
      div.dataset.page = num;
      const canvas = await renderPageToCanvas(num, state.renderScale);
      div.appendChild(canvas);
      book.appendChild(div);
    }));
  }

  const ordered = [...book.children].sort((a,b)=>+a.dataset.page - +b.dataset.page);
  book.innerHTML = '';
  ordered.forEach(el=>book.appendChild(el));
  state.pages = [...book.children];
}

function computeSize(){
  const availW = stage.clientWidth * 0.9;
  const availH = (stage.clientHeight - 150) * 0.92;
  const aspect = state.pageAspect;

  // Use 600px as the breakpoint for mobile/small screens
  const isWide = window.innerWidth > 600 && state.pageCount > 1;
  const factor = (isWide && !state.forceSinglePage) ? 2 : 1;

  let w = availW / factor;
  let h = w / aspect;
  if(h > availH){
    h = availH;
    w = h * aspect;
  }
  return {width:Math.round(w), height:Math.round(h)};
}

function initFlip(){
  if(state.flip && typeof state.flip.destroy === 'function') state.flip.destroy();

  book.innerHTML = '';
  state.pages.forEach(p => book.appendChild(p));

  const {width, height} = computeSize();
  const pageEls = book.querySelectorAll('.page');

  state.flip = new PageFlip(book, {
    width,
    height,
    size: state.forceSinglePage ? 'fixed' : 'stretch',
    minWidth:200,
    maxWidth:1400,
    minHeight:280,
    maxHeight:1980,
    showCover:false,
    usePortrait:true,
    mobileScrollSupport:false,
    maxShadowOpacity:0.4,
    flippingTime:620,
    swipeDistance:24
  });

  state.flip.loadFromHTML(pageEls);

  state.flip.on('flip', (e)=>{
    state.current = e.data + 1;
    syncControls();
  });

  state.flip.on('changeState', (e)=>{
    if(e.data === 'flipping') showUi();
  });
}

function syncControls(){
  pageInput.value = state.current;
  scrubber.value = state.current;
  btnPrev.disabled = state.current <= 1;
  btnNext.disabled = state.current >= state.pageCount;
  updateTocActive();
}

function goTo(num){
  num = Math.max(1, Math.min(state.pageCount, Math.round(num)));
  if(!state.flip) return;
  state.flip.turnToPage(num - 1);
  state.current = num;
  syncControls();
}

function step(dir){
  if(!state.flip) return;
  if(dir > 0) state.flip.flipNext();
  else state.flip.flipPrev();
}

function resetZoom(instant){
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  applyTransform(instant);
  zoomLevel.textContent = '100%';
}

function applyTransform(instant){
  bookWrap.style.transition = instant ? 'none' : 'transform .25s var(--ease)';
  bookWrap.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  if(instant){
    requestAnimationFrame(()=>{ bookWrap.style.transition = ''; });
  }
}

function setZoom(newZoom, cx, cy){
  newZoom = Math.max(state.minZoom, Math.min(state.maxZoom, newZoom));
  if(newZoom === state.zoom) return;
  const rect = stage.getBoundingClientRect();
  const originX = (cx ?? rect.width/2) - rect.width/2;
  const originY = (cy ?? rect.height/2) - rect.height/2;
  const scaleRatio = newZoom / state.zoom;
  state.panX = originX - (originX - state.panX) * scaleRatio;
  state.panY = originY - (originY - state.panY) * scaleRatio;
  state.zoom = newZoom;
  clampPan();
  applyTransform(false);
  zoomLevel.textContent = Math.round(state.zoom*100) + '%';
}

function clampPan(){
  const maxPan = (state.zoom-1) * 480;
  state.panX = Math.max(-maxPan, Math.min(maxPan, state.panX));
  state.panY = Math.max(-maxPan*0.7, Math.min(maxPan*0.7, state.panY));
}

btnZoomIn.addEventListener('click', ()=>setZoom(state.zoom+0.4));
btnZoomOut.addEventListener('click', ()=>setZoom(state.zoom-0.4));
btnZoomReset.addEventListener('click', ()=>resetZoom(false));

let pinchStartDist = 0;
let pinchStartZoom = 1;
let isPanning = false;
let panStart = {x:0,y:0,px:0,py:0};
const activePointers = new Map();

stage.addEventListener('pointerdown', (e)=>{
  activePointers.set(e.pointerId, {x:e.clientX,y:e.clientY});
  if(activePointers.size === 1 && state.zoom > 1.02){
    isPanning = true;
    panStart = {x:e.clientX, y:e.clientY, px:state.panX, py:state.panY};
  } else if(activePointers.size === 2){
    isPanning = false;
    const pts = [...activePointers.values()];
    pinchStartDist = Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y);
    pinchStartZoom = state.zoom;
  }
});

stage.addEventListener('pointermove', (e)=>{
  if(!activePointers.has(e.pointerId)) return;
  activePointers.set(e.pointerId, {x:e.clientX,y:e.clientY});

  if(activePointers.size === 2){
    const pts = [...activePointers.values()];
    const dist = Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y);
    const midX = (pts[0].x+pts[1].x)/2;
    const midY = (pts[0].y+pts[1].y)/2;
    const rect = stage.getBoundingClientRect();
    const newZoom = pinchStartZoom * (dist/pinchStartDist);
    setZoom(newZoom, midX-rect.left, midY-rect.top);
  } else if(isPanning && state.zoom > 1.02){
    state.panX = panStart.px + (e.clientX - panStart.x);
    state.panY = panStart.py + (e.clientY - panStart.y);
    clampPan();
    applyTransform(true);
  }
});

function endPointer(e){
  activePointers.delete(e.pointerId);
  if(activePointers.size < 2) pinchStartDist = 0;
  if(activePointers.size === 0) isPanning = false;
}
stage.addEventListener('pointerup', endPointer);
stage.addEventListener('pointercancel', endPointer);

stage.addEventListener('wheel', (e)=>{
  if(e.ctrlKey){
    e.preventDefault();
    const rect = stage.getBoundingClientRect();
    setZoom(state.zoom - e.deltaY*0.01, e.clientX-rect.left, e.clientY-rect.top);
  }
}, {passive:false});

stage.addEventListener('dblclick', (e)=>{
  const rect = stage.getBoundingClientRect();
  if(state.zoom > 1.02){
    resetZoom(false);
  } else {
    setZoom(2.2, e.clientX-rect.left, e.clientY-rect.top);
  }
});

btnPrev.addEventListener('click', ()=>step(-1));
btnNext.addEventListener('click', ()=>step(1));

pageInput.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){
    const n = parseInt(pageInput.value, 10);
    if(!isNaN(n)) goTo(n);
    pageInput.blur();
  }
});
pageInput.addEventListener('blur', ()=>{
  const n = parseInt(pageInput.value, 10);
  if(!isNaN(n)) goTo(n); else pageInput.value = state.current;
});

scrubber.addEventListener('input', ()=>{
  const n = parseInt(scrubber.value, 10);
  pageInput.value = n;
});
scrubber.addEventListener('change', ()=>{
  const n = parseInt(scrubber.value, 10);
  goTo(n);
});

document.addEventListener('keydown', (e)=>{
  if(document.activeElement === pageInput) return;
  if(e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); step(1); }
  else if(e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  else if(e.key === '+' || e.key === '=') setZoom(state.zoom+0.4);
  else if(e.key === '-') setZoom(state.zoom-0.4);
  else if(e.key === '0') resetZoom(false);
  else if(e.key === 'Escape') closeToc();
  else if(e.key === 'f' || e.key === 'F') toggleFullscreen();
});

function toggleFullscreen(){
  if(!document.fullscreenElement){
    document.documentElement.requestFullscreen().catch(()=>{});
  } else {
    document.exitFullscreen().catch(()=>{});
  }
}
function toggleLayout(){
  state.forceSinglePage = !state.forceSinglePage;
  initFlip();
  goTo(state.current);
}
btnLayout.addEventListener('click', toggleLayout);

btnFullscreen.addEventListener('click', toggleFullscreen);

function openToc(){
  tocPanel.classList.add('show');
  tocScrim.classList.add('show');
}
function closeToc(){
  tocPanel.classList.remove('show');
  tocScrim.classList.remove('show');
}
btnMenu.addEventListener('click', openToc);
btnTocClose.addEventListener('click', closeToc);
tocScrim.addEventListener('click', closeToc);

async function buildToc(){
  tocGrid.innerHTML = '';
  for(let i=1;i<=state.pageCount;i++){
    const item = document.createElement('div');
    item.className = 'tocItem';
    item.dataset.page = i;
    const thumb = document.createElement('div');
    thumb.className = 'tocThumb';
    const numEl = document.createElement('div');
    numEl.className = 'tocNum';
    numEl.textContent = i;
    item.appendChild(thumb);
    item.appendChild(numEl);
    item.addEventListener('click', ()=>{
      goTo(i);
      closeToc();
    });
    tocGrid.appendChild(item);
    renderThumb(i, thumb);
  }
}

async function renderThumb(num, container){
  const page = await state.pdf.getPage(num);
  const vp = page.getViewport({scale:1});
  const scale = 220 / vp.width;
  const scaledVp = page.getViewport({scale});
  const canvas = document.createElement('canvas');
  canvas.width = scaledVp.width;
  canvas.height = scaledVp.height;
  const ctx = canvas.getContext('2d', {alpha:false});
  await page.render({canvasContext:ctx, viewport:scaledVp}).promise;
  container.appendChild(canvas);
}

function updateTocActive(){
  const items = tocGrid.querySelectorAll('.tocItem');
  items.forEach(it=>{
    const p = parseInt(it.dataset.page,10);
    it.classList.toggle('active', p === state.current);
  });
}

function scheduleUiHide(){
  clearTimeout(state.uiTimer);
  state.uiTimer = setTimeout(()=>{
    if(state.zoom<=1.02) hideUi();
  }, 3200);
}
function hideUi(){
  topBar.classList.add('hide');
  bottomBar.classList.add('hide');
  scrubberWrap.style.opacity='0';
  scrubberWrap.style.transform='translateY(90px)';
  state.uiVisible = false;
}
function showUi(){
  topBar.classList.remove('hide');
  bottomBar.classList.remove('hide');
  scrubberWrap.style.opacity='1';
  scrubberWrap.style.transform='translateY(0)';
  state.uiVisible = true;
  scheduleUiHide();
}
stage.addEventListener('pointerdown', showUi);
stage.addEventListener('pointermove', ()=>{ if(!state.uiVisible) showUi(); });
showUi();

let resizeTimer;
window.addEventListener('resize', ()=>{
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(()=>{
    if(!state.flip) return;
    state.flip.update();
    resetZoom(true);
  }, 150);
});

document.addEventListener('fullscreenchange', ()=>{
  setTimeout(()=>{ if(state.flip) state.flip.update(); resetZoom(true); }, 100);
});

loadPdf();
