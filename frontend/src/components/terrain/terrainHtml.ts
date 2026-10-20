// Self-contained page that renders a 3D terrain "diorama" with three.js inside a WebView.
// React Native sends commands with window.rx({...}); the page reports back with postMessage.
// Everything is local: the engine is bundled and the terrain/imagery come from a small tile pack
// per lake that the app sends in (see scripts/build-terrain-packs.mjs). Nothing is streamed.
import { THREE_JS } from './engine.generated';

export const TERRAIN_HTML = `<!doctype html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
  html,body{margin:0;padding:0;height:100%;background:#101418;overflow:hidden}
  canvas{display:block;touch-action:none}
  #attr{position:fixed;left:0;right:0;bottom:4px;text-align:center;font:10px/1.3 sans-serif;color:rgba(255,255,255,.5);pointer-events:none}
</style>
</head><body>
<div id="attr"></div>
<script>
  function post(m){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
</script>
<script>${THREE_JS}</script>
<script>
(function(){
  if (typeof THREE === 'undefined') { post({type:'error',message:'Could not start the 3D engine.'}); return; }
  var Z = 13, TS = 256, CROP = 340, GRID = 220, CS = 1024, BG = 0x101418;
  var PACK = { dem:{}, sat:{}, bounds:null, loaded:false };
  var S = { lake:null, frames:[], idx:0, layers:{satellite:false,history:true,baseline:true}, rotate:false, exag:1.9, inset:0, cache:{}, built:null };
  var renderer, scene, camera, group, mesh, walls, tex, ambient, sun, fill;
  var overlay = document.createElement('canvas'); overlay.width = CS; overlay.height = CS;
  var octx = overlay.getContext('2d');
  var cam = { az:0.45, pol:1.02, dist:900, defaultDist:900 };
  var dirty = true, anim = null, lastT = 0;

  /* ---------- helpers ---------- */
  function b64img(b, mime){ return new Promise(function(res,rej){ var im=new Image(); im.onload=function(){res(im)}; im.onerror=rej; im.src='data:'+mime+';base64,'+b; }); }
  function mercator(lon, lat){
    var n = Math.pow(2, Z) * TS;
    return [ (lon+180)/360*n, (0.5 - Math.log(Math.tan(Math.PI/4 + lat*Math.PI/360))/(2*Math.PI))*n ];
  }
  function mix(a,b,t){ return a+(b-a)*t; }

  /* ---------- decode the tile pack into one elevation grid + one satellite canvas ---------- */
  function decode(lakeId){
    if (S.cache[lakeId]) return Promise.resolve(S.cache[lakeId]);
    var keys = Object.keys(PACK.dem).map(function(k){ return k.split('/').map(Number); });
    if (!keys.length) return Promise.reject(new Error('No offline terrain for this lake yet.'));
    var minX=1e9,maxX=-1,minY=1e9,maxY=-1;
    keys.forEach(function(k){ minX=Math.min(minX,k[1]); maxX=Math.max(maxX,k[1]); minY=Math.min(minY,k[2]); maxY=Math.max(maxY,k[2]); });
    var w=(maxX-minX+1)*TS, h=(maxY-minY+1)*TS;
    var elev = new Float32Array(w*h);
    var satC = document.createElement('canvas'); satC.width=w; satC.height=h;
    var sctx = satC.getContext('2d');
    var tc = document.createElement('canvas'); tc.width=TS; tc.height=TS;
    var tctx = tc.getContext('2d', {willReadFrequently:true});
    var jobs = [];
    Object.keys(PACK.dem).forEach(function(key){
      var p=key.split('/').map(Number);
      jobs.push(b64img(PACK.dem[key],'image/png').then(function(im){
        tctx.clearRect(0,0,TS,TS); tctx.drawImage(im,0,0);
        var d=tctx.getImageData(0,0,TS,TS).data, ox=(p[1]-minX)*TS, oy=(p[2]-minY)*TS;
        for(var y=0;y<TS;y++) for(var x=0;x<TS;x++){
          var i=(y*TS+x)*4;
          elev[(oy+y)*w+ox+x] = d[i]*256 + d[i+1] + d[i+2]/256 - 32768; // Terrarium encoding
        }
      }));
    });
    Object.keys(PACK.sat).forEach(function(key){
      var p=key.split('/').map(Number);
      jobs.push(b64img(PACK.sat[key],'image/jpeg').then(function(im){ sctx.drawImage(im,(p[1]-minX)*TS,(p[2]-minY)*TS,TS,TS); }));
    });
    return Promise.all(jobs).then(function(){
      var c = { w:w, h:h, x0:minX*TS, y0:minY*TS, elev:elev, sat:satC };
      S.cache[lakeId]=c; return c;
    });
  }

  /* ---------- geometry ---------- */
  function polysOf(g){ return g.type==='Polygon' ? [g.coordinates] : g.coordinates; }
  function pathPoly(ctx, g, toXY){
    polysOf(g).forEach(function(poly){ poly.forEach(function(ring){ ring.forEach(function(pt,i){ var q=toXY(pt); if(i===0) ctx.moveTo(q[0],q[1]); else ctx.lineTo(q[0],q[1]); }); ctx.closePath(); }); });
  }

  function build(grid){
    var lake=S.lake, c=mercator(lake.center[0],lake.center[1]);
    var cx=c[0]-grid.x0, cy=c[1]-grid.y0;
    var cx0=Math.round(Math.min(Math.max(cx-CROP/2,0),grid.w-CROP)), cy0=Math.round(Math.min(Math.max(cy-CROP/2,0),grid.h-CROP));
    var crop = new Float32Array(CROP*CROP);
    for(var y=0;y<CROP;y++) for(var x=0;x<CROP;x++) crop[y*CROP+x]=grid.elev[(cy0+y)*grid.w+cx0+x];

    // Flatten the lake surface (water is level) using the newest outline.
    var latest = S.frames[S.frames.length-1];
    if(latest){
      var mc=document.createElement('canvas'); mc.width=CROP; mc.height=CROP; var mx=mc.getContext('2d',{willReadFrequently:true});
      mx.fillStyle='#fff'; mx.beginPath();
      pathPoly(mx, latest.geometry, function(pt){ var m=mercator(pt[0],pt[1]); return [m[0]-grid.x0-cx0, m[1]-grid.y0-cy0]; });
      mx.fill('evenodd');
      var md=mx.getImageData(0,0,CROP,CROP).data, vals=[], idxs=[];
      for(var i=0;i<CROP*CROP;i++){ if(md[i*4+3]>128){ idxs.push(i); vals.push(crop[i]); } }
      if(vals.length>30){ vals.sort(function(a,b){return a-b}); var med=vals[Math.floor(vals.length/2)]; idxs.forEach(function(i){ crop[i]=med; }); }
    }

    var mpp = 156543.03392*Math.cos(lake.center[1]*Math.PI/180)/Math.pow(2,Z); // metres per pixel
    var minE=1e9,maxE=-1e9; for(var k=0;k<crop.length;k++){ if(crop[k]<minE)minE=crop[k]; if(crop[k]>maxE)maxE=crop[k]; }
    var relief=(maxE-minE)/mpp; // scene units
    var N=GRID, V=N+1, pos=new Float32Array(V*V*3), uv=new Float32Array(V*V*2), H=new Float32Array(V*V);
    for(var j=0;j<=N;j++) for(var i2=0;i2<=N;i2++){
      var sx=i2/N*(CROP-1), sy=j/N*(CROP-1), x0=Math.floor(sx), y0=Math.floor(sy), x1=Math.min(x0+1,CROP-1), y1=Math.min(y0+1,CROP-1), fx=sx-x0, fy=sy-y0;
      var e=mix(mix(crop[y0*CROP+x0],crop[y0*CROP+x1],fx), mix(crop[y1*CROP+x0],crop[y1*CROP+x1],fx), fy);
      var hh=(e-minE)/mpp, vi=j*V+i2; H[vi]=hh;
      pos[vi*3]=(i2/N-0.5)*CROP; pos[vi*3+1]=hh; pos[vi*3+2]=(j/N-0.5)*CROP;
      uv[vi*2]=i2/N; uv[vi*2+1]=1-j/N;
    }
    var idx=new Uint32Array(N*N*6), p=0;
    for(var jj=0;jj<N;jj++) for(var ii=0;ii<N;ii++){ var a=jj*V+ii,b=a+1,cc=a+V,d=cc+1; idx[p++]=a; idx[p++]=cc; idx[p++]=b; idx[p++]=b; idx[p++]=cc; idx[p++]=d; }
    var geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    geo.setIndex(new THREE.BufferAttribute(idx,1));
    geo.computeVertexNormals();

    // Baked hillshade (NW light, exaggerated slopes) for crisp ridges and creases.
    var hc=document.createElement('canvas'); hc.width=CROP; hc.height=CROP; var hx=hc.getContext('2d'), hd=hx.createImageData(CROP,CROP);
    var L=[-0.55,0.62,-0.56], E=2.8;
    for(var yy=0;yy<CROP;yy++) for(var xx=0;xx<CROP;xx++){
      var xm=Math.max(0,xx-1), xp=Math.min(CROP-1,xx+1), ym=Math.max(0,yy-1), yp=Math.min(CROP-1,yy+1);
      var dzx=(crop[yy*CROP+xp]-crop[yy*CROP+xm])/((xp-xm)*mpp), dzy=(crop[yp*CROP+xx]-crop[ym*CROP+xx])/((yp-ym)*mpp);
      var nx=-dzx*E, ny=1, nz=-dzy*E, nl=Math.sqrt(nx*nx+ny*ny+nz*nz);
      var sh=Math.max(0,(nx*L[0]+ny*L[1]+nz*L[2])/nl);
      var g=Math.round(Math.min(255,Math.max(0,92+sh*170))), o=(yy*CROP+xx)*4;
      hd.data[o]=g; hd.data[o+1]=g; hd.data[o+2]=g; hd.data[o+3]=255;
    }
    hx.putImageData(hd,0,0);

    S.built={ hill:hc, lakeId:lake.id, grid:grid, cx0:cx0, cy0:cy0, N:N, V:V, H:H, relief:relief, depth:relief*0.26+14, geo:geo };
  }

  /* ---------- overlay texture: base (grey or satellite) + lake outlines ---------- */
  function drawOverlay(){
    var B=S.built; if(!B) return;
    var k=CS/CROP;
    if(S.layers.satellite){ octx.drawImage(B.grid.sat, B.cx0, B.cy0, CROP, CROP, 0, 0, CS, CS); }
    else { octx.fillStyle='#b7bdc4'; octx.fillRect(0,0,CS,CS); }
    octx.globalCompositeOperation='multiply'; octx.globalAlpha=S.layers.satellite?0.4:1; octx.imageSmoothingEnabled=true;
    octx.drawImage(B.hill,0,0,CS,CS);
    octx.globalCompositeOperation='source-over'; octx.globalAlpha=1;
    var toXY=function(pt){ var m=mercator(pt[0],pt[1]); return [(m[0]-B.grid.x0-B.cx0)*k,(m[1]-B.grid.y0-B.cy0)*k]; };
    var f=S.frames[S.idx]; if(!f) return;
    var line=function(g,color,width,dash){ octx.beginPath(); pathPoly(octx,g,toXY); octx.setLineDash(dash||[]); octx.lineWidth=width; octx.strokeStyle=color; octx.lineJoin='round'; octx.stroke(); octx.setLineDash([]); };
    if(S.layers.history){
      var byYear={}; for(var i=0;i<S.idx;i++){ var y=S.frames[i].date.slice(0,4); if(y!==f.date.slice(0,4)) byYear[y]=S.frames[i]; }
      var ys=Object.keys(byYear).sort();
      ys.forEach(function(y,n){ var t=ys.length>1?n/(ys.length-1):1; line(byYear[y].geometry,'rgb('+Math.round(mix(31,158,t))+','+Math.round(mix(79,197,t))+','+Math.round(mix(143,244,t))+')',2.2); });
    }
    if(S.layers.baseline && S.frames.length>1 && S.idx>0){ line(S.frames[0].geometry,'#f5d06b',3,[10,8]); }
    octx.beginPath(); pathPoly(octx,f.geometry,toXY); octx.fillStyle='rgba(61,155,255,0.92)'; octx.fill('evenodd');
    line(f.geometry,'#ffffff',2.4);
    if(tex){ tex.needsUpdate=true; }
    dirty=true;
  }

  /* ---------- cliff walls: surface colour continues down and fades into the background ---------- */
  function buildWalls(){
    var B=S.built; if(!B) return;
    if(walls){ group.remove(walls); walls.geometry.dispose(); walls.material.dispose(); }
    var V=B.V, N=B.N, sat=S.layers.satellite;
    // Read only the four edge strips of the texture, not one pixel at a time.
    var rowT=octx.getImageData(0,0,CS,1).data, rowB=octx.getImageData(0,CS-1,CS,1).data;
    var colL=octx.getImageData(0,0,1,CS).data, colR=octx.getImageData(CS-1,0,1,CS).data;
    var sample=function(i,j){
      var px=Math.min(CS-1,Math.max(0,Math.round(i/N*(CS-1)))), py=Math.min(CS-1,Math.max(0,Math.round(j/N*(CS-1))));
      var d, o;
      if(j===0){ d=rowT; o=px*4; } else if(j===N){ d=rowB; o=px*4; } else if(i===0){ d=colL; o=py*4; } else { d=colR; o=py*4; }
      return [d[o]/255,d[o+1]/255,d[o+2]/255];
    };
    var edges=[ // [i(k), j(k), side shade]
      [function(k){return k;}, function(){return 0;}, 0.95],
      [function(k){return k;}, function(){return N;}, 0.55],
      [function(){return 0;}, function(k){return k;}, 0.85],
      [function(){return N;}, function(k){return k;}, 0.6]
    ];
    var STEPS=6, positions=[], colors=[], indices=[], bg=new THREE.Color(BG);
    edges.forEach(function(e){
      var base=positions.length/3;
      for(var k=0;k<=N;k++){
        var i=e[0](k), j=e[1](k), top=B.H[j*V+i];
        var sc=sample(i,j), hn=Math.min(1,top/Math.max(1,B.relief));
        var streak=0.78+0.22*Math.sin(k*0.83)*Math.sin(k*0.29+2.0);
        var shade=e[2]*streak*(sat?1:(0.62+0.38*hn));
        for(var s=0;s<=STEPS;s++){
          var t=s/STEPS, y=mix(top,-B.depth,t), fade=Math.pow(t,1.15);
          positions.push((i/N-0.5)*CROP, y, (j/N-0.5)*CROP);
          colors.push(mix(sc[0]*shade,bg.r,fade), mix(sc[1]*shade,bg.g,fade), mix(sc[2]*shade,bg.b,fade));
        }
      }
      for(var q=0;q<N;q++) for(var r=0;r<STEPS;r++){
        var a=base+q*(STEPS+1)+r, b=a+1, c=a+(STEPS+1), d=c+1;
        indices.push(a,b,c, b,d,c);
      }
    });
    var g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    g.setIndex(indices);
    walls=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}));
    group.add(walls);
  }

  function lighting(){
    var sat=S.layers.satellite;
    ambient.intensity = sat?0.8:0.42;
    sun.intensity = sat?1.05:1.7;
    fill.intensity = sat?0.15:0.2;
    dirty=true;
  }

  function applyLayers(){
    lighting(); drawOverlay(); buildWalls();
  }

  /* ---------- scene ---------- */
  function initRenderer(){
    renderer = new THREE.WebGLRenderer({antialias:true, alpha:false, powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(BG,1);
    document.body.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, window.innerWidth/window.innerHeight, 5, 20000);
    group = new THREE.Group(); scene.add(group);
    ambient = new THREE.AmbientLight(0xffffff,0.42); scene.add(ambient);
    sun = new THREE.DirectionalLight(0xfff4e6,1.55); sun.position.set(-520,250,-330); scene.add(sun);
    fill = new THREE.DirectionalLight(0x9db4d6,0.2); fill.position.set(400,150,350); scene.add(fill);
    bindControls(renderer.domElement);
    window.addEventListener('resize', function(){ renderer.setSize(window.innerWidth,window.innerHeight); camera.aspect=window.innerWidth/window.innerHeight; fitDistance(); applyView(); dirty=true; });
    requestAnimationFrame(loop);
  }

  function fitDistance(){
    var asp=camera.aspect, vf=camera.fov*Math.PI/180, hf=2*Math.atan(Math.tan(vf/2)*asp);
    cam.defaultDist = (CROP*0.5)/Math.tan(Math.min(hf,vf)/2);
  }
  function applyView(){
    var t=new THREE.Vector3(0,(S.built?S.built.relief*0.3:0)*S.exag,0);
    camera.position.set(t.x+cam.dist*Math.sin(cam.pol)*Math.sin(cam.az), t.y+cam.dist*Math.cos(cam.pol), t.z+cam.dist*Math.sin(cam.pol)*Math.cos(cam.az));
    camera.lookAt(t);
    // Shift the picture up by half the space the app's panels cover at the bottom.
    var W=window.innerWidth,H=window.innerHeight, shift=Math.round(S.inset/2);
    if(shift>0) camera.setViewOffset(W,H,0,shift,W,H); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  function loop(t){
    var dt=Math.min(0.05,(t-lastT)/1000||0); lastT=t;
    if(anim){ var k=Math.min(1,(t-anim.t0)/anim.ms), e=1-Math.pow(1-k,3);
      cam.az=mix(anim.az0,anim.az1,e); cam.pol=mix(anim.pol0,anim.pol1,e); cam.dist=mix(anim.d0,anim.d1,e); if(k>=1) anim=null; dirty=true; }
    if(S.rotate){ cam.az+=dt*0.12; dirty=true; }
    if(dirty && S.built){ applyView(); renderer.render(scene,camera); dirty=false; }
    requestAnimationFrame(loop);
  }

  /* ---------- touch controls: drag to orbit, pinch to zoom ---------- */
  function bindControls(el){
    var ptrs={}, last=null;
    function stopSpin(){ if(S.rotate){ S.rotate=false; post({type:'rotate',value:false}); } }
    el.addEventListener('pointerdown',function(e){ el.setPointerCapture(e.pointerId); ptrs[e.pointerId]={x:e.clientX,y:e.clientY}; last=null; stopSpin(); anim=null; });
    el.addEventListener('pointermove',function(e){
      var p=ptrs[e.pointerId]; if(!p) return;
      var ids=Object.keys(ptrs);
      if(ids.length===1){
        cam.az-=(e.clientX-p.x)*0.006; cam.pol=Math.min(1.5,Math.max(0.2,cam.pol-(e.clientY-p.y)*0.005));
      } else if(ids.length===2){
        var o=ptrs[ids[0]==e.pointerId?ids[1]:ids[0]];
        var d0=Math.hypot(p.x-o.x,p.y-o.y), d1=Math.hypot(e.clientX-o.x,e.clientY-o.y);
        if(d0>0) cam.dist=Math.min(cam.defaultDist*1.8,Math.max(cam.defaultDist*0.3,cam.dist*d0/d1));
      }
      p.x=e.clientX; p.y=e.clientY; dirty=true;
    });
    function up(e){ delete ptrs[e.pointerId]; }
    el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up);
  }

  function goDefault(animated){
    var t={az:0.45,pol:1.02,dist:cam.defaultDist};
    if(!animated){ cam.az=t.az; cam.pol=t.pol; cam.dist=t.dist; dirty=true; return; }
    anim={t0:performance.now(),ms:700,az0:cam.az,az1:t.az,pol0:cam.pol,pol1:t.pol,d0:cam.dist,d1:t.dist};
  }

  function setMesh(){
    var B=S.built;
    if(mesh){ group.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }
    if(tex) tex.dispose();
    tex=new THREE.CanvasTexture(overlay); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=4;
    mesh=new THREE.Mesh(B.geo,new THREE.MeshLambertMaterial({map:tex}));
    group.add(mesh);
    group.scale.set(1,S.exag,1);
  }

  /* ---------- messages from the app ---------- */
  function showAttr(){ document.getElementById('attr').textContent='Terrain: AWS Open Data (Terrarium)'+(S.layers.satellite?'  |  Sentinel-2 cloudless 2020 © EOX (modified Copernicus Sentinel data)':''); }

  window.rx = function(m){
    try{
      if(m.type==='pack'){
        if(m.reset){ PACK={dem:{},sat:{},bounds:m.bounds,loaded:false}; }
        for(var k in m.dem) PACK.dem[k]=m.dem[k];
        for(var k2 in m.sat) PACK.sat[k2]=m.sat[k2];
        if(m.done){ PACK.loaded=true; post({type:'packed'}); }
      } else if(m.type==='init'){
        S.lake=m.lake; S.frames=m.frames; S.idx=Math.min(m.index||0,m.frames.length-1);
        if(m.layers) S.layers=m.layers; if(m.inset!=null) S.inset=m.inset;
        if(!renderer) initRenderer();
        decode(m.lake.id).then(function(grid){
          build(grid); setMesh(); fitDistance(); goDefault(false); applyLayers(); showAttr(); post({type:'ready'});
        }).catch(function(e){ post({type:'error',message:String(e&&e.message||e)}); });
      } else if(m.type==='frames'){ S.frames=m.frames; S.idx=Math.min(S.idx,m.frames.length-1); drawOverlay(); }
      else if(m.type==='frame'){ S.idx=m.index; drawOverlay(); }
      else if(m.type==='layers'){ var sat=S.layers.satellite; S.layers=m.layers; if(S.built){ if(sat!==S.layers.satellite) applyLayers(); else drawOverlay(); showAttr(); } }
      else if(m.type==='rotate'){ S.rotate=!!m.value; dirty=true; }
      else if(m.type==='inset'){ S.inset=m.value; dirty=true; }
      else if(m.type==='reset'){ goDefault(true); }
      else if(m.type==='exaggeration'){ S.exag=m.value; if(group) group.scale.set(1,S.exag,1); dirty=true; }
    }catch(e){ post({type:'error',message:String(e&&e.message||e)}); }
  };
  document.addEventListener('message',function(e){ window.rx(JSON.parse(e.data)); });
  window.addEventListener('message',function(e){ try{ window.rx(JSON.parse(e.data)); }catch(_){} });
  post({type:'loaded'});
})();
</script>
</body></html>`;
