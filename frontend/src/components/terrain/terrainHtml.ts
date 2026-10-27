// Self-contained page that renders the 3D terrain with MapLibre GL JS inside a WebView.
// React Native sends commands with window.rx({...}); the page reports back with postMessage.
// The engine is bundled and the terrain/imagery come from a small tile pack per lake that the app
// sends in (see scripts/build-terrain-packs.mjs), so nothing is streamed. A lake without a pack
// falls back to online tiles.
import { MAPLIBRE_CSS, MAPLIBRE_JS } from './engine.generated';

export const TERRAIN_HTML = `<!doctype html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>${MAPLIBRE_CSS}</style>
<style>
  html,body,#map{margin:0;padding:0;height:100%;background:#101418;overflow:hidden;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
  .maplibregl-ctrl-attrib{font:10px/1.3 sans-serif;max-width:70vw}
  .maplibregl-ctrl-attrib.maplibregl-compact{margin:0 0 4px 4px}
</style>
</head><body>
<div id="map"></div>
<script>
  function post(m){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  document.addEventListener('contextmenu',function(e){ e.preventDefault(); });
  document.addEventListener('selectstart',function(e){ e.preventDefault(); });
</script>
<script>${MAPLIBRE_JS}</script>
<script>
(function(){
  if (typeof maplibregl === 'undefined') { return; }
  var ONLINE_DEM = ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'];
  var ONLINE_SAT = ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg'];
  // Tile pack for the current lake, filled by 'pack' messages (base64 tiles keyed z/x/y).
  var PACK = { dem:{}, sat:{}, bounds:null, loaded:false };
  function b64buf(b){ var s=atob(b), n=s.length, a=new Uint8Array(n); for(var i=0;i<n;i++) a[i]=s.charCodeAt(i); return a.buffer; }
  // Tiles inside the bundled region are served from memory (works offline). Anything outside it is
  // fetched from the network when online, so the camera is free to go anywhere.
  var ONLINE = {
    dem:function(z,x,y){ return 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/'+z+'/'+x+'/'+y+'.png'; },
    sat:function(z,x,y){ return 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/'+z+'/'+y+'/'+x+'.jpg'; }
  };
  maplibregl.addProtocol('pack', function(params){
    var m = params.url.replace('pack://','').split('/');
    var layer = m[0], z=m[1], x=m[2], y=m[3];
    var b = PACK[layer] && PACK[layer][z+'/'+x+'/'+y];
    if(b) return Promise.resolve({data:b64buf(b)});
    if(navigator.onLine===false) return Promise.reject(new Error('offline tile outside the bundled region'));
    return fetch(ONLINE[layer](z,x,y)).then(function(r){ if(!r.ok) throw new Error('tile '+r.status); return r.arrayBuffer(); }).then(function(d){ return {data:d}; });
  });
  var empty = function(){ return {type:'FeatureCollection',features:[]}; };
  var S = { usePack:false, lake:null, frames:[], idx:0, layers:{satellite:false,history:true,baseline:true}, rotate:false, exag:1.5, ready:false, inset:230, reduceMotion:false };
  var map, rafId = null;

  function build(lake){
    var DEM = ['pack://dem/{z}/{x}/{y}'];
    var SAT = ['pack://sat/{z}/{x}/{y}'];
    var pb = S.usePack;
    // Only zoom-13 tiles are bundled; the camera is kept near the lake so the data edge is never in view.
    var sb = {maxzoom:13};
    map = new maplibregl.Map({
      container:'map',
      style:{
        version:8,
        sources:{
          dem:Object.assign({type:'raster-dem',tiles:DEM,tileSize:256,encoding:'terrarium',attribution:'Terrain: AWS Open Data (Terrarium)'},sb),
          hs:Object.assign({type:'raster-dem',tiles:DEM,tileSize:256,encoding:'terrarium'},sb),
          sat:Object.assign({type:'raster',tiles:SAT,tileSize:256,attribution:'Sentinel-2 cloudless 2020 \\u00a9 EOX (contains modified Copernicus Sentinel data)'},{maxzoom:13})
        },
        layers:[
          {id:'bg',type:'background',paint:{'background-color':'#101418'}},
          {id:'sat',type:'raster',source:'sat',layout:{visibility:'none'},paint:{'raster-saturation':-0.1,'raster-brightness-max':0.9}},
          {id:'hillshade',type:'hillshade',source:'hs',paint:{
            'hillshade-exaggeration':0.8,'hillshade-shadow-color':'#05070a','hillshade-highlight-color':'#d9dde2',
            'hillshade-accent-color':'#2a3138','hillshade-illumination-direction':315,'hillshade-illumination-anchor':'map'}}
        ],
        terrain:{source:'dem',exaggeration:S.exag}
      },
      center:lake.center, zoom:12.2, pitch:52, bearing:-20, maxPitch:75, minZoom:9, maxZoom:16, attributionControl:{compact:true}
    });
    map.addControl(new maplibregl.NavigationControl({showCompass:false,visualizePitch:false}),'bottom-right');
    map.on('style.load', function(){ try{
      ['lake-now','lake-hist','lake-base'].forEach(function(id){ map.addSource(id,{type:'geojson',data:empty()}); });
      map.addLayer({id:'hist-line',type:'line',source:'lake-hist',paint:{'line-color':['get','color'],'line-width':1.3,'line-opacity':0.95}});
      map.addLayer({id:'base-line',type:'line',source:'lake-base',paint:{'line-color':'#f5d06b','line-width':1.8,'line-dasharray':[2,2]}});
      map.addLayer({id:'lake-fill',type:'fill',source:'lake-now',paint:{'fill-color':'#3d9bff','fill-opacity':0.85}});
      map.addLayer({id:'lake-line',type:'line',source:'lake-now',paint:{'line-color':'#ffffff','line-width':1.4,'line-opacity':0.9}});
      S.ready = true;
      applyLayers(); drawFrame();
      frameCamera(false);
      // Do not wait for every tile (some may be slow or offline): ready on first idle or after 2.5 s.
      var sent=false, go=function(){ if(!sent){ sent=true; post({type:'ready'}); } };
      map.once('idle', go); setTimeout(go, 2500);
      }catch(e){ post({type:'error',message:'Scene setup failed: '+e.message}); }
    });
    map.on('error', function(e){
      var msg = e && e.error && e.error.message ? e.error.message : '';
      if (/WebGL/i.test(msg)) post({type:'error',message:'This device could not start 3D graphics (WebGL).'});
    });
    ['mousedown','touchstart'].forEach(function(ev){
      map.getCanvas().addEventListener(ev,function(){ if(S.rotate){ S.rotate=false; post({type:'rotate',value:false}); } },{passive:true});
    });
  }

  function feat(g,props){ return {type:'Feature',properties:props||{},geometry:g}; }
  function yearOf(d){ return d.slice(0,4); }
  function mix(a,b,t){ return Math.round(a+(b-a)*t); }
  function color(t){ // old = dark blue, recent = pale blue
    return 'rgb('+mix(31,158,t)+','+mix(79,197,t)+','+mix(143,244,t)+')';
  }

  function drawFrame(){
    if(!S.ready || !S.frames.length) return;
    var f = S.frames[S.idx];
    map.getSource('lake-now').setData({type:'FeatureCollection',features:[feat(f.geometry)]});
    // one outline per earlier year (latest scene of that year), darker is older
    var byYear = {};
    for (var i=0;i<S.idx;i++){ if (S.frames[i].date !== f.date && yearOf(S.frames[i].date) !== yearOf(f.date)) byYear[yearOf(S.frames[i].date)] = S.frames[i]; }
    var years = Object.keys(byYear).sort();
    var hist = years.map(function(y,k){ return feat(byYear[y].geometry,{color:color(years.length>1?k/(years.length-1):1)}); });
    map.getSource('lake-hist').setData({type:'FeatureCollection',features:hist});
    map.getSource('lake-base').setData(S.frames.length>1 && S.idx>0 ? {type:'FeatureCollection',features:[feat(S.frames[0].geometry)]} : empty());
  }

  function applyLayers(){
    if(!S.ready) return;
    map.setLayoutProperty('sat','visibility',S.layers.satellite?'visible':'none');
    map.setPaintProperty('hillshade','hillshade-exaggeration',S.layers.satellite?0.35:0.8);
    map.setLayoutProperty('hist-line','visibility',S.layers.history?'visible':'none');
    map.setLayoutProperty('base-line','visibility',S.layers.baseline?'visible':'none');
  }

  function frameCamera(animated){
    // The app's panels cover the bottom 'inset' px, so the lake is framed above them.
    map.easeTo({center:S.lake.center,zoom:12.2,pitch:52,bearing:-20,padding:{top:70,bottom:S.inset,left:0,right:0},duration:animated&&!S.reduceMotion?1200:0});
  }

  function spin(){
    if(!S.rotate){ rafId=null; return; }
    map.setBearing(map.getBearing()+0.08);
    rafId = requestAnimationFrame(spin);
  }

  window.rx = function(m){
    try{
      if(m.type==='pack'){
        if(m.reset){ PACK={dem:{},sat:{},bounds:m.bounds,loaded:false}; }
        for(var k in m.dem) PACK.dem[k]=m.dem[k];
        for(var k2 in m.sat) PACK.sat[k2]=m.sat[k2];
        if(m.done){ PACK.loaded=true; post({type:'packed'}); }
      } else if(m.type==='init'){
        S.usePack = !!m.usePack && PACK.loaded;
        S.lake=m.lake; S.frames=m.frames; S.idx=Math.min(m.index||0,m.frames.length-1);
        if(m.layers) S.layers=m.layers; if(m.inset!=null) S.inset=m.inset; S.reduceMotion=!!m.reduceMotion;
        if(!map){ build(m.lake); }
        else if(S.ready){
          drawFrame(); applyLayers(); frameCamera(true); post({type:'ready'});
        }
      } else if(m.type==='frames'){ S.frames=m.frames; S.idx=Math.min(S.idx,m.frames.length-1); drawFrame(); }
      else if(m.type==='frame'){ S.idx=m.index; drawFrame(); }
      else if(m.type==='layers'){ S.layers=m.layers; applyLayers(); }
      else if(m.type==='rotate'){ S.rotate=!!m.value && !S.reduceMotion; if(m.value && S.reduceMotion) post({type:'rotate',value:false}); if(S.rotate && !rafId){ rafId=requestAnimationFrame(spin); } }
      else if(m.type==='inset'){
        // Only shift the framing for the space the sheet covers. Never touch zoom, tilt or rotation.
        S.inset=m.value; if(map&&S.ready) map.setPadding({top:70,bottom:S.inset,left:0,right:0});
      }
      else if(m.type==='reset'){ if(map&&S.lake) frameCamera(true); }
      else if(m.type==='exaggeration'){ S.exag=m.value; if(map&&S.ready) map.setTerrain({source:'dem',exaggeration:S.exag}); }
    }catch(e){ post({type:'error',message:String(e&&e.message||e)}); }
  };
  document.addEventListener('message',function(e){ window.rx(JSON.parse(e.data)); });
  window.addEventListener('message',function(e){ try{ window.rx(JSON.parse(e.data)); }catch(_){} });
  post({type:'loaded'});
})();
</script>
</body></html>`;
