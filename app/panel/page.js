'use client';

import { useEffect, useMemo, useState } from 'react';
import { uploadPresigned as uploadBlob } from '@vercel/blob/client';

const emptySub = (i) => ({ id: `plano${i}`, enabled: false, name: '', price: 0, delivery: { enabled:true, type:'telegram', chatId:'', chatTitle:'', chatType:'', verified:false, canInviteUsers:false } });
const emptyPost = (i) => ({ id: i, enabled: false, media: '', likedBy: '', likedByAvatar: `curtiu${Math.min(i,3)}`, description: '' });

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function ensureArray(arr, count, factory) {
  const out = Array.isArray(arr) ? arr.map(clone) : [];
  while (out.length < count) out.push(factory(out.length + 1));
  return out.slice(0, count);
}

function Field({ label, children }) {
  return <label className="panelField"><span>{label}</span>{children}</label>;
}
function TextInput(props) { return <input className="panelInput" {...props}/>; }
function TextArea(props) { return <textarea className="panelTextarea" {...props}/>; }

function mediaKind(src='') {
  const clean=String(src||'').split('?')[0].toLowerCase();
  if(/\.(mp4|webm|mov|m4v)$/.test(clean)) return 'video';
  if(/\.(mp3|ogg|wav|m4a|aac|flac)$/.test(clean)) return 'audio';
  if(/\.(jpg|jpeg|png|webp|gif|avif)$/.test(clean)) return 'image';
  return 'unknown';
}
function MediaPreview({ src, accept }) {
  if(!src) return <div className="panelMediaEmpty">Nenhuma mídia configurada</div>;
  let kind=mediaKind(src);
  if(kind==='unknown'){
    if(accept?.includes('audio')) kind='audio';
    else if(accept?.includes('video')) kind='video';
    else if(accept?.includes('image')) kind='image';
  }
  return <div className="panelMediaPreview">
    {kind==='image' && <img src={src} alt="Mídia atual" />}
    {kind==='video' && <video src={src} controls muted playsInline preload="metadata" />}
    {kind==='audio' && <audio src={src} controls preload="metadata" />}
    {kind==='unknown' && <a href={src} target="_blank" rel="noreferrer">Abrir mídia atual</a>}
  </div>;
}
function UploadRow({ label, value, slot, accept, onChange, onUpload, busy }) {
  const [localPreview,setLocalPreview]=useState('');
  useEffect(()=>()=>{ if(localPreview?.startsWith('blob:')) URL.revokeObjectURL(localPreview); },[localPreview]);
  const preview=localPreview || value || '';
  async function chooseFile(file){
    if(!file) return;
    if(localPreview?.startsWith('blob:')) URL.revokeObjectURL(localPreview);
    const objectUrl=URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    try{ await onUpload(slot,file); }catch{ setLocalPreview(''); }
  }
  return <div className="panelUploadBlock">
    <div className="panelUploadRow">
      <Field label={label}><TextInput value={value || ''} onChange={e=>{setLocalPreview('');onChange(e.target.value)}} placeholder="/arquivo.jpg ou URL"/></Field>
      <label className={`panelUploadButton ${busy?'busy':''}`}>
        {busy ? 'Enviando…' : 'Upload'}
        <input hidden type="file" accept={accept} onChange={e=>{const f=e.target.files?.[0]; if(f) chooseFile(f); e.target.value='';}}/>
      </label>
    </div>
    <MediaPreview src={preview} accept={accept}/>
  </div>;
}

