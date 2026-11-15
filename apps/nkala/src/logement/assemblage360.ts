/**
 * Assemblage d'un panorama 360° à partir des photos de la capture guidée (8 à 10 photos prises en tournant sur soi-même).
 * Chaque photo est reprojetée (projection rectiligne → équirectangulaire) à l'angle mesuré par la boussole, avec un fondu
 * entre photos voisines. Résultat : une bande de 360° de large et de la hauteur de champ de l'appareil (panorama partiel,
 * affiché par Pannellum avec haov = 360 et vaov = champ vertical). Le script tourne dans une page (WebView sur téléphone,
 * iframe sur le web) : même code partout, pas de module natif. Chaîne JavaScript (Hermes ne garde pas le source des fonctions).
 */
export interface ImageAssemblage { src: string; yaw: number }
export interface ConfigAssemblage { images: ImageAssemblage[]; hfov: number; vfov: number; largeur?: number; /** Hauteur couverte sans trou (degrés), sinon vfov. */ vaov?: number }
export interface ResultatAssemblage { data: string; largeur: number; hauteur: number; couverture: number }

export const SCRIPT_ASSEMBLAGE = String.raw`
function charger(src){return new Promise(function(ok,ko){var im=new Image();im.onload=function(){ok(im)};im.onerror=function(){ko(new Error('Photo illisible.'))};im.src=src;});}
function assembler(cfg){
  return Promise.all(cfg.images.map(function(i){return charger(i.src)})).then(function(ims){
    var W=cfg.largeur||4096, vaov=cfg.vaov||cfg.vfov, H=Math.max(64,Math.round(W*vaov/360)), RAD=Math.PI/180;
    var srcs=ims.map(function(im,k){var c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;var x=c.getContext('2d');x.drawImage(im,0,0);
      return {w:c.width,h:c.height,d:x.getImageData(0,0,c.width,c.height).data,yaw:cfg.images[k].yaw*RAD};});
    var th=Math.tan(cfg.hfov*RAD/2), tv=Math.tan(cfg.vfov*RAD/2);
    // Par colonne : photos qui la couvrent (position horizontale u dans la photo, cos de l'écart d'angle)
    var cols=new Array(W);
    for(var x=0;x<W;x++){var lon=((x+0.5)/W)*2*Math.PI-Math.PI, l=[];
      for(var k=0;k<srcs.length;k++){var d=lon-srcs[k].yaw;d=Math.atan2(Math.sin(d),Math.cos(d));if(Math.abs(d)>=Math.PI/2)continue;var u=Math.tan(d)/th;if(u<=-1||u>=1)continue;l.push(k,u,Math.cos(d));}
      cols[x]=l;}
    var out=document.createElement('canvas');out.width=W;out.height=H;var ctx=out.getContext('2d');var img=ctx.createImageData(W,H);var o=img.data;var plein=0;
    for(var y=0;y<H;y++){var tl=Math.tan((0.5-(y+0.5)/H)*vaov*RAD);
      for(var x2=0;x2<W;x2++){var c=cols[x2],r=0,g=0,b=0,wt=0;
        for(var j=0;j<c.length;j+=3){var s=srcs[c[j]],u2=c[j+1],v=tl/(c[j+2]*tv);if(v<=-1||v>=1)continue;
          var px=Math.min(s.w-1,((u2+1)/2*s.w)|0),py=Math.min(s.h-1,((1-v)/2*s.h)|0),i=(py*s.w+px)*4,w=(1-Math.abs(u2))*(1-Math.abs(v)*0.5)+1e-3;
          r+=s.d[i]*w;g+=s.d[i+1]*w;b+=s.d[i+2]*w;wt+=w;}
        var q=(y*W+x2)*4;if(wt>0){o[q]=r/wt;o[q+1]=g/wt;o[q+2]=b/wt;plein++;}else{o[q]=23;o[q+1]=13;o[q+2]=8;}o[q+3]=255;}}
    ctx.putImageData(img,0,0);
    return {data:out.toDataURL('image/jpeg',0.88),largeur:W,hauteur:H,couverture:plein/(W*H)};
  });
}`;

const echapper = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

/** Page autonome qui assemble puis renvoie { t: 'fini', ...ResultatAssemblage } ou { t: 'erreur', message }. */
export function htmlAssemblage(cfg: ConfigAssemblage): string {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body><script>${SCRIPT_ASSEMBLAGE}
function envoyer(m){var s=JSON.stringify(m);if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(s);}else{m.source='nkala-assemblage';window.parent.postMessage(JSON.stringify(m),'*');}}
setTimeout(function(){assembler(${echapper(cfg)}).then(function(r){r.t='fini';envoyer(r);}).catch(function(e){envoyer({t:'erreur',message:String(e&&e.message||e)});});},50);
</script></body></html>`;
}

/**
 * Champ de vision à partir de la focale équivalente 35 mm (EXIF) et des dimensions de la photo.
 * Sans EXIF : 26 mm, focale habituelle de l'objectif principal des téléphones.
 */
export function champDeVision(largeur: number, hauteur: number, focale35?: number): { hfov: number; vfov: number } {
  const f = focale35 && focale35 > 8 && focale35 < 200 ? focale35 : 26;
  const diag = 43.27, d = Math.hypot(largeur, hauteur) || 1;
  const deg = (mm: number) => (2 * Math.atan(mm / (2 * f)) * 180) / Math.PI;
  return { hfov: deg((diag * largeur) / d), vfov: deg((diag * hauteur) / d) };
}

/**
 * Hauteur couverte partout sans trou : entre deux photos, la couverture verticale se réduit (coins de la photo).
 * On prend l'écart le plus grand entre deux angles voisins.
 */
export function hauteurSansTrou(yaws: number[], hfov: number, vfov: number): number {
  const t = [...yaws].map(y => ((y % 360) + 360) % 360).sort((a, b) => a - b);
  let ecart = 0;
  for (let i = 0; i < t.length; i++) ecart = Math.max(ecart, (i + 1 < t.length ? t[i + 1] : t[0] + 360) - t[i]);
  const demi = Math.min(ecart, hfov) / 2;
  const tv = Math.tan((vfov * Math.PI) / 360);
  return Math.round(((2 * Math.atan(tv * Math.cos((demi * Math.PI) / 180)) * 180) / Math.PI) * 10) / 10;
}

/** Nombre de photos pour faire le tour avec environ 30 % de recouvrement (6 à 14). */
export const nombrePhotos = (hfov: number) => Math.max(6, Math.min(14, Math.ceil(360 / (hfov * 0.7))));

/** Focale équivalente 35 mm lue dans l'EXIF (clés différentes sur Android et iOS). */
export function focaleExif(exif?: Record<string, unknown> | null): number | undefined {
  if (!exif) return undefined;
  const brut = exif.FocalLengthIn35mmFilm ?? exif.FocalLenIn35mmFilm ?? (exif['{Exif}'] as Record<string, unknown> | undefined)?.FocalLenIn35mmFilm;
  const n = Number(brut);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
