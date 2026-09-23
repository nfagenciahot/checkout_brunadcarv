'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_CONFIG = {
  profile: {
    name: 'Bruna Dias', username: 'bruna.dcarv', brandText: 'bruna.dcarv',
    bio: ['Vem conferir tudinho nos meus assinantes VIP🔥🔞','', '♡ VIP 15 Dias', '+ 15 Vídeos Exclusivos💎', '', '♡ VIP 30 Dias', '+ 25 Vídeos Exclusivos💎', '+ Pack com Amiguinhas', '', 'Vem me ver peladinha e gozar comigo, estou toda molhadinha💦🔞'],
    socials: { instagram: 'https://www.instagram.com/bruna.dcarv/', x: '', tiktok: '' }
  },
  counts: { posts: 207, media: 458 },
  labels: { subscriptions: 'Assinaturas', posts: 'Postagens', media: 'Mídias', mediaFilters: ['Todos','Fotos','Vídeos','Pagos'], likedBy: 'Curtido por', others: 'e outras pessoas' },
  subscriptions: [
    { id:'vip15', enabled:true, name:'♡ VIP 15 Dias + Vídeos 💎', price:17.9 },
    { id:'vip30', enabled:true, name:'♡ VIP 30 Dias + Vídeos & Pack 💎', price:34.9 }
  ],
  audio: { src:'/AudioBoasVindas.ogg', ariaLabel:'Áudio de boas-vindas' },
  likedByAvatars: { curtiu1:'/curtiu1.jpg', curtiu2:'/curtiu2.jpg', curtiu3:'/curtiu3.jpg' },
  posts: [
    {id:1, enabled:true, media:'/postagem1.mp4', likedBy:'luccho.ecom', likedByAvatar:'curtiu1', description:'Bem-vindo ao meu conteúdo privado 💎🔥'},
    {id:2, enabled:true, media:'/postagem2.mp4', likedBy:'andresbarriles', likedByAvatar:'curtiu2', description:'Tem conteúdo novo esperando por você 👀'},
    {id:3, enabled:true, media:'/postagem3.mp4', likedBy:'gabrieldamasceno', likedByAvatar:'curtiu3', description:'Se gostou dessa prévia, imagina o que tem no VIP 🔥'}
  ],
  lockedPost: { enabled:true, title:'', likedBy:'luccho.ecom', likedByAvatar:'curtiu1', description:'Assine o VIP para liberar todas as fotos e vídeos privados.' },
  orderBump: {
    price:6.9, eyebrow:'Oferta exclusiva para o seu VIP', title:'Tenho mais uma surpresinha esperando por você 🔥', lead:'Além do VIP você pode ter acesso a mais conteúdos especiais 💦',
    media:[
      {src:'/bump-photo.jpg', caption:'1 Foto personalizada'},
      {src:'/order-bump-video.mp4', poster:'/bump-video.jpg', caption:'+50 vídeos especiais'}
    ],
    benefits:['♡ 1 Foto com seu nome na minha bunda','♡ 50 Vídeos safados com minhas amigas','♡ Acesso ao meu WhatsApp privado','♡ Grupo privado dos melhores conteúdos'], includeButton:'🔥 Incluir', skipButton:'🚫 Somente o VIP'
  },
  checkout: {
    back:'Voltar', eyebrow:'Pagamento via PIX', title:'Finalizar compra', lead:'Preencha os dados abaixo para gerar o pagamento.', namePlaceholder:'Nome', phonePlaceholder:'Telefone', pixButton:'Gerar PIX', bumpLabel:'Conteúdo especial', pixTitle:'Pagamento via PIX', pixLead:'Escaneie o QR Code ou copie o código PIX abaixo.', copyPix:'Copiar PIX', processingTitle:'Pagamento confirmado ✓', processingLead:'Você receberá o acesso ao Telegram em alguns instantes.', telegramButton:'Entrar no Telegram', phoneError:'Informe um telefone válido com DDD.', manualDeliveryTitle:'Pagamento aprovado ✓', manualDeliveryLead:'Houve um problema ao gerar automaticamente o convite de acesso ao Telegram. Nosso suporte entrará em contato o mais breve possível para compartilhar seu acesso.'
  },
  interaction:{clickLockMs:300},
  media:{profile:'/profile.jpg',cover:'/cover.jpg',brandLogo:'/brunadcarv.png',heroStats:'/hero-stats.png',postActions:'/post-actions.png',vipPost:'/vip-post.png',vipGrid:'/vip-grid.png'}
};

const POST_EXTENSIONS = ['mp4','webm','mov','jpg','jpeg','png','webp'];