export default function PanelPage() {
  const [checking,setChecking]=useState(true);
  const [authenticated,setAuthenticated]=useState(false);
  const [login,setLogin]=useState({username:'',password:''});
  const [loginError,setLoginError]=useState('');
  const [config,setConfig]=useState(null);
  const [mode,setMode]=useState('local');
  const [status,setStatus]=useState('');
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState('');
  const [rawJson,setRawJson]=useState('');
  const [telegram,setTelegram]=useState({configured:false,maskedToken:'',bot:null,error:''});
  const [telegramToken,setTelegramToken]=useState('');
  const [telegramBusy,setTelegramBusy]=useState(false);
  const [telegramVerify,setTelegramVerify]=useState('');
  const [migratingMedia,setMigratingMedia]=useState(false);

  async function checkSession(){
    setChecking(true);
    try{const r=await fetch('/api/panel/session',{cache:'no-store'});const d=await r.json();setAuthenticated(!!d.authenticated);if(d.authenticated)await loadConfig();}
    finally{setChecking(false)}
  }
  async function loadConfig(){
    const r=await fetch('/api/panel/config',{cache:'no-store'});const d=await r.json();
    if(!r.ok) throw new Error(d.error||'Erro ao carregar');
    const next=clone(d.config);
    next.profile ||= {}; next.profile.socials ||= {instagram:'',x:'',tiktok:''};
    next.counts ||= {posts:0,media:0}; next.interaction ||= {clickLockMs:300};
    next.media ||= {};
    next.subscriptions=ensureArray(next.subscriptions,4,emptySub).map((s,i)=>({...emptySub(i+1),...s,delivery:{...emptySub(i+1).delivery,...(s.delivery||{}),enabled:true,type:'telegram'}}));
    next.posts=ensureArray(next.posts,3,emptyPost).map((p,i)=>({...emptyPost(i+1),...p,id:i+1,enabled:p.enabled!==false}));
    next.likedByAvatars ||= {curtiu1:'/curtiu1.jpg',curtiu2:'/curtiu2.jpg',curtiu3:'/curtiu3.jpg'};
    next.lockedPost ||= {enabled:true,title:'',likedBy:'',likedByAvatar:'curtiu1',description:''};
    if(next.lockedPost.enabled===undefined) next.lockedPost.enabled=true;
    next.audio ||= {src:'/AudioBoasVindas.ogg',ariaLabel:'Áudio'};
    next.orderBump ||= {}; next.orderBump.benefits ||= []; next.orderBump.includeButton ||= '🔥 Incluir'; next.orderBump.skipButton ||= '🚫 Somente o VIP'; next.orderBump.media=ensureArray(next.orderBump.media,2,i=>({enabled:true,src:i===1?'/bump-1.jpg':'/bump-2.mp4',caption:`Mídia ${i}`})).map(item=>({enabled:item.enabled!==false,src:item.src||'',caption:item.caption||''}));
    setConfig(next);setMode(d.mode||'local');
    try{const tr=await fetch('/api/panel/telegram',{cache:'no-store'});const td=await tr.json();setTelegram(td||{configured:false});}catch{}
  }
  useEffect(()=>{checkSession().catch(()=>setChecking(false));},[]);

  async function submitLogin(e){
    e.preventDefault();setLoginError('');
    const r=await fetch('/api/panel/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(login)});const d=await r.json();
    if(!r.ok){setLoginError(d.error||'Login inválido');return;}
    setAuthenticated(true);await loadConfig();
  }
  async function logout(){await fetch('/api/panel/logout',{method:'POST'});setAuthenticated(false);setConfig(null);}

  function patchProfile(key,value){setConfig(c=>({...c,profile:{...c.profile,[key]:value}}));}
  function patchSocial(key,value){setConfig(c=>({...c,profile:{...c.profile,socials:{...c.profile.socials,[key]:value}}}));}
  function patchMedia(key,value){setConfig(c=>({...c,media:{...c.media,[key]:value}}));}
  function patchSub(index,key,value){setConfig(c=>{const s=[...c.subscriptions];s[index]={...s[index],[key]:value};return {...c,subscriptions:s};});}
  function patchSubDelivery(index,key,value){setConfig(c=>{const s=[...c.subscriptions];s[index]={...s[index],delivery:{...(s[index].delivery||{}),[key]:value}};return {...c,subscriptions:s};});}
  async function saveTelegramToken(){setTelegramBusy(true);setStatus('');try{const r=await fetch('/api/panel/telegram',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:telegramToken})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Falha ao salvar token');setTelegram(d);setTelegramToken('');setStatus(`Telegram conectado: @${d.bot?.username||'bot'}`);}catch(err){setStatus(`Erro Telegram: ${err.message}`)}finally{setTelegramBusy(false)}}
  async function testTelegram(){setTelegramBusy(true);setStatus('');try{const r=await fetch('/api/panel/telegram',{cache:'no-store'});const d=await r.json();setTelegram(d);if(d.error)throw new Error(d.error);setStatus(d.configured?`Bot conectado: @${d.bot?.username||'bot'}`:'Token Telegram não configurado.');}catch(err){setStatus(`Erro Telegram: ${err.message}`)}finally{setTelegramBusy(false)}}
  async function verifyTelegramDelivery(index){const sub=config.subscriptions[index];const chatId=String(sub.delivery?.chatId||'').trim();if(!chatId){setStatus('Informe o ID ou @username do canal/grupo.');return;}setTelegramVerify(`sub-${index}`);setStatus('');try{const r=await fetch('/api/panel/telegram',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'verifyChat',chatId})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Falha ao verificar');setConfig(c=>{const s=[...c.subscriptions];s[index]={...s[index],delivery:{...(s[index].delivery||{}),enabled:true,type:'telegram',chatId:d.chat.id,chatTitle:d.chat.title,chatType:d.chat.type,verified:!!d.membership.isAdmin,canInviteUsers:!!d.membership.canInviteUsers}};return {...c,subscriptions:s};});setStatus(d.membership.isAdmin?(d.membership.canInviteUsers?`✓ ${d.chat.title}: bot é admin e pode gerar convites.`:`⚠ ${d.chat.title}: bot é admin, mas sem permissão para convidar usuários.`):`✕ ${d.chat.title}: bot não é administrador.`);}catch(err){setStatus(`Erro Telegram: ${err.message}`)}finally{setTelegramVerify('')}}
  function patchPost(index,key,value){setConfig(c=>{const p=[...c.posts];p[index]={...p[index],[key]:value};return {...c,posts:p};});}
  function patchBumpMedia(index,key,value){setConfig(c=>{const media=[...(c.orderBump.media||[])];media[index]={...media[index],[key]:value};return {...c,orderBump:{...c.orderBump,media}};});}

  async function uploadFileToBlob(slot,file,onProgress){
    const rawName=String(file?.name||'arquivo.bin');
    const dot=rawName.lastIndexOf('.');
    const ext=dot>=0?rawName.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g,''):'';
    const stem=(dot>=0?rawName.slice(0,dot):rawName)
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'') || 'arquivo';
    const pathname=`panel-media/${slot}/${Date.now()}-${stem}${ext}`;

    const blob=await uploadBlob(pathname,file,{
      access:'public',
      handleUploadUrl:'/api/panel/upload',
      clientPayload:JSON.stringify({slot}),
      multipart:file.size>100*1024*1024,
      onUploadProgress:({percentage})=>onProgress?.(Math.round(percentage||0)),
    });

    return {
      url: blob.url,
      blobPathname:blob.pathname,
    };
  }

  async function upload(slot,file,apply,currentUrl=''){
    setUploading(slot);setStatus('Preparando upload…');
    try{
      const result=await uploadFileToBlob(slot,file,p=>setStatus(`Enviando para o Blob… ${p}%`));
      apply(result.url);
      setStatus('Upload concluído no Vercel Blob. Clique em Salvar alterações para publicar esta mídia na LP.');
      return {ok:true,url:result.url,blobPathname:result.blobPathname,mode:'blob'};
    }catch(err){
      const message=err instanceof Error?err.message:String(err);
      setStatus(`Erro no upload: ${message}`);
      throw err;
    }finally{setUploading('')}
  }

  function isLegacyMedia(src=''){
    const clean=String(src||'').trim();
    return /^\/(?!api\/media\/).+\.(jpg|jpeg|png|webp|gif|avif|mp4|webm|mov|m4v|mp3|ogg|wav|m4a|aac|flac)$/i.test(clean.split('?')[0]);
  }

  async function migrateLegacyMedia(){
    if(migratingMedia) return;
    const next=clone(config);
    next.media ||= {};
    next.audio ||= {};
    next.likedByAvatars ||= {};
    next.posts ||= [];
    next.orderBump ||= {}; next.orderBump.media ||= [];

    const targets=[
      ['profile','Foto de perfil',()=>next.media.profile,v=>next.media.profile=v],
      ['cover','Capa',()=>next.media.cover,v=>next.media.cover=v],
      ['brand-logo','Logo topo',()=>next.media.brandLogo,v=>next.media.brandLogo=v],
      ['hero-stats','Estatísticas do perfil',()=>next.media.heroStats,v=>next.media.heroStats=v],
      ['post-actions','Ações das postagens',()=>next.media.postActions,v=>next.media.postActions=v],
      ['vip-post','Imagem VIP bloqueada',()=>next.media.vipPost,v=>next.media.vipPost=v],
      ['vip-grid','Imagem VIP do grid',()=>next.media.vipGrid,v=>next.media.vipGrid=v],
      ['welcome-audio','Áudio de boas-vindas',()=>next.audio.src,v=>next.audio.src=v],
      ...['curtiu1','curtiu2','curtiu3'].map(key=>[key,`Avatar ${key}`,()=>next.likedByAvatars[key],v=>next.likedByAvatars[key]=v]),
      ...next.posts.map((post,i)=>[`postagem${i+1}`,`Postagem ${i+1}`,()=>post.media,v=>post.media=v]),
      ...next.orderBump.media.map((item,i)=>[`bump-${i+1}`,`Order bump ${i+1}`,()=>item.src,v=>item.src=v]),
    ];
    const pending=targets.filter(([, ,get])=>isLegacyMedia(get()));
    if(!pending.length){setStatus('Todas as mídias configuradas já estão no Blob ou usam URL externa.');return;}

    setMigratingMedia(true);
    setUploading('migration');
    try{
      for(let i=0;i<pending.length;i++){
        const [slot,label,get,setValue]=pending[i];
        const src=get();
        setStatus(`Migrando ${i+1}/${pending.length}: ${label}…`);
        const response=await fetch(src,{cache:'no-store'});
        if(!response.ok) throw new Error(`${label}: não consegui ler ${src} (${response.status}).`);
        const body=await response.blob();
        const clean=src.split('?')[0];
        const basename=decodeURIComponent(clean.split('/').pop()||`${slot}.bin`);
        const file=new File([body],basename,{type:body.type||'application/octet-stream'});
        const result=await uploadFileToBlob(slot,file,p=>setStatus(`Migrando ${i+1}/${pending.length}: ${label} — ${p}%`));
        setValue(result.url);
      }

      const saveResponse=await fetch('/api/panel/config',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});
      const saveData=await saveResponse.json();
      if(!saveResponse.ok) throw new Error(saveData.error||'Falha ao salvar a configuração migrada.');
      setConfig(next);
      setRawJson(JSON.stringify(next,null,2));
      setStatus(`Migração concluída: ${pending.length} mídia(s) movida(s) para o Blob e config.json atualizado no GitHub.`);
    }catch(err){
      setStatus(`Erro na migração: ${err instanceof Error?err.message:String(err)}`);
    }finally{
      setUploading('');
      setMigratingMedia(false);
    }
  }


  async function save(){
    setSaving(true);setStatus('');
    try{
      const r=await fetch('/api/panel/config',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(config)});const d=await r.json();
      if(!r.ok)throw new Error(d.error||'Falha ao salvar');
      setStatus(d.mode==='github'?'Salvo no GitHub. A Vercel fará um novo deploy automaticamente.':'Salvo. No desenvolvimento local basta atualizar a LP com F5.');
    }catch(err){setStatus(`Erro: ${err.message}`)}finally{setSaving(false)}
  }

  useEffect(()=>{ if(config) setRawJson(JSON.stringify(config,null,2)); },[config]);
  const visibleSubs=useMemo(()=>config?.subscriptions?.filter(s=>s.enabled).length||0,[config]);

  if(checking) return <main className="panelPage"><div className="panelCard panelCenter">Carregando…</div></main>;
  if(!authenticated) return <main className="panelPage"><form className="panelCard panelLogin" onSubmit={submitLogin}><h1>Painel Bruna</h1><p>Entre para editar a LP.</p><Field label="Usuário"><TextInput value={login.username} onChange={e=>setLogin({...login,username:e.target.value})}/></Field><Field label="Senha"><TextInput type="password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})}/></Field>{loginError&&<div className="panelError">{loginError}</div>}<button className="panelPrimary" type="submit">Entrar</button></form></main>;
  if(!config) return <main className="panelPage"><div className="panelCard panelCenter">Carregando configuração…</div></main>;

  return <main className="panelPage">
    <div className="panelTop"><div><strong>bruna.dcarv / panel</strong><small>Modo: {mode==='github'?'GitHub':'Local'}</small></div><div className="panelTopActions"><a href="/" target="_blank">Abrir LP</a><button type="button" onClick={logout}>Sair</button></div></div>
    <div className="panelWrap">
      <section className="panelCard"><h2>Perfil</h2><div className="panelGrid2"><Field label="Nome"><TextInput value={config.profile.name||''} onChange={e=>patchProfile('name',e.target.value)}/></Field><Field label="@ usuário"><TextInput value={config.profile.username||''} onChange={e=>patchProfile('username',e.target.value)}/></Field><Field label="Texto/logo do topo"><TextInput value={config.profile.brandText||''} onChange={e=>patchProfile('brandText',e.target.value)}/></Field><Field label="Bloqueio entre cliques (ms)"><TextInput type="number" min="0" value={config.interaction.clickLockMs??300} onChange={e=>setConfig(c=>({...c,interaction:{...c.interaction,clickLockMs:Number(e.target.value)}}))}/></Field></div><Field label="Bio — uma linha por linha"><TextArea rows={11} value={(config.profile.bio||[]).join('\n')} onChange={e=>patchProfile('bio',e.target.value.split('\n'))}/></Field><div className="panelGrid3"><Field label="Instagram"><TextInput value={config.profile.socials.instagram||''} onChange={e=>patchSocial('instagram',e.target.value)}/></Field><Field label="X"><TextInput value={config.profile.socials.x||''} onChange={e=>patchSocial('x',e.target.value)}/></Field><Field label="TikTok"><TextInput value={config.profile.socials.tiktok||''} onChange={e=>patchSocial('tiktok',e.target.value)}/></Field></div><p className="panelHint">OBS: deixe o link vazio para o botão ficar apenas visual, sem redirecionamento.</p></section>

      <section className="panelCard"><h2>Mídias principais</h2><UploadRow label="Foto de perfil" value={config.media.profile||'/profile.jpg'} slot="profile" accept="image/*" onChange={v=>patchMedia('profile',v)} onUpload={(s,f)=>upload(s,f,v=>patchMedia('profile',v),config.media.profile||'/profile.jpg')} busy={uploading==='profile'}/><UploadRow label="Capa" value={config.media.cover||'/cover.jpg'} slot="cover" accept="image/*" onChange={v=>patchMedia('cover',v)} onUpload={(s,f)=>upload(s,f,v=>patchMedia('cover',v),config.media.cover||'/cover.jpg')} busy={uploading==='cover'}/><UploadRow label="Logo topo" value={config.media.brandLogo||'/brunadcarv.png'} slot="brand-logo" accept="image/*" onChange={v=>patchMedia('brandLogo',v)} onUpload={(s,f)=>upload(s,f,v=>patchMedia('brandLogo',v),config.media.brandLogo||'/brunadcarv.png')} busy={uploading==='brand-logo'}/><UploadRow label="Estatísticas do perfil" value={config.media.heroStats||'/hero-stats.png'} slot="hero-stats" accept="image/*" onChange={v=>patchMedia('heroStats',v)} onUpload={(s,f)=>upload(s,f,v=>patchMedia('heroStats',v),config.media.heroStats||'/hero-stats.png')} busy={uploading==='hero-stats'}/><UploadRow label="Ícones/ações das postagens" value={config.media.postActions||'/post-actions.png'} slot="post-actions" accept="image/*" onChange={v=>patchMedia('postActions',v)} onUpload={(s,f)=>upload(s,f,v=>patchMedia('postActions',v),config.media.postActions||'/post-actions.png')} busy={uploading==='post-actions'}/><UploadRow label="Áudio boas-vindas" value={config.audio.src||''} slot="welcome-audio" accept="audio/*" onChange={v=>setConfig(c=>({...c,audio:{...c.audio,src:v}}))} onUpload={(s,f)=>upload(s,f,v=>setConfig(c=>({...c,audio:{...c.audio,src:v}})),config.audio.src||'/AudioBoasVindas.ogg')} busy={uploading==='welcome-audio'}/><div className="panelMigrationBox"><strong>Migrar mídias antigas do GitHub para o Blob</strong><p>Move automaticamente todos os arquivos locais ainda usados pela LP para o Vercel Blob e atualiza o config.json.</p><button className="panelSecondary" type="button" disabled={migratingMedia||!!uploading} onClick={migrateLegacyMedia}>{migratingMedia?'Migrando mídias…':'Migrar tudo para o Blob'}</button></div></section>

      <section className="panelCard"><h2>Contadores</h2><div className="panelGrid2"><Field label="Postagens"><TextInput type="number" value={config.counts.posts??0} onChange={e=>setConfig(c=>({...c,counts:{...c.counts,posts:Number(e.target.value)}}))}/></Field><Field label="Mídias"><TextInput type="number" value={config.counts.media??0} onChange={e=>setConfig(c=>({...c,counts:{...c.counts,media:Number(e.target.value)}}))}/></Field></div></section>

      <section className="panelCard"><div className="panelSectionHead"><h2>Telegram Bot</h2><span>{telegram.configured?'Configurado':'Não configurado'}</span></div><p className="panelHint">O token é salvo pelo /panel no Redis privado. Ele não fica no config.json público nem no GitHub.</p><div className="panelGrid2"><Field label="Token do bot"><TextInput type="password" value={telegramToken} onChange={e=>setTelegramToken(e.target.value)} placeholder={telegram.configured?`Configurado: ${telegram.maskedToken||'••••••'}`:'Cole o token do BotFather'}/></Field><Field label="Bot conectado"><TextInput value={telegram.bot?.username?`@${telegram.bot.username} — ID ${telegram.bot.id}`:(telegram.error||'Ainda não testado')} readOnly/></Field></div><div className="panelInlineActions"><button className="panelPrimary" type="button" disabled={telegramBusy||!telegramToken.trim()} onClick={saveTelegramToken}>{telegramBusy?'Aguarde…':'Salvar token'}</button><button className="panelSecondary" type="button" disabled={telegramBusy||!telegram.configured} onClick={testTelegram}>Testar conexão</button></div></section>

      <section className="panelCard"><div className="panelSectionHead"><h2>Assinaturas</h2><span>{visibleSubs}/4 ativas</span></div>{config.subscriptions.map((sub,i)=><div className="panelSub" key={i}><label className="panelCheck"><input type="checkbox" checked={!!sub.enabled} onChange={e=>patchSub(i,'enabled',e.target.checked)}/> Mostrar plano {i+1}</label><div className="panelGrid2"><Field label="Nome do botão"><TextInput value={sub.name||''} onChange={e=>patchSub(i,'name',e.target.value)}/></Field><Field label="Valor"><TextInput type="number" step="0.01" value={sub.price??0} onChange={e=>patchSub(i,'price',Number(e.target.value))}/></Field></div><div className="panelDelivery"><div className="panelSectionHead"><h3>Entregável deste plano</h3><span>Telegram</span></div><div className="panelGrid2"><Field label="Canal/grupo — ID ou @username"><TextInput value={sub.delivery?.chatId||''} onChange={e=>setConfig(c=>{const s=[...c.subscriptions];s[i]={...s[i],delivery:{...(s[i].delivery||{}),enabled:true,type:'telegram',chatId:e.target.value,chatTitle:'',chatType:'',verified:false,canInviteUsers:false}};return {...c,subscriptions:s};})} placeholder="-1001234567890 ou @canal"/></Field><Field label="Destino verificado"><TextInput value={sub.delivery?.verified && sub.delivery?.chatTitle ? `${sub.delivery.chatTitle} (${sub.delivery.chatType||'chat'})` : 'Nenhum'} readOnly/></Field></div><div className="panelDeliveryStatus"><span className={sub.delivery?.verified?(sub.delivery?.canInviteUsers?'telegramOk':'telegramWarn'):'telegramOff'}>{sub.delivery?.verified?(sub.delivery?.canInviteUsers?'✓ admin + convites':'⚠ admin sem convite'):'Não verificado'}</span><button className="panelSecondary" type="button" disabled={telegramVerify===`sub-${i}`||!telegram.configured} onClick={()=>verifyTelegramDelivery(i)}>{telegramVerify===`sub-${i}`?'Verificando…':'Verificar bot no canal/grupo'}</button></div></div></div>)}</section>

      <section className="panelCard"><h2>Postagens</h2>{config.posts.map((post,i)=><div className="panelPost" key={i}><div className="panelSectionHead"><h3>Postagem {i+1}</h3><label className="panelCheck"><input type="checkbox" checked={post.enabled!==false} onChange={e=>patchPost(i,'enabled',e.target.checked)}/> Visível</label></div><UploadRow label="Foto ou vídeo" value={post.media||`/postagem${i+1}.mp4`} slot={`postagem${i+1}`} accept="image/*,video/*" onChange={v=>patchPost(i,'media',v)} onUpload={(s,f)=>upload(s,f,v=>patchPost(i,'media',v),post.media||`/postagem${i+1}.mp4`)} busy={uploading===`postagem${i+1}`}/><div className="panelGrid2"><Field label="Curtido por"><TextInput value={post.likedBy||''} onChange={e=>patchPost(i,'likedBy',e.target.value)}/></Field><Field label="Foto de quem curtiu"><select className="panelInput" value={post.likedByAvatar||'curtiu1'} onChange={e=>patchPost(i,'likedByAvatar',e.target.value)}><option value="curtiu1">curtiu1</option><option value="curtiu2">curtiu2</option><option value="curtiu3">curtiu3</option></select></Field></div><Field label="Descrição"><TextArea rows={3} value={post.description||''} onChange={e=>patchPost(i,'description',e.target.value)}/></Field></div>)}</section>

      <section className="panelCard"><h2>Fotos “Curtido por”</h2>{['curtiu1','curtiu2','curtiu3'].map(key=><UploadRow key={key} label={key} value={config.likedByAvatars[key]||''} slot={key} accept="image/*" onChange={v=>setConfig(c=>({...c,likedByAvatars:{...c.likedByAvatars,[key]:v}}))} onUpload={(s,f)=>upload(s,f,v=>setConfig(c=>({...c,likedByAvatars:{...c.likedByAvatars,[key]:v}})),config.likedByAvatars[key]||`/${key}.jpg`)} busy={uploading===key}/>)}</section>

      <section className="panelCard"><h2>Post VIP bloqueado</h2><label className="panelCheck"><input type="checkbox" checked={config.lockedPost.enabled!==false} onChange={e=>setConfig(c=>({...c,lockedPost:{...c.lockedPost,enabled:e.target.checked}}))}/> Mostrar post bloqueado</label><UploadRow label="Imagem VIP" value={config.media.vipPost||'/vip-post.png'} slot="vip-post" accept="image/*" onChange={v=>patchMedia('vipPost',v)} onUpload={(s,f)=>upload(s,f,v=>patchMedia('vipPost',v),config.media.vipPost||'/vip-post.png')} busy={uploading==='vip-post'}/><div className="panelGrid2"><Field label="Curtido por"><TextInput value={config.lockedPost.likedBy||''} onChange={e=>setConfig(c=>({...c,lockedPost:{...c.lockedPost,likedBy:e.target.value}}))}/></Field><Field label="Avatar"><select className="panelInput" value={config.lockedPost.likedByAvatar||'curtiu1'} onChange={e=>setConfig(c=>({...c,lockedPost:{...c.lockedPost,likedByAvatar:e.target.value}}))}><option>curtiu1</option><option>curtiu2</option><option>curtiu3</option></select></Field></div><Field label="Descrição"><TextArea rows={3} value={config.lockedPost.description||''} onChange={e=>setConfig(c=>({...c,lockedPost:{...c.lockedPost,description:e.target.value}}))}/></Field></section>

      <section className="panelCard"><h2>Aba Mídias</h2><UploadRow label="Imagem bloqueada do grid" value={config.media.vipGrid||'/vip-grid.png'} slot="vip-grid" accept="image/*" onChange={v=>patchMedia('vipGrid',v)} onUpload={(s,f)=>upload(s,f,v=>patchMedia('vipGrid',v),config.media.vipGrid||'/vip-grid.png')} busy={uploading==='vip-grid'}/></section>

      <section className="panelCard"><h2>Order bump</h2>
        <div className="panelGrid2"><Field label="Preço extra"><TextInput type="number" step="0.01" value={config.orderBump.price??0} onChange={e=>setConfig(c=>({...c,orderBump:{...c.orderBump,price:Number(e.target.value)}}))}/></Field><Field label="Título"><TextInput value={config.orderBump.title||''} onChange={e=>setConfig(c=>({...c,orderBump:{...c.orderBump,title:e.target.value}}))}/></Field></div>
        <Field label="Texto"><TextArea rows={2} value={config.orderBump.lead||''} onChange={e=>setConfig(c=>({...c,orderBump:{...c.orderBump,lead:e.target.value}}))}/></Field>
        <Field label="Descrição / benefícios — um por linha"><TextArea rows={5} value={(config.orderBump.benefits||[]).join('\n')} onChange={e=>setConfig(c=>({...c,orderBump:{...c.orderBump,benefits:e.target.value.split('\n')}}))}/></Field>
        <div className="panelGrid2"><Field label="Texto do botão incluir"><TextInput value={config.orderBump.includeButton||''} onChange={e=>setConfig(c=>({...c,orderBump:{...c.orderBump,includeButton:e.target.value}}))}/></Field><Field label="Texto do botão sem adicional"><TextInput value={config.orderBump.skipButton||''} onChange={e=>setConfig(c=>({...c,orderBump:{...c.orderBump,skipButton:e.target.value}}))}/></Field></div>
        {config.orderBump.media.map((item,i)=><div className="panelPost" key={i}><div className="panelSectionHead"><h3>Mídia {i+1}</h3><label className="panelCheck"><input type="checkbox" checked={item.enabled!==false} onChange={e=>patchBumpMedia(i,'enabled',e.target.checked)}/> Habilitar mídia</label></div><UploadRow label="Arquivo (foto ou vídeo)" value={item.src||''} slot={`bump-${i+1}`} accept="image/*,video/*" onChange={v=>patchBumpMedia(i,'src',v)} onUpload={(s,f)=>upload(s,f,v=>patchBumpMedia(i,'src',v),item.src||'')} busy={uploading===`bump-${i+1}`}/><Field label="Legenda"><TextInput value={item.caption||''} onChange={e=>patchBumpMedia(i,'caption',e.target.value)}/></Field><p className="panelHint">Foto e vídeo funcionam no mesmo campo. Vídeos usam um frame automático como capa; não é necessário poster separado.</p></div>)}
      </section>

      <section className="panelCard panelAdvanced"><details><summary>JSON completo (avançado)</summary><p>Edite qualquer campo não exposto acima e clique em Aplicar JSON.</p><TextArea rows={24} value={rawJson} onChange={e=>setRawJson(e.target.value)}/><button className="panelTopApply" type="button" onClick={()=>{try{setConfig(JSON.parse(rawJson));setStatus('JSON aplicado. Clique em Salvar alterações para gravar.')}catch{setStatus('Erro: JSON inválido.')}}}>Aplicar JSON</button></details></section>
    </div>
    <div className="panelSaveBar"><div>{status||'Alterações só são aplicadas depois de clicar em Salvar.'}</div><button className="panelPrimary" type="button" disabled={saving} onClick={save}>{saving?'Salvando…':'Salvar alterações'}</button></div>
  </main>;
}
