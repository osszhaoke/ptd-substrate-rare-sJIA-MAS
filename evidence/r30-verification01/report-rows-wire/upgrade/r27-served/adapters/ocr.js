import {need,LIMITS,validateLedger} from '../domain/model.js';
export async function inspectImage(file){
 need(['image/png','image/jpeg'].includes(file.type),'PNG_JPEG_ONLY');need(file.size>0&&file.size<=LIMITS.imageBytes,'IMAGE_SIZE');
 const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;await image.decode();need(image.naturalWidth*image.naturalHeight<=LIMITS.imagePixels,'IMAGE_PIXEL_LIMIT');return {width:image.naturalWidth,height:image.naturalHeight};}finally{URL.revokeObjectURL(url);}
}
export async function ocrConfig(){const r=await fetch('/api/ocr/config',{cache:'no-store'});need(r.ok,'OCR_CONFIG_UNAVAILABLE');return r.json();}
export async function recognize(file,token,config,consent,signal){
 need(consent===true,'UPLOAD_CONSENT_REQUIRED');need(config.enabled,'OCR_NOT_CONFIGURED');need(navigator.onLine,'OCR_REQUIRES_NETWORK');
 need(file.size<=Math.min(config.maxImageBytes||LIMITS.imageBytes,LIMITS.imageBytes),'OCR_IMAGE_SIZE');
 await inspectImage(file);const requestId=crypto.randomUUID();
 // Single explicit invocation only. Never retry a paid call, including after a lost response.
 const r=await fetch('/api/ocr',{method:'POST',headers:{'Content-Type':file.type,'Authorization':'Bearer '+token,'X-Request-ID':requestId},body:file,signal,cache:'no-store'});
 const data=await r.json();need(r.ok,data.error||'OCR_FAILED');validateLedger(data.ledger);return {ledger:data.ledger,requestId};
}