function money(value) { return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`; }
function formatCountdown(totalSeconds){ const s=Math.max(0,Number(totalSeconds||0)); return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
function cleanHandle(value='') { return String(value).replace(/^@/, ''); }
function isVideoPath(src='') { return /\.(mp4|webm|mov)$/i.test(src); }
function normalizePhoneInput(value='') {
  let digits=String(value).replace(/\D/g,'').slice(0,13);
  if((digits.length===12||digits.length===13)&&digits.startsWith('55')) digits=digits.slice(2);
  return digits.slice(0,11);
}
function formatPhoneInput(value='') {
  const d=normalizePhoneInput(value);
  if(d.length<=2) return d;
  if(d.length<=6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if(d.length<=10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}
const VALID_DDDS_CLIENT=new Set([11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,63,64,65,66,67,68,69,71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99]);
function clientPhoneValid(value='') {
  const d=normalizePhoneInput(value);
  if(![10,11].includes(d.length)||!VALID_DDDS_CLIENT.has(Number(d.slice(0,2)))) return false;
  const local=d.slice(2);
  if(/^(\d)\1+$/.test(local)||['123456789','987654321','12345678','87654321'].includes(local)) return false;
  if(d.length===11) return local[0]==='9';
  return /^[2-5]/.test(local);
}
function formatDuration(value) {
  if (!Number.isFinite(value) || value <= 0) return '--:--';
  const total = Math.round(value);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2,'0')}`;
}

