import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { attachWebEngine, radioEvent } from '@/services/radioStore';
import { HLS_JS } from './hlsEngine.generated';

// The radio's player on builds without native audio: an invisible web view with an <audio> element.
// HLS streams go through hls.js (bundled, so no CDN is needed); anything else plays directly.
const PAGE = `<!doctype html><html><head><meta charset="utf-8"/></head><body>
<audio id="a" playsinline></audio>
<script>${HLS_JS}</script>
<script>
(function(){
  var a = document.getElementById('a'), hls = null, id = null;
  function post(m){ if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  function reset(){ if (hls) { hls.destroy(); hls = null; } a.pause(); a.removeAttribute('src'); a.load(); }
  a.addEventListener('playing', function(){ post({ type: 'playing', id: id }); });
  a.addEventListener('waiting', function(){ post({ type: 'buffering', id: id }); });
  a.addEventListener('error', function(){ if (id) post({ type: 'error', id: id, message: 'stream error' }); });
  window.rx = function(m){
    try {
      if (m.type === 'play') {
        reset(); id = m.id;
        if (/\\.m3u8(\\?|$)/i.test(m.url) && window.Hls && Hls.isSupported()) {
          hls = new Hls({ enableWorker: false, manifestLoadingMaxRetry: 3, levelLoadingMaxRetry: 3, fragLoadingMaxRetry: 4 });
          hls.on(Hls.Events.ERROR, function(_e, d){
            if (!d.fatal) return;
            if (d.type === Hls.ErrorTypes.NETWORK_ERROR) { post({ type: 'buffering', id: id }); hls.startLoad(); }
            else post({ type: 'error', id: id, message: d.details });
          });
          hls.loadSource(m.url); hls.attachMedia(a);
        } else { a.src = m.url; }
        var p = a.play(); if (p && p.catch) p.catch(function(e){ post({ type: 'error', id: id, message: String(e && e.name || e) }); });
      } else if (m.type === 'pause') { a.pause(); }
      else if (m.type === 'stop') { id = null; reset(); }
    } catch (e) { post({ type: 'error', id: id, message: String(e && e.message || e) }); }
  };
  post({ type: 'ready' });
})();
</script></body></html>`;

const SOURCE = { html: PAGE, baseUrl: 'https://raha.local/' };

export function RadioWebEngine() {
  const ref = useRef<WebView>(null);

  const send = useCallback((msg: object) => {
    ref.current?.injectJavaScript(`window.rx(${JSON.stringify(msg)});true;`);
  }, []);

  useEffect(() => () => attachWebEngine(null), []);

  const onMessage = (e: WebViewMessageEvent) => {
    let m: { type: string; id?: string; message?: string };
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (m.type === 'ready') attachWebEngine(send);
    else if (m.type === 'playing' || m.type === 'buffering' || m.type === 'error') radioEvent(m.id, m.type, m.message);
  };

  return (
    <View pointerEvents="none" style={styles.hidden} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <WebView
        ref={ref}
        source={SOURCE}
        originWhitelist={['*']}
        onMessage={onMessage}
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        onContentProcessDidTerminate={() => ref.current?.reload()}
        onRenderProcessGone={() => {
          attachWebEngine(null);
          ref.current?.reload();
          return true;
        }}
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Kept on screen at 1 px (some Android versions suspend media in views that are fully off-screen).
  hidden: { position: 'absolute', left: 0, bottom: 0, width: 1, height: 1, opacity: 0.01 },
  web: { width: 1, height: 1, backgroundColor: 'transparent' },
});
