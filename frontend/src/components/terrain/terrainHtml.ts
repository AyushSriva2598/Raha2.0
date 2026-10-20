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
  html,body,#map{margin:0;padding:0;height:100%;background:#0b0e12;overflow:hidden}
  .maplibregl-ctrl-attrib{font:10px/1.3 sans-serif;max-width:70vw}
  .maplibregl-ctrl-attrib.maplibregl-compact{margin:0 0 4px 4px}
</style>
</head><body>
<div id="map"></div>
<script>
  function post(m){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
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
  maplibregl.addProtocol('pack', function(params){
    // url: pack://dem/12/3010/1700 -> look the tile up in memory; a missing tile is a 404.
    var m = params.url.replace('pack://','').split('/');
    var layer = m[0], key = m[1]+'/'+m[2]+'/'+m[3];
    var b = PACK[layer] && PACK[layer][key];
    if(!b) return Promise.reject(new Error('tile outside pack'));
    return Promise.resolve({data:b64buf(b)});
  });
  var empty = function(){ return {type:'FeatureCollection',features:[]}; };
  var S = { usePack:false, lake:null, frames:[], idx:0, layers:{satellite:false,history:true,baseline:true}, rotate:false, exag:1.5, ready:false, inset:230 };
  var map, rafId = null;

  function build(lake){
    var DEM = S.usePack ? ['pack://dem/{z}/{x}/{y}'] : ONLINE_DEM;
    var SAT = S.usePack ? ['pack://sat/{z}/{x}/{y}'] : ONLINE_SAT;
    var bounds = S.usePack && PACK.bounds ? [[PACK.bounds[0]+0.02,PACK.bounds[1]+0.02],[PACK.bounds[2]-0.02,PACK.bounds[3]-0.02]] : undefined;
    map = new maplibregl.Map({
      container:'map',
      style:{
        version:8,
        sources:{
          dem:{type:'raster-dem',tiles:DEM,tileSize:256,maxzoom:S.usePack?13:15,encoding:'terrarium',attribution:'Terrain: AWS Open Data (Terrarium)'},
          hs:{type:'raster-dem',tiles:DEM,tileSize:256,maxzoom:S.usePack?13:15,encoding:'terrarium'},
          sat:{type:'raster',tiles:SAT,tileSize:256,maxzoom:13,attribution:'Sentinel-2 cloudless 2020 \\u00a9 EOX (contains modified Copernicus Sentinel data)'}
        },
        layers:[
          {id:'bg',type:'background',paint:{'background-color':'#0b0e12'}},
          {id:'sat',type:'raster',source:'sat',layout:{visibility:'none'},paint:{'raster-saturation':-0.1,'raster-brightness-max':0.9}},
          {id:'hillshade',type:'hillshade',source:'hs',paint:{
            'hillshade-exaggeration':0.8,'hillshade-shadow-color':'#05070a','hillshade-highlight-color':'#d9dde2',
            'hillshade-accent-color':'#2a3138','hillshade-illumination-direction':315,'hillshade-illumination-anchor':'map'}}
        ],
        terrain:{source:'dem',exaggeration:S.exag}
      },
      center:lake.center, zoom:12.7, pitch:58, bearing:-20, maxPitch:72, minZoom:S.usePack?12.2:9, maxZoom:S.usePack?14.5:16, maxBounds:bounds, attributionControl:{compact:true}
    });
    map.addControl(new maplibregl.NavigationControl({showCompass:false,visualizePitch:false}),'bottom-right');
    map.on('load', function(){
      ['lake-now','lake-hist','lake-base'].forEach(function(id){ map.addSource(id,{type:'geojson',data:empty()}); });
      map.addLayer({id:'hist-line',type:'line',source:'lake-hist',paint:{'line-color':['get','color'],'line-width':1.3,'line-opacity':0.95}});
      map.addLayer({id:'base-line',type:'line',source:'lake-base',paint:{'line-color':'#f5d06b','line-width':1.8,'line-dasharray':[2,2]}});
      map.addLayer({id:'lake-fill',type:'fill',source:'lake-now',paint:{'fill-color':'#3d9bff','fill-opacity':0.85}});
      map.addLayer({id:'lake-line',type:'line',source:'lake-now',paint:{'line-color':'#ffffff','line-width':1.4,'line-opacity':0.9}});
      S.ready = true;
      applyLayers(); drawFrame();
      post({type:'ready'});
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
    // Lake sits in the upper part of the screen; the app's info card covers the bottom 'inset' px.
    map.easeTo({center:S.lake.center,zoom:12.7,pitch:58,bearing:-20,padding:{top:70,bottom:S.inset,left:0,right:0},duration:animated?1200:0});
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
        if(m.layers) S.layers=m.layers; if(m.inset!=null) S.inset=m.inset;
        if(!map){ build(m.lake); map.once('load',function(){ frameCamera(false); }); }
        else if(S.ready){
          if(S.usePack && PACK.bounds) map.setMaxBounds([[PACK.bounds[0]+0.02,PACK.bounds[1]+0.02],[PACK.bounds[2]-0.02,PACK.bounds[3]-0.02]]);
          drawFrame(); applyLayers(); frameCamera(true); post({type:'ready'});
        }
      } else if(m.type==='frames'){ S.frames=m.frames; S.idx=Math.min(S.idx,m.frames.length-1); drawFrame(); }
      else if(m.type==='frame'){ S.idx=m.index; drawFrame(); }
      else if(m.type==='layers'){ S.layers=m.layers; applyLayers(); }
      else if(m.type==='rotate'){ S.rotate=!!m.value; if(S.rotate && !rafId){ rafId=requestAnimationFrame(spin); } }
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