function VerifiedBadge({ small=false }) {
  return <img src="/verified.png" alt="Verificado" className={small ? 'verifiedImg small' : 'verifiedImg'} />;
}
function IconBookmark() { return <svg viewBox="0 0 24 24" className="actionIcon"><path d="M7 4.5h10a1 1 0 011 1V20l-6-3.7L6 20V5.5a1 1 0 011-1z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>; }
function IconInstagram() { return <svg viewBox="0 0 24 24" className="socialIcon"><rect x="4.2" y="4.2" width="15.6" height="15.6" rx="4.2" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor"/></svg>; }
function IconX() { return <svg viewBox="0 0 24 24" className="socialIcon"><path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
function IconTikTok() { return <svg viewBox="0 0 24 24" className="socialIcon"><path d="M14 5v8.6a3.6 3.6 0 11-3-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M14 5c1 1.8 2.3 2.9 4.5 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>; }
function IconMore() { return <svg viewBox="0 0 24 24" className="topIcon"><circle cx="12" cy="5" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="19" r="1.7" fill="currentColor"/></svg>; }
function IconPosts() { return <svg viewBox="0 0 24 24" className="tabIcon"><rect x="7" y="2.7" width="10" height="18.6" rx="2.6" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M9.8 6.2h4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>; }
function IconMedia() { return <svg viewBox="0 0 24 24" className="tabIcon"><rect x="3.5" y="6" width="17" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M10 9l5 3-5 3V9z" fill="currentColor"/><path d="M8 4.5h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>; }
function IconClose() { return <svg viewBox="0 0 24 24" className="closeIcon"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
function IconBack() { return <svg viewBox="0 0 24 24" className="topIcon"><path d="M14.5 6.5L8.5 12l6 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconPlay() { return <svg viewBox="0 0 24 24" className="playIcon"><path d="M8.5 6.5l9 5.5-9 5.5v-11z" fill="currentColor"/></svg>; }

function WaveBars({ bars }) {
  return <div className="waveBars">{bars.map((height, i) => <span key={i} className="waveBar" style={{height:`${height}px`}} />)}</div>;
}

function WaveAudioPlayer({ src, ariaLabel }) {
  const audioRef = useRef(null);
  const waveRef = useRef(null);
  const rafRef = useRef(null);
  const [bars,setBars] = useState(Array.from({length:68},(_,i)=>18 + ((i*11)%34)));
  const [duration,setDuration] = useState(0);
  const [progress,setProgress] = useState(0);
  const [started,setStarted] = useState(false);
  const [playing,setPlaying] = useState(false);

  useEffect(() => {
    let cancelled=false;
    async function buildWave() {
      try {
        const response=await fetch(src,{cache:'no-store'});
        const arrayBuffer=await response.arrayBuffer();
        const AudioCtx=window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx=new AudioCtx();
        const buffer=await ctx.decodeAudioData(arrayBuffer.slice(0));
        const d=buffer.duration;
        if (!cancelled) setDuration(d);
        const channel=buffer.getChannelData(0);
        const barCount=Math.max(52,Math.min(96,Math.round(d*3.6)));
        const samplesPerBar=Math.max(1,Math.floor(channel.length/barCount));
        const amps=[];
        for(let i=0;i<barCount;i++){
          const start=i*samplesPerBar;
          const end=Math.min(channel.length,start+samplesPerBar);
          let peak=0;
          for(let j=start;j<end;j+=Math.max(1,Math.floor(samplesPerBar/90))){ const v=Math.abs(channel[j]); if(v>peak) peak=v; }
          amps.push(peak);
        }
        const smoothed=amps.map((a,i)=>{
          const prev=amps[Math.max(0,i-1)] ?? a;
          const next=amps[Math.min(amps.length-1,i+1)] ?? a;
          return (prev + a*4 + next) / 6;
        });
        const sorted=[...smoothed].sort((a,b)=>a-b);
        const norm=sorted[Math.max(0,Math.floor(sorted.length*.95))] || Math.max(...smoothed) || 1;
        const heights=smoothed.map(a=>Math.max(14,Math.min(60,15+Math.pow(Math.min(1,a/norm),.62)*45)));
        if(!cancelled) setBars(heights);
        ctx.close?.();
      } catch (_) {}
    }
    buildWave();
    return()=>{cancelled=true; if(rafRef.current) cancelAnimationFrame(rafRef.current)};
  },[src]);

  useEffect(()=>{
    if(!playing){ if(rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    const tick=()=>{
      const audio=audioRef.current;
      if(audio && audio.duration){ setProgress(audio.currentTime/audio.duration); rafRef.current=requestAnimationFrame(tick); }
    };
    rafRef.current=requestAnimationFrame(tick);
    return()=>{ if(rafRef.current) cancelAnimationFrame(rafRef.current); };
  },[playing]);

  function togglePlay(){
    const audio=audioRef.current; if(!audio) return;
    setStarted(true);
    if(audio.paused) audio.play(); else audio.pause();
  }
  function seek(e){
    const audio=audioRef.current, wave=waveRef.current; if(!audio||!wave||!audio.duration) return;
    const rect=wave.getBoundingClientRect();
    const ratio=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
    audio.currentTime=ratio*audio.duration;
    setProgress(ratio);
  }

  return <div className="welcomeAudio" aria-label={ariaLabel}>
    <audio ref={audioRef} src={src} preload="metadata" onLoadedMetadata={e=>setDuration(e.currentTarget.duration)} onPlay={()=>{setStarted(true);setPlaying(true)}} onPause={()=>setPlaying(false)} onEnded={()=>{setPlaying(false);setProgress(1)}} onTimeUpdate={e=>{ if(!playing) setProgress(e.currentTarget.duration ? e.currentTarget.currentTime/e.currentTarget.duration : 0); }} />
    <button type="button" className="audioPlayButton" onClick={togglePlay} aria-label={playing?'Pausar áudio':'Reproduzir áudio'}>
      {!playing ? <img src="/audio-play.png" alt="" /> : <span className="audioPause"><i/><i/></span>}
    </button>
    <div className={`waveTrack ${started?'started':'waiting'}`} ref={waveRef} onClick={seek} role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress*100)}>
      <div className="waveBase"><WaveBars bars={bars}/></div>
      {started && <div className="waveColored" style={{clipPath:`inset(0 ${100-progress*100}% 0 0)`}}><WaveBars bars={bars}/></div>}
    </div>
  </div>;
}

function BumpMediaCard({ item, onOpen }) {
  const [duration,setDuration]=useState(null);
  const src=item?.src || '';
  const isVideo=isVideoPath(src);
  return <button className={`bumpMedia ${isVideo?'videoMedia':'photoMedia'}`} type="button" onClick={()=>onOpen({type:isVideo?'video':'image',src})}>
    {isVideo ? <video src={src} poster={item?.poster||''} muted preload="metadata" onLoadedMetadata={e=>setDuration(e.currentTarget.duration)}/> : <img src={src} alt={item?.caption||'Prévia especial'}/>}
    {isVideo && <><span className="videoPlay"><IconPlay/></span><span className="videoDuration">{formatDuration(duration)}</span></>}
    <span className="mediaOpenHint">{isVideo?'Assistir':'Abrir'}</span>
    <span className="mediaCaption">{item?.caption||''}</span>
  </button>;
}

function PostActions({config}) {
  return <div className="postFooter">
    <button type="button" className="actionImageButton" aria-label="Interações da postagem"><img src={config.media?.postActions || '/post-actions.png'} alt="Curtir, comentar e enviar valor" className="postActionsImage" /></button>
    <button type="button" className="iconButton bookmarkButton" aria-label="Salvar"><IconBookmark /></button>
  </div>;
}
function PostHeader({ config }) {
  return <div className="postHeader">
    <div className="author"><img src={config.media?.profile || "/profile.jpg"} className="postAvatar" alt="Perfil"/><div><div className="authorName">{config.profile.name} <VerifiedBadge small/></div><div className="authorUser">@{cleanHandle(config.profile.username)}</div></div></div>
    <div className="moreButton"><IconMore/></div>
  </div>;
}
function PostMeta({ config, likedBy, description, likedByAvatar }) {
  const handle=cleanHandle(config.profile.username);
  const avatarSrc=(config.likedByAvatars && likedByAvatar && config.likedByAvatars[likedByAvatar]) || likedByAvatar || '/profile.jpg';
  return <div className="postMeta">
    <div className="likedByLine"><img src={avatarSrc} alt=""/><span>{config.labels.likedBy} <strong>{likedBy}</strong> {config.labels.others}</span></div>
    <div className="captionLine"><span className="captionHandle">{handle}<VerifiedBadge small/></span><span className="captionText">{description}</span></div>
  </div>;
}

export default function HomePage(){
  const [config,setConfig]=useState(DEFAULT_CONFIG);
  const [progress,setProgress]=useState(0);
  const [modalStep,setModalStep]=useState(null);
  const [selectedPlan,setSelectedPlan]=useState(null);
  const [includeBump,setIncludeBump]=useState(false);
  const [previewMedia,setPreviewMedia]=useState(null);
  const [activeMainTab,setActiveMainTab]=useState('posts');
  const [mediaFilter,setMediaFilter]=useState('Todos');
  const [posts,setPosts]=useState([]);
  const [cancelPixConfirm,setCancelPixConfirm]=useState(false);
  const [cancelingPix,setCancelingPix]=useState(false);
  const [pixSecondsLeft,setPixSecondsLeft]=useState(null);
  const autoExpireRequestedRef=useRef(false);
  const [checkoutName,setCheckoutName]=useState('');
  const [checkoutPhone,setCheckoutPhone]=useState('');
  const [checkoutError,setCheckoutError]=useState('');
  const [creatingPayment,setCreatingPayment]=useState(false);
  const [orderSession,setOrderSession]=useState(null);
  const [orderState,setOrderState]=useState(null);
  const deliveryRequestedRef=useRef(false);
  const lastAcceptedClickRef=useRef(0);

  useEffect(()=>{fetch('/config.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{if(data)setConfig({...DEFAULT_CONFIG,...data,profile:{...DEFAULT_CONFIG.profile,...data.profile,socials:{...DEFAULT_CONFIG.profile.socials,...(data.profile?.socials||{})}},counts:{...DEFAULT_CONFIG.counts,...data.counts},labels:{...DEFAULT_CONFIG.labels,...data.labels},audio:{...DEFAULT_CONFIG.audio,...data.audio},lockedPost:{...DEFAULT_CONFIG.lockedPost,...data.lockedPost},orderBump:{...DEFAULT_CONFIG.orderBump,...data.orderBump},checkout:{...DEFAULT_CONFIG.checkout,...data.checkout},interaction:{...DEFAULT_CONFIG.interaction,...data.interaction},media:{...DEFAULT_CONFIG.media,...(data.media||{})},likedByAvatars:{...DEFAULT_CONFIG.likedByAvatars,...(data.likedByAvatars||{})}})}).catch(()=>{});},[]);
  useEffect(()=>{const onScroll=()=>setProgress(Math.min(window.scrollY/240,1));onScroll();window.addEventListener('scroll',onScroll,{passive:true});return()=>window.removeEventListener('scroll',onScroll)},[]);
  useEffect(()=>{document.body.style.overflow=(modalStep||previewMedia)?'hidden':'';return()=>{document.body.style.overflow=''}},[modalStep,previewMedia]);
  useEffect(()=>{
    const handleClick=(event)=>{
      const target=event.target instanceof Element ? event.target.closest('button,a,[role="button"]') : null;
      if(!target || target.hasAttribute('disabled')) return;
      const now=performance.now();
      const lockMs=Math.max(0,Number(config.interaction?.clickLockMs ?? 300));
      if(now-lastAcceptedClickRef.current < lockMs){
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        return;
      }
      lastAcceptedClickRef.current=now;
    };
    document.addEventListener('click',handleClick,true);
    return()=>document.removeEventListener('click',handleClick,true);
  },[config.interaction?.clickLockMs]);
  useEffect(()=>{
    try {
      const raw=localStorage.getItem('brunadcarv_checkout_order');
      if(raw){
        const saved=JSON.parse(raw);
        if(saved?.orderId&&saved?.resumeToken) setOrderSession(saved);
      }
    } catch (_) {}
  },[]);

  useEffect(()=>{
    if(!orderSession?.orderId||!orderSession?.resumeToken) return;
    let cancelled=false;
    let timer=null;
    const scheduleNext=()=>{ if(!cancelled) timer=setTimeout(refresh,8000); };
    const refresh=async()=>{
      try{
        const res=await fetch('/api/order/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(orderSession),cache:'no-store'});
        const data=await res.json();
        if(cancelled) return;
        if(res.status===404){
          localStorage.removeItem('brunadcarv_checkout_order');
          setOrderSession(null);setOrderState(null);setModalStep(null);setCheckoutError('');
          return;
        }
        if(!res.ok||!data?.order){ scheduleNext(); return; }
        const order=data.order;
        setOrderState(order);
        setSelectedPlan({id:order.planId,name:order.planName,price:order.planPrice});
        setIncludeBump(Boolean(order.includeBump));
        if(order.status==='pending'||order.status==='creating'){
          setModalStep('pix');
          scheduleNext();
          return;
        }
        if(['paid','delivering','delivery_error'].includes(order.status)){ setModalStep('delivery'); return; }
        if(order.status==='manual_delivery'){ setModalStep('manual_delivery'); return; }
        if(order.status==='delivered'&&order.telegramInvite){ setModalStep('delivered'); return; }
        if(['canceled','canceled_by_user','expired','refunded','charged_back','failed','create_error'].includes(order.status)){
          localStorage.removeItem('brunadcarv_checkout_order');
          setOrderSession(null);
          setCheckoutError(order.status==='expired'?'Este PIX expirou. Gere um novo PIX para continuar.':order.status==='canceled_by_user'?'Este PIX foi cancelado.':'Este pagamento não está mais disponível.');
          setModalStep(null);
      setPixSecondsLeft(null);
          return;
        }
        scheduleNext();
      }catch(_){
        scheduleNext();
      }
    };
    refresh();
    return()=>{cancelled=true;if(timer)clearTimeout(timer)};
  },[orderSession]);

  useEffect(()=>{
    if(modalStep!=='delivery'||!orderSession||deliveryRequestedRef.current) return;
    if(!['paid','delivery_error'].includes(orderState?.status)) return;
    deliveryRequestedRef.current=true;
    const deliver=async()=>{
      try{
        const res=await fetch('/api/order/deliver',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(orderSession)});
        const data=await res.json();
        if(data?.order){
          setOrderState(data.order);
          if(data.order.status==='delivered'&&data.order.telegramInvite) setTimeout(()=>setModalStep('delivered'),900);
          if(data.order.status==='manual_delivery') setTimeout(()=>setModalStep('manual_delivery'),700);
        }
        if(!res.ok) setCheckoutError(data?.error||'Não foi possível preparar o acesso ao Telegram.');
      }catch(error){ setCheckoutError(error.message||'Falha ao preparar o acesso.'); }
      finally{ deliveryRequestedRef.current=false; }
    };
    deliver();
  },[modalStep,orderSession,orderState?.status]);

  useEffect(()=>{
    let cancelled=false;
    async function discoverPosts(){const found=[];for(let i=1;i<=3;i++){const meta=(config.posts||[]).find(p=>Number(p.id)===i)||{};if(meta.enabled===false)continue;let match=null;if(meta.media){const src=meta.media;match={id:i,src,type:isVideoPath(src)?'video':'image',likedBy:meta.likedBy||'luccho.co',likedByAvatar:meta.likedByAvatar||'curtiu1',description:meta.description||''};}else{for(const ext of POST_EXTENSIONS){const src=`/postagem${i}.${ext}`;try{const response=await fetch(src,{method:'HEAD',cache:'no-store'});if(response.ok){match={id:i,src,type:isVideoPath(src)?'video':'image',likedBy:meta.likedBy||'luccho.co',likedByAvatar:meta.likedByAvatar||'curtiu1',description:meta.description||''};break;}}catch(_){}}}if(match)found.push(match)}if(!cancelled)setPosts(found)}
    discoverPosts();return()=>{cancelled=true};
  },[config.posts]);

  const subscriptions=(config.subscriptions||[]).filter(s=>s.enabled!==false).slice(0,4);
  const coverHeight=420-195*progress;
  const bumpPrice=Number(config.orderBump?.price||0);
  const total=useMemo(()=>Number(selectedPlan?.price||0)+(includeBump?bumpPrice:0),[selectedPlan,includeBump,bumpPrice]);
  const filters=config.labels.mediaFilters || ['Todos','Fotos','Vídeos','Pagos'];

  function openOffer(plan){setSelectedPlan(plan);setIncludeBump(false);setCheckoutError('');setModalStep('bump')}
  function continueToCheckout(withBump){setIncludeBump(withBump);setCheckoutError('');setModalStep('checkout')}
  function scrollToTop(){ window.scrollTo({top:0,behavior:'smooth'}); }
  async function generatePix(){
    const name=checkoutName.trim().replace(/\s+/g,' ');
    if(name.length<2){setCheckoutError('Informe seu nome.');return;}
    if(!clientPhoneValid(checkoutPhone)){setCheckoutError(config.checkout.phoneError||'Informe um telefone válido com DDD.');return;}
    if(!selectedPlan?.id){setCheckoutError('Plano inválido.');return;}
    setCreatingPayment(true);setCheckoutError('');
    try{
      const res=await fetch('/api/payment/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,phone:checkoutPhone,planId:selectedPlan.id,includeBump})});
      const data=await res.json();
      if(!res.ok||!data?.order) throw new Error(data?.error||'Não foi possível gerar o PIX.');
      autoExpireRequestedRef.current=false;
      const session={orderId:data.order.id,resumeToken:data.resumeToken};
      localStorage.setItem('brunadcarv_checkout_order',JSON.stringify(session));
      setOrderSession(session);setOrderState(data.order);setModalStep(data.order.status==='paid'?'delivery':'pix');
    }catch(error){setCheckoutError(error.message||'Erro ao gerar PIX.');}
    finally{setCreatingPayment(false);}
  }
  async function copyPix(){
    if(!orderState?.pixCode)return;
    await navigator.clipboard.writeText(orderState.pixCode);
  }
  async function cancelPix(reason='user'){
    if(!orderSession?.orderId||!orderSession?.resumeToken||cancelingPix)return;
    setCancelingPix(true);
    try{
      const res=await fetch('/api/order/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...orderSession,reason}),cache:'no-store'});
      const data=await res.json();
      if(!res.ok) throw new Error(data?.error||'Não foi possível cancelar este PIX.');
      localStorage.removeItem('brunadcarv_checkout_order');
      setCancelPixConfirm(false);
      setOrderSession(null);
      setOrderState(null);
      setCheckoutError('');
      setModalStep(null);
    }catch(error){
      setCheckoutError(error.message||'Não foi possível cancelar este PIX.');
      setCancelPixConfirm(false);
    }finally{
      setCancelingPix(false);
    }
  }
  useEffect(()=>{
    if(modalStep!=='pix'||!orderState?.checkoutExpiresAt){ setPixSecondsLeft(null); return; }
    autoExpireRequestedRef.current=false;
    const update=()=>{
      const left=Math.max(0,Math.ceil((Date.parse(orderState.checkoutExpiresAt)-Date.now())/1000));
      setPixSecondsLeft(left);
      if(left===0 && !autoExpireRequestedRef.current){
        autoExpireRequestedRef.current=true;
        cancelPix('timeout');
      }
    };
    update();
    const id=setInterval(update,1000);
    return()=>clearInterval(id);
  },[modalStep,orderState?.checkoutExpiresAt]);

  const checkoutLocked=['pix','delivery','manual_delivery','delivered'].includes(modalStep);

  return <main className="page">
    <div className="container profileShell">
      <header className="topBar brandBar"><img src={config.media?.brandLogo || "/brunadcarv.png"} alt="bruna.dcarv" className="brandLogo" /></header>

      <section className="profileCard">
        <div className="coverViewport" style={{height:`${coverHeight}px`}}><img src={config.media?.cover || "/cover.jpg"} alt="Capa" className="coverImage"/></div>
        <div className="profileContent">
          <img src={config.media?.profile || "/profile.jpg"} alt={config.profile.name} className="avatar avatarFixed"/>
          <button type="button" className="heroStatsImageButton" aria-label="Informações do perfil"><img src={config.media?.heroStats || "/hero-stats.png"} alt="Estatísticas do perfil" className="heroStatsImage"/></button>
          <div className="nameRow"><h1>{config.profile.name}</h1><VerifiedBadge/></div>
          <div className="username">@{cleanHandle(config.profile.username)}</div>
          <div className="bio">{(config.profile.bio||[]).map((line,i)=><p key={i}>{line===''?'\u00A0':line}</p>)}</div>
          <div className="socialRow">{[
            { key:'instagram', label:'Instagram', icon:<IconInstagram/> },
            { key:'x', label:'X', icon:<IconX/> },
            { key:'tiktok', label:'TikTok', icon:<IconTikTok/> }
          ].map(item=>{
            const url=(config.profile.socials?.[item.key]||'').trim();
            return url
              ? <a key={item.key} href={url} target="_blank" rel="noreferrer" className="socialButton" aria-label={item.label}>{item.icon}</a>
              : <button key={item.key} type="button" className="socialButton socialButtonDisabled" aria-label={`${item.label} indisponível`}>{item.icon}</button>;
          })}</div>
          <div className="sectionTitle">{config.labels.subscriptions}</div>
          <div className="subscriptionButtons">{subscriptions.map(plan=><button key={plan.id} className="subscribeButton" type="button" onClick={()=>openOffer(plan)}><span>{plan.name}</span><strong>{money(plan.price)}</strong></button>)}</div>
          <WaveAudioPlayer src={config.audio.src} ariaLabel={config.audio.ariaLabel}/>
        </div>
      </section>

      <section className="tabsCard">
        <button className={`tab ${activeMainTab==='posts'?'active':''}`} type="button" onClick={()=>setActiveMainTab('posts')}><IconPosts/>{config.counts.posts} {config.labels.posts}</button>
        <button className={`tab ${activeMainTab==='media'?'active':''}`} type="button" onClick={()=>setActiveMainTab('media')}><IconMedia/>{config.counts.media} {config.labels.media}</button>
      </section>

      {activeMainTab==='posts' ? <div className="postsList">
        {posts.map(post=><section className="postCard" key={post.id}><PostHeader config={config}/><div className="uploadedPostMedia">{post.type==='video'?<video className="postMediaObject" src={post.src} controls playsInline preload="metadata"/>:<img className="postMediaObject" src={post.src} alt={`Postagem ${post.id}`}/>}</div><PostActions config={config}/><PostMeta config={config} likedBy={post.likedBy} likedByAvatar={post.likedByAvatar} description={post.description}/></section>)}
        {config.lockedPost.enabled!==false && <section className="postCard fixedVipPost"><PostHeader config={config}/>{config.lockedPost.title ? <div className="vipUnlockText">{config.lockedPost.title}</div> : null}<button type="button" className="vipPostButton" onClick={scrollToTop} aria-label="Ir para assinaturas"><img src={config.media?.vipPost || "/vip-post.png"} alt="Conteúdo VIP bloqueado" className="vipPostImage"/></button><PostActions config={config}/><PostMeta config={config} likedBy={config.lockedPost.likedBy} likedByAvatar={config.lockedPost.likedByAvatar} description={config.lockedPost.description}/></section>}
      </div> : <section className="mediaCard"><div className="mediaFilters">{filters.map(filter=><button key={filter} type="button" className={`mediaFilter ${mediaFilter===filter?'active':''}`} onClick={()=>setMediaFilter(filter)}>{filter}</button>)}</div><div className="lockedGrid">{Array.from({length:9}).map((_,i)=><button type="button" className="lockedGridItem" key={i} onClick={scrollToTop} aria-label="Ir para assinaturas"><img src={config.media?.vipGrid || "/vip-grid.png"} alt="Mídia VIP bloqueada"/></button>)}</div></section>}
    </div>

    {modalStep && <div className="modalBackdrop" onMouseDown={e=>{if(!checkoutLocked&&e.target===e.currentTarget)setModalStep(null)}}><div className={`modalCard ${modalStep==='bump'?'bumpModal':'checkoutModal'} ${checkoutLocked?'lockedCheckoutModal':''}`}>{!checkoutLocked&&<button className="modalClose" type="button" onClick={()=>setModalStep(null)} aria-label="Fechar"><IconClose/></button>}
      {modalStep==='bump' && <><div className="modalEyebrow">{config.orderBump.eyebrow}</div><h2>{config.orderBump.title}</h2><p className="modalLead">{config.orderBump.lead}</p><div className="bumpMediaGrid">{(config.orderBump.media||[]).slice(0,2).map((item,i)=><BumpMediaCard key={`${item.src}-${i}`} item={item} onOpen={setPreviewMedia}/>)}</div><div className="bumpBenefits">{(config.orderBump.benefits||[]).map((b,i)=><p key={i}>{b}</p>)}</div><div className="bumpButtons"><button className="modalGradientButton" type="button" onClick={()=>continueToCheckout(true)}>{config.orderBump.includeButton} {money(bumpPrice)}</button><button className="modalGradientButton" type="button" onClick={()=>continueToCheckout(false)}>{config.orderBump.skipButton}</button></div></>}
      {modalStep==='checkout' && <><button className="modalBack" type="button" onClick={()=>setModalStep('bump')}><IconBack/> {config.checkout.back}</button><div className="modalEyebrow">{config.checkout.eyebrow}</div><h2>{config.checkout.title}</h2><p className="modalLead">{config.checkout.lead}</p><div className="checkoutFields checkoutFieldsTwo"><input value={checkoutName} onChange={e=>{setCheckoutName(e.target.value);setCheckoutError('')}} placeholder={config.checkout.namePlaceholder} autoComplete="name"/><input value={checkoutPhone} onChange={e=>{setCheckoutPhone(formatPhoneInput(e.target.value));setCheckoutError('')}} placeholder={config.checkout.phonePlaceholder} inputMode="tel" autoComplete="tel"/></div>{checkoutError&&<div className="checkoutError">{checkoutError}</div>}<div className="checkoutSummary"><div><span>{selectedPlan?.name}</span><strong>{money(selectedPlan?.price)}</strong></div>{includeBump&&<div><span>{config.checkout.bumpLabel}</span><strong>{money(bumpPrice)}</strong></div>}<div className="summaryTotal"><span>Total</span><strong>{money(total)}</strong></div></div><button className="modalGradientButton checkoutPayButton" type="button" disabled={creatingPayment} onClick={generatePix}>{creatingPayment?'Gerando PIX...':`${config.checkout.pixButton} — ${money(total)}`}</button></>}
      {modalStep==='pix' && <><div className="modalEyebrow">PIX</div><h2>{config.checkout.pixTitle} — {money(orderState?.amount||total)}</h2><p className="modalLead">{config.checkout.pixLead}</p>{orderState?.pixImage?<div className="pixQrWrap"><img src={orderState.pixImage} alt="QR Code PIX" className="pixQrImage"/></div>:<div className="pixPlaceholder">Gerando QR Code...</div>}<div className="pixCodeBox"><textarea readOnly value={orderState?.pixCode||''}/><button className="modalGradientButton checkoutPayButton" type="button" onClick={copyPix}>{config.checkout.copyPix}</button></div><button className="cancelPixButton" type="button" onClick={()=>setCancelPixConfirm(true)}>Cancelar PIX</button>{pixSecondsLeft!=null&&<div className="pixCountdown">PIX expira em <strong>{formatCountdown(pixSecondsLeft)}</strong></div>}<div className="paymentWaiting"><span className="smallSpinner"/>Aguardando confirmação do pagamento...</div>{cancelPixConfirm&&<div className="cancelPixOverlay"><div className="cancelPixCard"><h3>Cancelar este PIX?</h3><p>Se escolher voltar, você continuará nesta tela com o mesmo QR Code.</p><div className="cancelPixActions"><button type="button" className="modalGradientButton" onClick={()=>setCancelPixConfirm(false)}>Voltar</button><button type="button" className="cancelPixDanger" disabled={cancelingPix} onClick={()=>cancelPix('user')}>{cancelingPix?'Cancelando...':'Cancelar PIX'}</button></div></div></div>}</>}
      {modalStep==='delivery' && <div className="deliveryState"><div className="deliverySpinner"/><div className="modalEyebrow">PAGAMENTO APROVADO</div><h2>{config.checkout.processingTitle||'Pagamento confirmado ✓'}</h2><p className="modalLead">{config.checkout.processingLead||'Você receberá o acesso ao Telegram em alguns instantes.'}</p>{checkoutError&&<><div className="checkoutError">{checkoutError}</div><button className="modalGradientButton checkoutPayButton" type="button" onClick={()=>{deliveryRequestedRef.current=false;setOrderState(s=>({...s,status:'paid'}))}}>Tentar novamente</button></>}</div>}
      {modalStep==='manual_delivery' && <div className="deliveryState manualDeliveryState"><div className="deliveryCheck manualDeliveryIcon">!</div><div className="modalEyebrow">PAGAMENTO CONFIRMADO</div><h2>{config.checkout.manualDeliveryTitle||'Pagamento aprovado ✓'}</h2><p className="modalLead">{orderState?.deliveryError || config.checkout.manualDeliveryLead || 'Houve um problema ao gerar automaticamente o convite de acesso ao Telegram. Nosso suporte entrará em contato o mais breve possível para compartilhar seu acesso.'}</p></div>}
      {modalStep==='delivered' && <div className="deliveryState deliveredState"><div className="deliveryCheck">✓</div><div className="modalEyebrow">ACESSO LIBERADO</div><h2>Seu acesso está pronto</h2><p className="modalLead">Use o botão abaixo para entrar no Telegram. O convite permite apenas uma entrada.</p><a className="modalGradientButton checkoutPayButton telegramAccessButton" href={orderState?.telegramInvite||'#'} target="_blank" rel="noreferrer">{config.checkout.telegramButton||'Entrar no Telegram'}</a></div>}
    </div></div>}

    {previewMedia && <div className="mediaViewerBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setPreviewMedia(null)}}><button className="mediaViewerClose" type="button" onClick={()=>setPreviewMedia(null)} aria-label="Fechar mídia"><IconClose/></button><div className={`mediaViewerContent ${previewMedia.type==='image'?'mediaViewerPhoto':'mediaViewerVideoWrap'}`}>{previewMedia.type==='video'?<video src={previewMedia.src} controls autoPlay playsInline className="mediaViewerVideo"/>:<img src={previewMedia.src} alt="Prévia ampliada" className="mediaViewerImage"/>}</div></div>}
  </main>;
}
