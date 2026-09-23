import { issueSignedToken, presignUrl } from '@vercel/blob';
import { NextResponse } from 'next/server';
import SITE_CONFIG from '../../../public/config.json';

export const dynamic = 'force-dynamic';

function pathnameFromMediaUrl(value='') {
  const text=String(value || '');
  if(!text.startsWith('/api/media/')) return '';
  const raw=text.slice('/api/media/'.length).split('?')[0].split('#')[0];
  if(!raw) return '';
  try{
    return raw.split('/').map(part=>decodeURIComponent(part)).join('/');
  }catch(_){
    return '';
  }
}

async function signedGetUrl(pathname) {
  const validUntil=Date.now() + 6 * 60 * 60 * 1000;

  const token=await issueSignedToken({
    pathname,
    operations:['get'],
    validUntil,
  });

  const { presignedUrl }=await presignUrl(token,{
    pathname,
    operation:'get',
    access:'private',
    validUntil,
  });

  return presignedUrl;
}

function collectMediaPaths(value,set) {
  if(typeof value==='string'){
    const pathname=pathnameFromMediaUrl(value);
    if(pathname) set.add(pathname);
    return;
  }

  if(Array.isArray(value)){
    for(const item of value) collectMediaPaths(item,set);
    return;
  }

  if(value && typeof value==='object'){
    for(const item of Object.values(value)) collectMediaPaths(item,set);
  }
}

function replaceMediaUrls(value,map) {
  if(typeof value==='string'){
    const pathname=pathnameFromMediaUrl(value);
    return pathname && map.has(pathname) ? map.get(pathname) : value;
  }

  if(Array.isArray(value)){
    return value.map(item=>replaceMediaUrls(item,map));
  }

  if(value && typeof value==='object'){
    return Object.fromEntries(
      Object.entries(value).map(([key,item])=>[
        key,
        replaceMediaUrls(item,map),
      ])
    );
  }

  return value;
}

export async function GET() {
  try{
    const config=structuredClone(SITE_CONFIG);
    const paths=new Set();

    collectMediaPaths(config,paths);

    const signedEntries=await Promise.all(
      [...paths].map(async pathname=>{
        try{
          return [pathname,await signedGetUrl(pathname)];
        }catch(error){
          console.error(`[site-config] Falha ao assinar ${pathname}`,error);
          return [pathname,null];
        }
      })
    );

    const urlMap=new Map(
      signedEntries.filter(([,url])=>Boolean(url))
    );

    return NextResponse.json(
      replaceMediaUrls(config,urlMap),
      {
        headers:{
          'Cache-Control':'private, no-store, max-age=0',
        },
      }
    );
  }catch(error){
    console.error('[site-config]',error);

    return NextResponse.json(
      {error:'Não foi possível carregar a configuração do site.'},
      {
        status:500,
        headers:{'Cache-Control':'no-store'},
      }
    );
  }
}
