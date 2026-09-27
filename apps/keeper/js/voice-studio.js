// Author: Alex Picon <alexnpc@me.com>
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function request(path, data) {
  const response = await fetch('/api/keeper/voice/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(195000)});
  const result = await response.json();
  if(!response.ok) throw new Error(typeof result.detail==='string'?result.detail:'The service is unavailable. Please try again.');
  return result;
}
async function readData(blob) {
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
}
export function createVoiceStudio(hooks) {
  let bookId=null, language='Original', activeClip=null, words=[], latestTranscript=null, interviewQuestions=[], judgeIndex=0, judging=false, voiceRequest=0, interviewRequest=0;
  const chapterAudio=$('chapterAudio');
  const selectedPage=()=>hooks.book()?.pages[hooks.pageIndex()];
  const editionPage=()=>language==='Original'?selectedPage():hooks.book()?.translations?.[language]?.pages[hooks.pageIndex()];
  const narrationKey=()=>`${language}:${$('narratorVoice').value}`;
  function stop(){chapterAudio.pause();$('interviewAudio').pause();$('originalAudio').pause();}
  function resetCapture(){interviewRequest++;latestTranscript=null;interviewQuestions=[];$('transcriptProposal').hidden=true;$('transcribeStatus').textContent='';$('interviewStatus').textContent='';$('audioUpload').value='';$('interviewAudio').pause();$('interviewAudio').hidden=true;}
  function resetBook() {
    const book=hooks.book();
    if(book!==bookId){stop();bookId=book;language='Original';$('editionSelect').value='Original';$('narratorVoice').value=book?.defaultVoice || 'sarah';}
    $('sourceAudioLabel').textContent=book?.audioKind==='generated-demo'?'Fictional demo source · ElevenLabs-generated voice, not a real family recording.':book?.audio?'Original recording · the actual recorded voice, kept separately from generated narration.':'Written recollection · no original family recording attached.';
    const transcript=book?.transcript;
    $('sourceTimeline').innerHTML=transcript?.words?.length?'<p class="muted">ElevenLabs Scribe transcript · click a word to hear that moment. Speaker labels are automatic.</p>'+transcript.words.map((w,i)=>`<button type="button" data-source-word="${i}" title="${esc(w.speaker || 'Speaker')} · ${Number(w.start).toFixed(1)}s">${esc(w.text)}</button>`).join(''):'';
    $('sourceTimeline').querySelectorAll('[data-source-word]').forEach(button=>button.onclick=()=>{chapterAudio.pause();$('originalAudio').currentTime=transcript.words[Number(button.dataset.sourceWord)].start;$('originalAudio').play().catch(()=>{$('readerStatus').textContent='Press play on the original recording to listen.';});});
  }
  function markWords(text,alignment) {
    words=[];
    if(!alignment?.characters)return;
    const aligned=alignment.characters.join('');
    const tokens=/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
    const visibleTokens=[...text.matchAll(tokens)], alignedTokens=[...aligned.matchAll(tokens)];
    const sameWord=word=>word.normalize('NFC').replace(/[’‘]/g,"'").toLowerCase();
    // Providers normalize paragraph breaks and punctuation. Match actual words,
    // retaining the family's formatting and refusing changed wording.
    if(visibleTokens.length!==alignedTokens.length||visibleTokens.some((token,i)=>sameWord(token[0])!==sameWord(alignedTokens[i][0])))return;
    const starts=alignment.character_start_times_seconds, ends=alignment.character_end_times_seconds;
    if(!starts||!ends||starts.length!==aligned.length||ends.length!==aligned.length)return;
    let html='',cursor=0;
    visibleTokens.forEach((match,index)=>{
      const spoken=alignedTokens[index];
      html+=esc(text.slice(cursor,match.index));
      words.push({start:starts[spoken.index],end:ends[spoken.index+spoken[0].length-1]});
      html+=`<span class="spoken-word" data-word="${index}">${esc(match[0])}</span>`;cursor=match.index+match[0].length;
    });
    html+=esc(text.slice(cursor));$('pageProse').innerHTML=html;
  }
  function render() {
    voiceRequest++;stop();resetBook();activeClip=null;words=[];
    chapterAudio.hidden=true;chapterAudio.removeAttribute('src');$('downloadAudioBtn').hidden=true;
    const book=hooks.book(), page=selectedPage(), edition=editionPage();
    const translated=language!=='Original'&&Boolean(edition);
    $('translateBtn').disabled=language==='Original';$('translateBtn').textContent=translated?'Translate again live':'Create translated edition';
    $('translationReview').hidden=!translated;$('translationReviewed').checked=translated&&Boolean(book.translations[language].reviewed);
    $('narrateBtn').disabled=!edition;$('narrateBtn').textContent='Listen to this chapter ♪';
    $('bookTitle').textContent=translated?book.translations[language].title:book.title;
    if(translated){document.querySelector('.page-text h2').textContent=edition.title;$('pageProse').textContent=edition.text;}
    $('editPageBtn').hidden=language!=='Original';
    const clip=page?.narrations?.[narrationKey()];
    $('voiceProvenance').textContent=clip?.prepared?(clip.provenance || 'Prepared ElevenLabs audio · fictional example'):'ElevenLabs · generated narrator';
    $('voiceStatus').textContent=!edition?'Create this edition to read and hear it. Your original will stay alongside it.':translated?`${language} edition · ${book.translations[language].prepared?'prepared demo translation':'Grok translation'} · check names and meaning with your family.`:'Narration is a generated reading voice. Your original recording stays separate.';
    if(clip&&clip.text===edition?.text)loadClip(clip,false);
    const allReady=['Original','Spanish'].every(lang=>book.pages.every((p,i)=>{const audio=p.narrations?.[`${lang}:${$('narratorVoice').value}`];const text=lang==='Original'?p.text:book.translations?.Spanish?.pages[i]?.text;return audio?.prepared&&audio.text===text;}));
    if(allReady&&['Original','Spanish'].includes(language))$('voiceStatus').textContent=`All ${book.pages.length} chapters are prebuilt in English and Spanish with ElevenLabs. Press play—no generation needed.`;
  }
  function loadClip(clip,play) {
    activeClip=clip;chapterAudio.src=clip.audio;chapterAudio.hidden=false;$('downloadAudioBtn').hidden=false;
    markWords(editionPage().text,clip.alignment);
    $('narrateBtn').textContent='Regenerate narration live';
    $('voiceProvenance').textContent=clip.prepared?(clip.provenance || 'Prepared ElevenLabs audio · fictional example'):'ElevenLabs narration · generated for this page';
    if(play)chapterAudio.play().catch(()=>{$('voiceStatus').textContent='Narration is ready. Press play to listen.';});
  }
  chapterAudio.addEventListener('timeupdate',()=>{
    const now=chapterAudio.currentTime;
    document.querySelectorAll('.spoken-word').forEach((span,i)=>span.classList.toggle('active',Boolean(words[i]&&now>=words[i].start&&now<words[i].end)));
  });
  chapterAudio.onplay=()=>{$('originalAudio').pause();$('interviewAudio').pause();};
  chapterAudio.onended=async()=>{
    if($('continuousReading').checked&&hooks.pageIndex()<hooks.book().pages.length-1){hooks.setPage(hooks.pageIndex()+1);hooks.render();if(activeClip)chapterAudio.play().catch(()=>{});else await narrate();}
  };
  async function narrate() {
    const target=hooks.book(),page=selectedPage(),edition=editionPage(),key=narrationKey(),voice=$('narratorVoice').value;
    if(!edition)return;
    const text=edition.text, token=++voiceRequest;
    $('narrateBtn').disabled=true;$('voiceStatus').textContent='ElevenLabs is recording this chapter…';
    try {
      const clip=await request('narrate',{text,voice});
      if(token!==voiceRequest||hooks.book()!==target||editionPage()?.text!==text)return;
      page.narrations??={};page.narrations[key]={...clip,text};
      await hooks.save();loadClip(page.narrations[key],true);$('voiceStatus').textContent='Ready · ElevenLabs generated reading voice. Included when you download this edition.';
    }catch(error){if(token===voiceRequest)$('voiceStatus').textContent=error.message;}
    finally{if(token===voiceRequest)$('narrateBtn').disabled=false;}
  }
  $('narrateBtn').onclick=narrate;
  $('narratorVoice').onchange=()=>hooks.render();
  $('editionSelect').onchange=()=>{language=$('editionSelect').value;hooks.render();};
  $('translateBtn').onclick=async()=>{
    const book=hooks.book(),target=language,source=JSON.stringify(book.pages.map(p=>({title:p.title,text:p.text})));
    if(target==='Original')return;
    $('translateBtn').disabled=true;$('voiceStatus').textContent=`Creating a ${target} edition with Grok…`;
    try {
      const result=await request('translate',{language:target,title:book.title,pages:JSON.parse(source)});
      if(hooks.book()!==book||JSON.stringify(book.pages.map(p=>({title:p.title,text:p.text})))!==source)return;
      book.private_changes=true;delete book.prepared_audio;book.translations??={};book.translations[target]=result;
      for(const page of book.pages)for(const key of Object.keys(page.narrations||{}))if(key.startsWith(target+':'))delete page.narrations[key];
      await hooks.save();hooks.render();
    }catch(error){$('voiceStatus').textContent=error.message;}
    finally{$('translateBtn').disabled=language==='Original';}
  };
  $('translationReviewed').onchange=async()=>{const edition=hooks.book()?.translations?.[language];if(edition){edition.reviewed=$('translationReviewed').checked;await hooks.save();}};
  $('downloadAudioBtn').onclick=async()=>{
    if(!activeClip)return;
    try {const response=await fetch(activeClip.audio);if(!response.ok)throw new Error();const url=URL.createObjectURL(await response.blob()),a=document.createElement('a');a.href=url;a.download=`keeper-chapter-${hooks.pageIndex()+1}-${language}.mp3`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
    catch{$('voiceStatus').textContent='Audio download failed. Please retry.';}
  };
  $('hearPromptBtn').onclick=async()=>{
    if(hooks.isRecording()){$('interviewStatus').textContent='Stop recording before playing the guide, so its voice stays out of your memory.';return;}
    const text=$('promptText').textContent,token=++interviewRequest;
    $('hearPromptBtn').disabled=true;$('interviewStatus').textContent='Preparing your spoken question…';
    try {const clip=await request('narrate',{text,voice:'sarah'});if(token!==interviewRequest)return;$('interviewAudio').src=clip.audio;$('interviewAudio').hidden=false;$('interviewAudio').play().catch(()=>{});$('interviewStatus').textContent='ElevenLabs guide · generated voice';}
    catch(error){if(token===interviewRequest)$('interviewStatus').textContent=error.message;}
    finally{$('hearPromptBtn').disabled=false;}
  };
  $('followupBtn').onclick=async()=>{
    const text=$('memoryText').value.trim();if(text.length<20){$('interviewStatus').textContent='Tell a little of the story first—at least 20 characters.';return;}
    const token=++interviewRequest;$('followupBtn').disabled=true;$('interviewStatus').textContent='Finding a question in the details you shared…';
    try {const result=await request('interview',{text,perspective:document.querySelector('input[name=perspective]:checked').value,previous:interviewQuestions.slice(-12)});if(token!==interviewRequest)return;$('promptText').textContent=result.question;interviewQuestions.push(result.question);$('interviewStatus').textContent=`Inspired by your words: “${result.anchor}” · Press Listen to hear it.`;}
    catch(error){if(token===interviewRequest)$('interviewStatus').textContent=error.message;}
    finally{$('followupBtn').disabled=false;}
  };
  $('audioUpload').onchange=async()=>{
    const file=$('audioUpload').files[0];if(!file)return;
    if(file.size>20*1024*1024){$('transcribeStatus').textContent='Choose a recording smaller than 20 MB.';return;}
    if(hooks.isRecording()){$('transcribeStatus').textContent='Stop the current recording before selecting another.';return;}
    try {const audio=await readData(file);await hooks.setAudio(audio);$('recording').src=audio;$('recording').hidden=false;latestTranscript=null;$('transcriptProposal').hidden=true;$('transcribeStatus').textContent=`${file.name} loaded locally. Choose Transcribe to send it to ElevenLabs.`;}
    catch{$('transcribeStatus').textContent='Could not read the file. Try another recording.';}
  };
  $('transcribeBtn').onclick=async()=>{
    const source=hooks.audio();if(!source){$('transcribeStatus').textContent='Record a memory or choose an audio file first.';return;}
    if(hooks.isRecording()){$('transcribeStatus').textContent='Stop recording before transcribing.';return;}
    $('transcribeBtn').disabled=true;$('transcribeStatus').textContent='ElevenLabs Scribe is listening…';
    try {
      const blob=await (await fetch(source)).blob(),data=new FormData();data.append('file',blob,'memory.audio');
      const response=await fetch('/api/keeper/voice/transcribe',{method:'POST',body:data,signal:AbortSignal.timeout(100000)}),result=await response.json();
      if(!response.ok)throw new Error(typeof result.detail==='string'?result.detail:'Transcription failed. Try another recording.');
      if(hooks.audio()!==source)return;
      latestTranscript=result;$('proposedText').value=result.text;$('transcriptProposal').hidden=false;
      $('transcribeStatus').textContent=`ElevenLabs Scribe · ${result.language} · ${result.words.length} timestamped words. Review before using.`;
    }catch(error){$('transcribeStatus').textContent=error.message;}
    finally{$('transcribeBtn').disabled=false;}
  };
  $('acceptTranscriptBtn').onclick=async()=>{
    if(!latestTranscript)return;
    $('memoryText').value=$('proposedText').value.slice(0,60000);$('memoryText').dispatchEvent(new Event('input',{bubbles:true}));
    hooks.setTranscript(latestTranscript);await hooks.saveDraft();$('transcriptProposal').hidden=true;$('transcribeStatus').textContent='Transcript added. Check names and details before making the book. Timestamp links retain the original machine transcript.';
  };
  const legacyJudgeSteps=[
    ['Let Grandpa tell the whole story.','Grandpa tells the whole adventure: a sister, an orange-peel boat, a storm, and a captain who found his way home. Play his telling, or jump to any word.','ElevenLabs Scribe created these timestamps from the prepared, ElevenLabs-generated sample. This is not a real grandparent recording.'],
    ['One telling. Eight chapters of adventure.','Follow the adventure through eight substantial illustrated chapters. Play the narration, turn a page, or choose another chapter from the contents.','Prepared ElevenLabs narration and timestamps are ready now. “Regenerate narration live” makes a fresh API request.'],
    ['Every chapter keeps a way back.','Compare the storybook with Grandpa’s original telling. Each chapter identifies its imagined scenes and dialogue; the original is preserved separately.','This is a creative adaptation, not a transcript. Source anchors are exact; additions are disclosed chapter by chapter.'],
    ['One family. More than one language.','This is the Spanish edition. Press play, then switch to Original language to compare. You can create English, French, Portuguese, or Hindi editions live.','Spanish text was prepared with Grok, and narration with ElevenLabs. Translation preserves the source separately and needs family review.'],
    ['Give the family something they can keep.','Check the story and translation review boxes below, then download the family book. The file carries the text, artwork, source, and prepared audio.','No account required. A self-contained HTML book opens offline. PDF keeps the pictures and words; HTML keeps the voices.']
  ];
  const familyJudgeSteps=[
    ['Let Grandma tell her story.','Her husband worked at the docks. Their four-year-old daughter thanked him for the bread, then asked for butter. This telling stays in Grandma’s first-person voice.','Reconstructed from family recollections. ElevenLabs provides a clearly labeled reading voice; no original family recording is claimed.'],
    ['A short chapter. A scene of its own.','Eight concise chapters, each with a different illustration. This is the innocent request for butter—and the pain of being unable to afford it.','Use the contents to move through the book. The illustrations are interpretations, not family photographs.'],
    ['Her faith, in her own words.','Grandma prayed to la Virgen del Carmen de la Legua in Callao, Perú. Her faith belongs in her narration. Her grandchild’s different view stays in a separate family note.','The devotional image was checked against local references. Source recollections and adaptation notes remain available.'],
    ['Hear the telling in Spanish.','The Spanish edition preserves Grandma’s perspective and the name Virgen del Carmen de la Legua. Play the prepared opening, or generate another chapter live.','Translation by Grok; opening narration by ElevenLabs. Review the translated edition with your family before sharing.'],
    ['Keep her telling in the family.','Review the book and translated edition, then download it. The file keeps every chapter, illustration, source recollection, family note, and available narration.','The source for this book is written family recollection. Downloaded HTML opens offline; PDF keeps words and pictures.']
  ];
  const isFamilyDemo=()=>hooks.book()?.provenance?.kind==='woven-recollections';
  function judgeStep(){
    const family=isFamilyDemo(),judgeSteps=family?familyJudgeSteps:legacyJudgeSteps;
    judging=true;$('judgePanel').hidden=false;
    const [title,description,evidence]=judgeSteps[judgeIndex];$('judgeTitle').textContent=title;$('judgeDescription').textContent=description;$('judgeEvidence').textContent=evidence;$('judgeStep').textContent=`${judgeIndex+1} / ${judgeSteps.length} · about 90 seconds`;
    $('judgeAction').textContent=(family?['Listen to her telling ♪','Read the butter chapter ↓','Read her faith story ↓','Listen in Spanish ♪','Review and download ↓']:['Play the source ♪','Play the chapter ♪','Show the source excerpt ↓','Listen in Spanish ♪','Review and download ↓'])[judgeIndex];
    $('judgePrev').disabled=judgeIndex===0;$('judgeNext').textContent=judgeIndex===judgeSteps.length-1?'Start again ↻':'Next moment →';
    language=judgeIndex>=3?'Spanish':'Original';$('editionSelect').value=language;hooks.setPage(family?[0,2,6,0,7][judgeIndex]:0);hooks.render();
    document.querySelector('.original').open=!family&&judgeIndex===0;
    document.querySelector('.source-quote').open=judgeIndex===2;
    $('judgePanel').scrollIntoView({block:'start'});hooks.routeChanged?.();
  }
  $('judgeAction').onclick=()=>{
    if(isFamilyDemo()&&(judgeIndex===0||judgeIndex===3)){chapterAudio.play().catch(()=>{$('voiceStatus').textContent='Press play to hear the prepared narration.';});document.querySelector('.voice-studio').scrollIntoView({block:'start'});}
    else if(isFamilyDemo()&&(judgeIndex===1||judgeIndex===2))$('bookPages').scrollIntoView({block:'start'});
    else if(judgeIndex===0){chapterAudio.pause();$('originalAudio').play().catch(()=>{$('readerStatus').textContent='Press play on the source recording.';});}
    else if(judgeIndex===1||judgeIndex===3){chapterAudio.play().catch(()=>{$('voiceStatus').textContent='Press play to hear this chapter.';});document.querySelector('.voice-studio').scrollIntoView({block:'start'});}
    else if(judgeIndex===2)document.querySelector('.source-quote').scrollIntoView({block:'center'});
    else document.querySelector('.review-panel').scrollIntoView({block:'center'});
  };
  $('judgePrev').onclick=()=>{judgeIndex=Math.max(0,judgeIndex-1);judgeStep();};
  $('judgeNext').onclick=()=>{judgeIndex=(judgeIndex+1)%5;judgeStep();};
  $('judgeExit').onclick=()=>{judging=false;$('judgePanel').hidden=true;stop();hooks.routeChanged?.();};
  async function openExample(judge=false,path='stories/lima/bread/book.json',canApply=()=>true){
    stop();
    try {const response=await fetch(path);if(!response.ok)throw new Error();const book=await response.json();if(!canApply())return;hooks.open(book);if(judge){judgeIndex=0;judgeStep();}else{$('judgePanel').hidden=true;judging=false;}}
    catch{if(!canApply())return;hooks.openFallback();if(judge){$('readerStatus').textContent='Prepared voice demo is unavailable. The example book and live voice tools still work.';}}
  }
  return {render,stop,resetCapture,openExample,isJudging:()=>judging,
    selectEdition(value){if(value==='Original'||hooks.book()?.translations?.[value]){language=value;$('editionSelect').value=value;hooks.render();}},
    onView(view){stop();if(view!=='capture')interviewRequest++;if(view!=='reader'){voiceRequest++;judging=false;$('judgePanel').hidden=true;}},
    invalidate(){const book=hooks.book();delete book.prepared_audio;book.translations={};for(const page of book.pages)page.narrations={};language='Original';$('editionSelect').value='Original';},
    canExport(){if(language!=='Original'&&!hooks.book()?.translations?.[language]?.reviewed){$('readerStatus').textContent='Review this translated edition before sharing, or switch back to Original language.';$('translationReviewed').focus();return false;}return true;},
    exportState(){return {language,voice:$('narratorVoice').value,edition:language==='Original'?null:hooks.book()?.translations?.[language]};}
  };
}
