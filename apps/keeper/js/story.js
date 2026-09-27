// Author: Alex Picon <alexnpc@me.com>
import { createVoiceStudio } from './voice-studio.js';
import { COLLECTION_SLUGS, collectionSlug, publicStorySlug, storyLink, newBookId } from './navigation.js';
const $ = (id) => document.getElementById(id);
const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const prompts = ['Tell me about someone at work who looked out for you.', 'What did your family do when money was short?', 'Tell me about a friendship that helped you through.', 'What happened on a day when everything went wrong?', 'Who showed up for the family during an illness?', 'Which story do you most want the next generation to know?'];
const rememberedPrompts = ['What small habit of theirs do you still remember?', 'What story did they tell more than once?', 'What was their kitchen like?', 'What is a saying you associate with them?', 'What did they tell you about the world they grew up in?', 'What did they teach you that you still do today?'];
function updatePrompt() { const choices = document.querySelector('input[name=perspective]:checked').value === 'remembered' ? rememberedPrompts : prompts; $('promptText').textContent = choices[promptIndex % choices.length]; }
let promptIndex = 0, books = [], current = null, pageIndex = 0, draftAudio = null, recorder = null, recognition = null, stream = null, timer = null, editingId = null, storageOK = true;
let routingReady = false, applyingRoute = false, routeEpoch = 0;
let draftTranscript = null;
let draftTimer = null, audioReady = Promise.resolve(), recordingGeneration = 0;
const dbPromise = new Promise((resolve, reject) => {
  const request = indexedDB.open('keeper-family-stories', 2);
  request.onupgradeneeded = () => { for (const name of ['books','drafts']) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, {keyPath:'id'}); };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
async function database(mode, action, storeName = 'books') {
  const db = await dbPromise;
  return new Promise((resolve,reject) => {
    const tx = db.transaction(storeName, mode), request = action(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(request.result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  });
}
async function saveBook() {
  const book = current;
  if (!book || book.demo) return;
  if(book.curated){book.public_story_slug=collectionSlug(book);book.curated=false;book.id=newBookId();book.created=new Date().toISOString();$('keepBookBtn').hidden=true;}
  try {
    await database('readwrite', store => store.put(book));
    const index = books.findIndex(b => b.id === book.id);
    if (index < 0) books.unshift(book); else books[index] = book;
    $('shelfCount').textContent = books.length;
    storageOK = true;
  } catch {
    storageOK = false;
    $('readerStatus').textContent = 'This browser could not save the book. Download a copy before leaving this page.';
  }
}
function show(view) {
  studio.onView(view);
  if (view !== 'capture' && recorder?.state === 'recording') stopRecording();
  document.querySelectorAll('.view').forEach(el => el.hidden = el.id !== view);
  window.scrollTo({top:0, behavior:'instant'});
  syncRoute(view);
}
async function begin(perspective = 'own') {
  if (recorder?.state === 'recording') stopRecording();
  await audioReady; recordingGeneration++; clearTimeout(draftTimer);
  editingId = null; draftAudio = null; draftTranscript = null; studio.resetCapture();
  $('memoryForm').reset(); $('recording').hidden = true; $('recording').removeAttribute('src');
  document.querySelector(`input[name=perspective][value=${perspective}]`).checked = true;
  updatePrompt(); $('draftStatus').textContent=''; $('wordCount').textContent='Keep the parts that matter, even when the ending is unfinished.';
  $('formStatus').textContent = ''; $('recordStatus').textContent = 'Keep talking. No questions or interruptions.';
  show('capture');
}
$('homeBtn').onclick = () => show('home');
$('newBtn').onclick = $('anotherBtn').onclick = () => begin();
$('startBtn').onclick = () => studio.openExample();
$('rememberBtn').onclick = () => begin('remembered');
$('promptBtn').onclick = () => { promptIndex++; updatePrompt(); };
document.querySelectorAll('input[name=perspective]').forEach(input=>input.addEventListener('change',updatePrompt));
$('memoryText').oninput = () => { const n = $('memoryText').value.trim().split(/\s+/).filter(Boolean).length; $('wordCount').textContent = `${n} words · Your original wording will stay with the book.`; };
function stopRecording() {
  if (recorder?.state === 'recording') recorder.stop();
  recognition?.stop(); stream?.getTracks().forEach(track => track.stop()); clearInterval(timer);
  $('recordBtn').textContent = '● Record another take'; $('recordBtn').classList.remove('recording-active');
  $('makeBtn').disabled = false;
}
$('recordBtn').onclick = async () => {
  if (recorder?.state === 'recording') { stopRecording(); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    $('recordStatus').textContent = 'Recording needs HTTPS or localhost and a supported browser. You can still write the memory below.'; return;
  }
  studio.stop();
  $('recordBtn').disabled = true;
  try {
    stream = await navigator.mediaDevices.getUserMedia({audio:true});
    const chunks = []; recorder = new MediaRecorder(stream, {audioBitsPerSecond:64000});
    const thisRecorder = recorder, generation = ++recordingGeneration;
    let finishAudio; audioReady = new Promise(resolve => { finishAudio = resolve; });
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = async () => {
      const blob = new Blob(chunks, {type:thisRecorder.mimeType});
      const audioData = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
      if (generation !== recordingGeneration) { finishAudio(); return; }
      draftAudio = audioData; draftTranscript = null;
      $('recording').src = draftAudio; $('recording').hidden = false;
      $('recordStatus').textContent = 'Recording kept for this draft. Listen back and review or type the words below.';
      await saveDraft(); finishAudio();
    };
    recorder.onerror = () => { stopRecording(); $('recordStatus').textContent = 'Recording interrupted. Check the saved take and try again.'; };
    recorder.start(1000); $('makeBtn').disabled = true;
    $('recordBtn').textContent = '■ Stop recording'; $('recordBtn').classList.add('recording-active');
    const started = Date.now();
    timer = setInterval(() => {
      const elapsed = Math.floor((Date.now()-started)/1000);
      $('recordStatus').textContent = `Recording ${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')} · up to 30 minutes`;
      if (elapsed >= 1800) stopRecording();
    }, 1000);
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (Speech) {
      recognition = new Speech(); recognition.continuous = true; recognition.interimResults = false;
      recognition.lang = navigator.language || 'en-US';
      recognition.onresult = e => {
        for (let i=e.resultIndex; i<e.results.length; i++) if (e.results[i].isFinal) $('memoryText').value += ($('memoryText').value ? ' ' : '') + e.results[i][0].transcript;
        $('memoryText').dispatchEvent(new Event('input'));
      };
      recognition.onerror = () => { $('formStatus').textContent = 'Live dictation is unavailable. Your audio is still recording; type the words after listening back.'; };
      try { recognition.start(); } catch { $('formStatus').textContent = 'Audio is recording. Type the words after listening back.'; }
    } else $('formStatus').textContent = 'This browser records audio but has no live dictation. Listen back and type the memory.';
  } catch {
    stream?.getTracks().forEach(track => track.stop());
    $('recordStatus').textContent = 'Microphone unavailable. Allow microphone access or write the memory below.';
  } finally { $('recordBtn').disabled = false; }
};
$('memoryForm').onsubmit = async e => {
  e.preventDefault();
  await audioReady;
  const memory = {name:$('person').value.trim(), narrator:$('narrator').value.trim(),source_provider:$('sourceProvider').value.trim(),narrative_voice:$('narrativeVoice').value, dedication:$('dedication').value.trim() || 'For our family', page_count:Number($('storyLength').value),chapter_length:$('chapterLength').value,style:$('storyStyle').value,tone:$('storyTone').value,perspective:document.querySelector('input[name=perspective]:checked').value, text:$('memoryText').value.trim()};
  if (!memory.name || !memory.narrator || memory.text.length < 30) { $('formStatus').textContent = 'Add the names and at least 30 characters of memory first.'; return; }
  $('makeBtn').disabled = true; $('makeBtn').textContent = 'Writing your storybook…';
  $('formStatus').textContent = 'Writing a complete book with scenes, a narrative, and an ending true to the telling. This can take up to three minutes.';
  try {
    const response = await fetch('/api/keeper/story', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(memory),signal:AbortSignal.timeout(195000)});
    if (!response.ok) throw new Error('Could not create the book. Your words are still here; please try again.');
    const draft = await response.json();
    current = {...draft,id:editingId || newBookId(),memory,audio:draftAudio,transcript:draftTranscript,created:new Date().toISOString(),reviewed:false};
    await saveBook();
    if (storageOK) { clearTimeout(draftTimer); await database('readwrite',store=>store.delete('active'),'drafts'); $('resumeBtn').hidden=true; }
    pageIndex = 0; renderBook(); show('reader');
  } catch (error) { $('formStatus').textContent = error.message === 'The operation was aborted due to timeout' ? 'Drafting took too long. Your memory is still here; please try again.' : 'Could not reach the story service. Your memory is still here; please try again.'; }
  finally { $('makeBtn').disabled = false; $('makeBtn').innerHTML = 'Make our storybook <span>↗</span>'; }
};
$('exampleBtn').onclick = () => {show('home');$('familyCollection').scrollIntoView({block:'start'});};
$('judgeBtn').onclick = () => studio.openExample(true);
function attribution(book) {
  if(book.provenance?.kind==='inspired-fiction')return `Inspired fiction · ${book.memory.name}`;
  if(book.memory.narrative_voice==='collector')return `${book.memory.name}, as remembered by ${book.memory.source_provider || 'a family contributor'}`;
  if(book.memory.narrative_voice==='storyteller')return `${book.memory.narrator}’s telling${book.memory.perspective==='remembered'?' · reconstructed from family recollections':''}${book.memory.source_provider?' · preserved by '+book.memory.source_provider:''}`;
  return book.memory.perspective === 'remembered' ? `${book.memory.name}, as remembered by ${book.memory.narrator}` : `Told by ${book.memory.narrator} · About ${book.memory.name}`;
}
function sourceAttribution(book) { if(book.provenance?.kind==='inspired-fiction')return 'Family recollections shared by a grandchild · source of the themes, not a transcript of this fictional story'; return book.memory.source_provider ? `${book.audio?'Source material':'Written recollections'} preserved by ${book.memory.source_provider} · original storyteller: ${book.memory.narrator}` : attribution(book); }
function renderBook() {
  if(current.curated)current.public_story_slug=collectionSlug(current);
  $('sharePanel').hidden=true;
  updateShareControls();
  const slug=collectionSlug(current);
  $('collectionUpdateBtn').hidden=!(!current.curated && slug && (current.memory.chapter_length!=='concise' || current.visual_revision!==(slug==='bread'?'chapter-scenes-carmen-v2':'companion-chapter-scenes-v1')));
  $('bookTitle').textContent = current.title; $('bookDedication').textContent = current.memory.dedication;
  $('bookAttribution').textContent = attribution(current);
  $('bookSource').textContent = current.provenance?.label || (current.demo ? 'FICTIONAL EXAMPLE' : current.source === 'ai' ? (current.style==='imaginative'?'IMAGINATIVE RETELLING · FAMILY REVIEW':'AI-EDITED · FAMILY REVIEW') : 'ORIGINAL WORDS');
  $('originalLabel').textContent=current.memory.source_provider && current.memory.perspective==='remembered'?'The recollections behind this telling':'Kept in their original words';
  $('originalAttribution').textContent = sourceAttribution(current); $('originalText').textContent = current.memory.text;
  $('originalAudio').hidden = !current.audio; if (current.audio) $('originalAudio').src = current.audio; else $('originalAudio').removeAttribute('src');
  $('familyNote').hidden=!current.family_note;
  $('familyNoteAuthor').textContent=current.family_note?.author || '';
  $('familyNoteText').textContent=current.family_note?.text || '';
  $('keepBookBtn').hidden=!current.curated;
  $('bookNotice').textContent = current.notice; $('followup').textContent = current.question;
  $('reviewed').checked = current.reviewed; $('readerStatus').textContent = storageOK ? '' : 'Browser saving is unavailable. Download a copy before leaving.';
  $('editMemoryBtn').textContent = (current.demo || current.curated) ? 'Start my own story →' : 'Edit original memory';
  renderPage();
}
function renderPage() {
  const page = current.pages[pageIndex];
  $('bookPages').innerHTML = `<article class="spread"><div class="page-art">${page.image ? `<img src="${escapeHTML(page.image)}" alt="AI watercolor interpretation of this memory"><p>AI illustration · an interpretation, not a photograph</p>` : `<div class="art-empty">A little room<br>for your imagination.</div><p>Create a watercolor illustration from this page.<br>The illustration prompt will be sent to xAI.</p><button class="secondary" id="illustrateBtn" ${!page.illustration ? 'disabled' : ''}>Illustrate this page ✳</button><p id="imageStatus" role="status"></p>`}</div><div class="page-text"><span class="eyebrow">CHAPTER ${String(pageIndex+1).padStart(2,'0')}</span><h2>${escapeHTML(page.title)}</h2><div class="prose" id="pageProse">${escapeHTML(page.text)}</div><button id="editPageBtn" class="text-btn underline">Edit these words</button><details class="source-quote"><summary>Source & adaptation notes</summary>${current.memory.source_provider?`<p>Source recollection preserved by ${escapeHTML(current.memory.source_provider)}</p>`:""}<blockquote>${escapeHTML(page.quote)}</blockquote>${page.adaptation?`<p><b>How this chapter was adapted:</b> ${escapeHTML(page.adaptation)}</p>`:""}</details></div></article>`;
  $('pageCount').textContent = `${pageIndex+1} / ${current.pages.length}`;
  $('prevPage').disabled = pageIndex === 0; $('nextPage').disabled = pageIndex === current.pages.length-1;
  $('editPageBtn').onclick = () => {
    $('pageProse').innerHTML = `<label>Your page<textarea id="pageEdit" maxlength="4000" rows="7">${escapeHTML(page.text)}</textarea></label>`;
    $('editPageBtn').textContent = 'Save these words';
    $('editPageBtn').onclick = async () => { const value=$('pageEdit').value.trim(); if (!value) return; page.text=value; current.private_changes=true; studio.invalidate(); current.reviewed=false; $('reviewed').checked=false; await saveBook(); renderPage(); };
  };
  studio.render();
  updateShareControls();
  if(!$('reader').hidden)syncRoute('reader',true);
  const edition=studio.exportState().edition;
  const chapterPages=edition?.pages || current.pages;
  const count=chapterPages.reduce((sum,p)=>sum+p.text.trim().split(/\s+/).length,0);
  $('bookStats').textContent=`${chapterPages.length} chapters · ${count.toLocaleString()} words · about ${Math.max(1,Math.ceil(count/160))} minutes`;
  $('chapterList').innerHTML=chapterPages.map((p,i)=>`<button type="button" data-chapter="${i}" ${i===pageIndex?'aria-current="page"':''}><span>${String(i+1).padStart(2,'0')}</span>${escapeHTML(p.title)}</button>`).join('');
  $('chapterList').querySelectorAll('button').forEach(button=>button.onclick=()=>{pageIndex=Number(button.dataset.chapter);renderPage();$('bookPages').scrollIntoView({block:'start'});});
  if ($('illustrateBtn')) $('illustrateBtn').onclick = async () => {
    const targetBook = current, targetPage = page;
    $('illustrateBtn').disabled = true; $('imageStatus').textContent = 'Painting your memory… this may take a minute.';
    try {
      const response = await fetch('/api/keeper/story/illustration',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:page.illustration}),signal:AbortSignal.timeout(110000)});
      if (!response.ok) throw new Error('Illustration unavailable. Your story is safe. Try again.');
      const data = await response.json(); targetPage.image = data.image; targetBook.reviewed = false;
      if (current === targetBook) { await saveBook(); $('reviewed').checked=false; renderPage(); }
      else await database('readwrite', store => store.put(targetBook));
    } catch { if (current === targetBook && current.pages[pageIndex] === targetPage && $('imageStatus')) { $('imageStatus').textContent = 'Illustration unavailable. Your story is safe. Try again.'; $('illustrateBtn').disabled=false; } }
  };
}
$('prevPage').onclick = () => { if(pageIndex>0) {pageIndex--;renderPage();$('bookPages').scrollIntoView({block:'start'});} };
$('nextPage').onclick = () => { if(pageIndex<current.pages.length-1) {pageIndex++;renderPage();$('bookPages').scrollIntoView({block:'start'});} };
$('reviewed').onchange = async () => { current.reviewed = $('reviewed').checked; await saveBook(); };
$('editMemoryBtn').onclick = () => {
  if(current.demo || current.curated) {begin();return;}
  editingId = current.id; draftAudio = current.audio; draftTranscript = current.transcript || null; studio.resetCapture();
  $('chapterLength').value=current.memory.chapter_length || 'full';$('storyLength').value=String(current.memory.page_count || 8);$('storyStyle').value=current.memory.style || current.style || 'imaginative';$('storyTone').value=current.memory.tone || 'match';
  $('sourceProvider').value=current.memory.source_provider || '';$('narrativeVoice').value=current.memory.narrative_voice || (current.memory.perspective==='remembered'?'collector':'storyteller');
  $('person').value=current.memory.name; $('narrator').value=current.memory.narrator; $('dedication').value=current.memory.dedication; $('memoryText').value=current.memory.text;
  document.querySelector(`input[name=perspective][value=${current.memory.perspective}]`).checked=true;
  updatePrompt(); $('memoryText').oninput();
  $('consent').checked=false; $('recording').hidden=!draftAudio; if(draftAudio) $('recording').src=draftAudio;
  $('formStatus').textContent='Making the book again replaces this draft and its illustrations. Your original recording stays.';show('capture');
};
async function saveDraft() {
  const draft = {id:'active',page_count:Number($('storyLength').value),chapter_length:$('chapterLength').value,style:$('storyStyle').value,tone:$('storyTone').value,name:$('person').value,narrator:$('narrator').value,source_provider:$('sourceProvider').value,narrative_voice:$('narrativeVoice').value,dedication:$('dedication').value,text:$('memoryText').value,perspective:document.querySelector('input[name=perspective]:checked').value,audio:draftAudio,transcript:draftTranscript,editingId};
  if (!draft.text.trim() && !draft.audio) return;
  try { await database('readwrite',store=>store.put(draft),'drafts'); $('draftStatus').textContent='Draft saved in this browser.'; $('resumeBtn').hidden=false; }
  catch { $('draftStatus').textContent='Draft could not be saved. Keep this page open until you download your book.'; }
}
$('memoryForm').addEventListener('input',()=>{clearTimeout(draftTimer);draftTimer=setTimeout(saveDraft,300);});
$('resumeBtn').onclick=async()=>{
  try { const draft=await database('readonly',store=>store.get('active'),'drafts');if(!draft)return;
    $('chapterLength').value=draft.chapter_length || 'full';$('storyLength').value=String(draft.page_count || 8);$('storyStyle').value=draft.style || 'imaginative';$('storyTone').value=draft.tone || 'match';
    $('sourceProvider').value=draft.source_provider || '';$('narrativeVoice').value=draft.narrative_voice || (draft.perspective==='remembered'?'collector':'storyteller');
    $('person').value=draft.name; $('narrator').value=draft.narrator; $('dedication').value=draft.dedication; $('memoryText').value=draft.text;
    document.querySelector(`input[name=perspective][value=${draft.perspective}]`).checked=true;
    draftAudio=draft.audio;draftTranscript=draft.transcript || null;editingId=draft.editingId;studio.resetCapture(); $('recording').hidden=!draftAudio;if(draftAudio)$('recording').src=draftAudio;
    updatePrompt(); $('memoryText').oninput(); $('consent').checked=false; $('draftStatus').textContent='Your unfinished memory, recovered.';show('capture');
  } catch { $('resumeBtn').textContent='Could not recover draft'; }
};
async function showShelf() {
  try { books = (await database('readonly', store => store.getAll())).sort((a,b)=>b.created.localeCompare(a.created)); } catch { storageOK=false; }
  $('shelfCount').textContent=books.length;
  $('shelfBooks').innerHTML=books.length ? books.map(b=>`<article class="shelf-card">${b.pages[0].image ? `<img src="${escapeHTML(b.pages[0].image)}" alt="AI illustration for this story">` : '<span class="small-star">✳</span>'}<p class="eyebrow">${b.reviewed ? 'FAMILY REVIEWED' : 'DRAFT · READY TO REVIEW'}</p><h2>${escapeHTML(b.title)}</h2><p>${escapeHTML(attribution(b))}</p><button class="text-btn underline" data-open="${escapeHTML(b.id)}">Open book →</button><button class="text-btn" data-delete="${escapeHTML(b.id)}">Delete</button></article>`).join('') : `<div><h2>Your first story belongs here.</h2><p>A few sentences are all you need.</p><button id="emptyStart" class="primary">Keep a memory ↗</button>${!storageOK ? '<p>Browser storage is unavailable. You can still make and download a book.</p>' : ''}</div>`;
  $('emptyStart')?.addEventListener('click',()=>begin());
  document.querySelectorAll('[data-open]').forEach(button=>button.onclick=()=>{current=books.find(b=>b.id===button.dataset.open);pageIndex=0;renderBook();show('reader');});
  document.querySelectorAll('[data-delete]').forEach(button=>button.onclick=async()=>{if(confirm('Delete this book and its recording from this browser? Download a copy first if you want to keep it.')) {try {await database('readwrite',store=>store.delete(button.dataset.delete));await showShelf();} catch {button.textContent='Could not delete. Retry';}}});
  show('shelf');
}
$('shelfBtn').onclick=$('backBtn').onclick=showShelf;
$('collectionUpdateBtn').onclick=async()=>{try{const response=await fetch(`stories/lima/${collectionSlug(current) || 'bread'}/book.json`);if(!response.ok)throw new Error();current=await response.json();pageIndex=0;renderBook();show('reader');}catch{$('readerStatus').textContent='The updated telling could not load. Please retry.';}};
$('keepBookBtn').onclick=async()=>{current=structuredClone(current);current.id=newBookId();current.curated=false;current.created=new Date().toISOString();await saveBook();renderBook();$('readerStatus').textContent=storageOK?'A personal copy is saved on your bookshelf. You can edit it and keep your narration.':'Could not save locally. Download a copy before leaving.';};
function reviewReady() { if(!studio.canExport())return false; if(!current.reviewed) { $('readerStatus').textContent='Please review the pages and check “ready for our family” before exporting.'; $('reviewed').focus(); return false; } return true; }
async function inlineImage(src) {
  if(src.startsWith('data:')) return src;
  const response=await fetch(src);if(!response.ok) throw new Error('Image unavailable');
  const blob=await response.blob();return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
}
async function bookHTML() {
  const b=current, reading=studio.exportState(), bookTitle=reading.edition?.title || b.title;
  const originalAudio=b.audio ? await inlineImage(b.audio) : null;
  const pages=await Promise.all(b.pages.map(async(original,i)=>{const p=reading.edition?{...original,...reading.edition.pages[i]}:original;const clip=original.narrations?.[`${reading.language}:${reading.voice}`];return `<section><p class="label">CHAPTER ${i+1}</p><h2>${escapeHTML(p.title)}</h2>${p.image ? `<figure><img src="${escapeHTML(await inlineImage(p.image))}" alt="AI watercolor illustration"><figcaption>AI illustration · an interpretation, not a photograph</figcaption></figure>` : ''}<p class="story">${escapeHTML(p.text)}</p>${clip && clip.text===p.text?`<audio controls src="${escapeHTML(await inlineImage(clip.audio))}"></audio><p class="label">ElevenLabs generated narrator · ${escapeHTML(reading.voice)} · ${escapeHTML(reading.language)}</p>`:''}<aside>From the original memory: <q>${escapeHTML(p.quote)}</q>${p.adaptation?`<p>Imaginative additions / adaptation: ${escapeHTML(p.adaptation)}</p>`:""}</aside></section>`;}));
  return `<!doctype html><!-- Author: Alex Picon <alexnpc@me.com> --><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="author" content="Alex Picon, alexnpc@me.com"><title>${escapeHTML(bookTitle)}</title><style>body{max-width:800px;margin:auto;padding:40px 25px;background:#f8f5ed;color:#333d32;font:18px/1.8 Georgia,serif}h1{font-size:50px;line-height:1.1}h2{font-size:36px}.label,aside,figcaption,footer{font:12px/1.7 system-ui;color:#626858}section{margin:50px 0;border-top:1px solid #dcded1;padding-top:25px}img{width:100%;max-height:500px;object-fit:contain}figure{margin:20px 0}audio{width:100%}.story,blockquote{white-space:pre-wrap}button{padding:12px;font:inherit}@media print{button,audio{display:none}body{background:white}section{break-before:page}}</style><body><p class="label">KEEPER · ${escapeHTML(b.provenance?.label || (b.demo ? 'FICTIONAL EXAMPLE' : 'FAMILY REVIEWED'))}</p><p>${escapeHTML(b.memory.dedication)}</p><h1>${escapeHTML(bookTitle)}</h1><p class="label">Edition: ${escapeHTML(reading.language)}</p><p>${escapeHTML(attribution(b))}</p><p class="label">${escapeHTML(b.notice)}</p>${pages.join('')}${b.family_note?`<section><h2>A separate family note</h2><p class="label">${escapeHTML(b.family_note.author)}</p><p class="story">${escapeHTML(b.family_note.text)}</p></section>`:''}<section><h2>${b.memory.source_provider?"The source recollection":"The original memory"}</h2><p>${escapeHTML(sourceAttribution(b))}</p><blockquote>${escapeHTML(b.memory.text)}</blockquote>${originalAudio?`<audio controls src="${escapeHTML(originalAudio)}"></audio><p class="label">${b.audioKind==='generated-demo'?'Fictional example source: generated with ElevenLabs, not a real family recording.':'The original recording. This is the narrator’s voice, not a generated voice.'}</p>`:''}</section><footer>Built by Alex Picon · <a href="mailto:alexnpc@me.com">alexnpc@me.com</a></footer></body></html>`;
}
$('downloadBtn').onclick=async()=>{
  if(!reviewReady())return;
  $('downloadBtn').disabled=true;
  try { const html=await bookHTML(), url=URL.createObjectURL(new Blob([html],{type:'text/html'})), a=document.createElement('a');a.href=url;a.download=`keeper-${current.title.replace(/[^a-z0-9]+/gi,'-').slice(0,70)}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);$('readerStatus').textContent='Book downloaded. Send the HTML file to family; it includes the story, illustrations, original words, and any recording.'; }
  catch{$('readerStatus').textContent='Download failed. Your book is still here; please retry.';}finally{$('downloadBtn').disabled=false;}
};
$('printBtn').onclick=async()=>{
  if(!reviewReady())return;
  const popup=window.open('','_blank');if(!popup){$('readerStatus').textContent='Allow pop-ups to open the printable book.';return;}
  try {popup.document.write(await bookHTML());popup.document.close();await Promise.all([...popup.document.images].map(i=>i.decode().catch(()=>{})));popup.focus();popup.print();}
  catch{popup.close();$('readerStatus').textContent='Could not prepare the printable book. Please retry.';}
};
const studio=createVoiceStudio({
  routeChanged:()=>{if(!$('reader').hidden)syncRoute('reader',true);},
  book:()=>current,pageIndex:()=>pageIndex,setPage:index=>{pageIndex=index;},render:renderPage,save:saveBook,
  audio:()=>draftAudio,isRecording:()=>recorder?.state==='recording',saveDraft,
  async setAudio(audio){draftAudio=audio;draftTranscript=null;await saveDraft();},setTranscript(value){draftTranscript=value;},
  open(book){current=book;pageIndex=0;renderBook();show('reader');},
  openFallback(){show('home');$('demoStatus').textContent='The prepared storybook could not load. Please reload, or tell your own story.';}
});
window.addEventListener('beforeunload',e=>{if(recorder?.state==='recording'||(!$('capture').hidden&&$('memoryText').value.trim())){e.preventDefault();e.returnValue='';}});
try {books=await database('readonly',store=>store.getAll());$('shelfCount').textContent=books.length; const draft=await database('readonly',store=>store.get('active'),'drafts');$('resumeBtn').hidden=!draft;}catch{storageOK=false;}



try {
  const response=await fetch('stories/lima/collection.json');if(!response.ok)throw new Error();const collection=await response.json();
  $('familyBooks').innerHTML=collection.books.map(b=>`<article class="family-book"><img src="${escapeHTML(b.cover)}" alt="${escapeHTML(b.alt)}"><div><span class="eyebrow">${escapeHTML(b.label)}</span><h3>${escapeHTML(b.title)}</h3><p class="subtitle">${escapeHTML(b.subtitle)}</p><p>${escapeHTML(b.description)}</p><button class="text-btn underline" data-family-book="${escapeHTML(b.path)}">Read this story →</button></div></article>`).join('');
  $('familyBooks').querySelectorAll('button').forEach(button=>button.onclick=async()=>{button.disabled=true;try{const response=await fetch(button.dataset.familyBook);if(!response.ok)throw new Error();current=await response.json();pageIndex=0;renderBook();show('reader');}catch{$('collectionStatus').textContent='This story could not load. Please try again.';}finally{button.disabled=false;}});
} catch {$('collectionStatus').textContent='The Lima collection is temporarily unavailable. Please reload to try again.';}

function updateShareControls() {
  const url=storyLink(current,studio.exportState().language);
  $('shareLinkBtn').hidden=!url;
  if(!url)$('sharePanel').hidden=true;
  else $('shareUrl').value=url;
}
$('shareLinkBtn').onclick=async()=>{
  const url=storyLink(current,studio.exportState().language);
  if(!url)return;
  $('sharePanel').hidden=false;$('shareUrl').value=url;
  let copied=false;
  try {if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);copied=true;}}catch{}
  if(!copied){$('shareUrl').focus();$('shareUrl').select();try{copied=document.execCommand('copy');}catch{}}
  $('shareStatus').textContent=copied?'Link copied. It opens this story directly on another device.':'Copy the selected link to share this story.';
};
function syncRoute(view,replace=false) {
  if(!routingReady||applyingRoute)return;
  const url=new URL('/keeper/',location.origin);
  if(view==='reader'&&current){
    if(current.demo)url.searchParams.set('demo','adventure');
    else if(publicStorySlug(current))url.searchParams.set('story',publicStorySlug(current));
    else url.searchParams.set('local',current.id);
    if(studio.isJudging()&&!current.demo)url.searchParams.set('demo','1');
    if(!studio.isJudging()&&studio.exportState().language!=='Original')url.searchParams.set('lang',studio.exportState().language);
  }else if(view!=='home')url.searchParams.set('view',view);
  if(url.href!==location.href)history[replace?'replaceState':'pushState']({view},'',url);
}
async function applyLocation() {
  const epoch=++routeEpoch,params=new URLSearchParams(location.search);
  applyingRoute=true;
  try {
    const slug=params.get('story'),local=params.get('local'),demo=params.get('demo');
    if(demo){await studio.openExample(true,demo==='adventure'?'demo/book.json':`stories/lima/${COLLECTION_SLUGS.includes(slug)?slug:'bread'}/book.json`,()=>epoch===routeEpoch);}
    else if(COLLECTION_SLUGS.includes(slug)){
      const response=await fetch(`stories/lima/${slug}/book.json`);if(!response.ok)throw new Error('This story could not load.');
      const book=await response.json();if(epoch!==routeEpoch)return;current=book;pageIndex=0;renderBook();show('reader');
    }else if(local){
      const book=await database('readonly',store=>store.get(local));if(epoch!==routeEpoch)return;
      if(!book)throw new Error('This is a browser-local book. Ask its owner for the downloaded family book.');
      current=book;pageIndex=0;renderBook();show('reader');
    }else if(params.get('view')==='shelf')await showShelf();
    else if(params.get('view')==='capture'){
      const draft=await database('readonly',store=>store.get('active'),'drafts').catch(()=>null);
      if(draft)await $('resumeBtn').onclick();else await begin();
    }else show('home');
    if(!demo&&!$('reader').hidden&&params.has('lang'))studio.selectEdition(params.get('lang'));
  }catch(error){show('home');$('demoStatus').textContent=error.message || 'This story could not load. Please retry.';}
  finally{if(epoch===routeEpoch){applyingRoute=false;const view=[...document.querySelectorAll('.view')].find(el=>!el.hidden)?.id || 'home';syncRoute(view,true);}}
}
window.addEventListener('popstate',()=>applyLocation());
routingReady=true;
await applyLocation();
